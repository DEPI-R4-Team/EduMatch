import logging
from datetime import datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.config import settings
from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models import InstructorWallet, Payment, Session as LearningSession, User, WalletTransaction
from app.schemas.payment_schema import (
    CreatePaymentIntentionResponse,
    PaymentDetailResponse,
    PaymentResponse,
    SimulatePaymentRequest,
)
from app.services.notification_service import create_notification
from app.services.payment_service import get_or_create_wallet, refund_held_payment, release_held_payment
from app.services import paymob_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/payments", tags=["payments"])

PLATFORM_FEE_RATE = Decimal("0.10")


@router.get("/ping")
def ping() -> dict[str, str]:
    return {"router": "payments", "status": "ok"}


def serialize_payment(payment: Payment) -> PaymentDetailResponse:
    return PaymentDetailResponse.model_validate(payment).model_copy(
        update={
            "request_title": payment.request.title if payment.request else None,
            "student_name": payment.student.full_name if payment.student else None,
            "instructor_name": payment.instructor.full_name if payment.instructor else None,
            "session_status": payment.session.status if payment.session else None,
            "request_status": payment.request.status if payment.request else None,
        }
    )


def get_payment_with_details(db: Session, payment_id: int) -> Payment | None:
    return db.scalar(
        select(Payment)
        .where(Payment.id == payment_id)
        .options(
            selectinload(Payment.session),
            selectinload(Payment.request),
            selectinload(Payment.student),
            selectinload(Payment.instructor),
        )
    )


def _hold_payment_and_update_wallet(db: Session, payment: Payment, session: LearningSession) -> None:
    """Finalize a payment: mark as held, update session/request status, and credit wallet."""
    now = datetime.now(timezone.utc)
    payment.status = "held"
    payment.paid_at = now

    session.request.status = "paid"
    session.status = "ready"

    wallet = get_or_create_wallet(db, session.instructor_id)
    wallet.pending_balance += payment.amount

    db.add(
        WalletTransaction(
            instructor_id=session.instructor_id,
            payment_id=payment.id,
            type="hold",
            amount=payment.amount,
            status="completed",
        )
    )
    create_notification(
        db,
        user_id=session.instructor_id,
        type="payment_received",
        title="Payment held in escrow",
        message="The student paid for your session. The payment is now held in escrow.",
        link_url=f"/instructor/sessions/{session.id}",
    )


@router.post("/session/{session_id}/pay", response_model=CreatePaymentIntentionResponse | PaymentDetailResponse)
def pay_for_session(
    session_id: int,
    payload: SimulatePaymentRequest | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CreatePaymentIntentionResponse | PaymentDetailResponse:
    """Initiate payment for a session.

    Creates a Payment record and a Paymob payment intention.
    Returns the checkout URL for the student to complete payment on Paymob's page.

    If Paymob is not configured (no API key), falls back to the dev-confirm flow
    where the payment is created as "pending" and can be confirmed via the
    ``/payments/{id}/dev-confirm`` endpoint.
    """
    if current_user.role != "student":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only students can pay for sessions.")

    session = db.scalar(
        select(LearningSession)
        .where(LearningSession.id == session_id)
        .options(
            selectinload(LearningSession.request),
            selectinload(LearningSession.student),
            selectinload(LearningSession.instructor),
        )
    )
    if session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")
    if session.request is not None and session.request.request_type == "group":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Use the group payment endpoint for group sessions.")
    if session.student_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You cannot pay for this session.")
    if session.request is None or session.request.status != "waiting_payment":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This session is not waiting for payment.")

    existing_payment = db.scalar(
        select(Payment).where(
            Payment.session_id == session.id,
            Payment.status.in_(["pending", "held", "released"]),
        )
    )
    if existing_payment is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This session already has a pending or completed payment.")

    amount = session.request.final_price_per_student or session.request.base_price
    if amount is None or amount <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This request does not have a valid payment amount.")

    platform_fee = (amount * PLATFORM_FEE_RATE).quantize(Decimal("0.01"))
    total_amount = amount + platform_fee

    payment_method = (payload.payment_method if payload else "paymob_card")

    # Create payment record with "pending" status
    payment = Payment(
        session_id=session.id,
        request_id=session.request_id,
        student_id=session.student_id,
        instructor_id=session.instructor_id,
        amount=amount,
        platform_fee=platform_fee,
        total_amount=total_amount,
        status="pending",
        payment_method=payment_method,
    )
    db.add(payment)
    db.flush()

    # Try to create Paymob intention
    paymob_configured = bool(settings.paymob_secret_key and settings.paymob_integration_id)

    if paymob_configured:
        try:
            intention = paymob_service.create_intention(
                amount_egp=float(total_amount),
                session_id=session.id,
                payment_id=payment.id,
                user=current_user,
                item_name=session.request.title or "Learning Session",
            )
            payment.paymob_intention_id = str(intention.get("id", ""))
            client_secret = intention.get("client_secret", "")
            checkout_url = paymob_service.get_checkout_url(client_secret)
        except Exception as exc:
            logger.error("Paymob intention failed for session %s: %s", session.id, exc)
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Failed to create payment with Paymob: {exc}",
            ) from exc
    else:
        # Paymob not configured — dev/fallback mode
        client_secret = ""
        checkout_url = ""
        logger.warning(
            "Paymob not configured. Payment %s created as pending. "
            "Use POST /payments/%s/dev-confirm to simulate completion.",
            payment.id,
            payment.id,
        )

    db.commit()
    db.refresh(payment)

    if paymob_configured and checkout_url:
        return CreatePaymentIntentionResponse(
            payment_id=payment.id,
            checkout_url=checkout_url,
            client_secret=client_secret,
        )
    else:
        # In dev mode without Paymob, return the payment details directly
        created_payment = get_payment_with_details(db, payment.id)
        if created_payment is None:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Payment was not created.")
        return serialize_payment(created_payment)


@router.post("/paymob/callback")
async def paymob_webhook_callback(request: Request, db: Session = Depends(get_db)) -> dict:
    """Receive and process Paymob webhook callbacks.

    This endpoint is called by Paymob's servers (not authenticated via JWT).
    Security is ensured via HMAC verification.

    Paymob sends the HMAC in the query string ``?hmac=...`` and the transaction
    data in the POST body under ``obj``.
    """
    # Get HMAC from query params
    received_hmac = request.query_params.get("hmac", "")
    body = await request.json()

    # Verify HMAC
    if not paymob_service.verify_hmac(body, received_hmac):
        logger.warning("Paymob webhook HMAC verification failed")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid HMAC signature.")

    obj = body.get("obj", body)
    transaction_id = str(obj.get("id", ""))
    success = obj.get("success", False)
    order_id = str(obj.get("order", {}).get("id", "")) if obj.get("order") else ""
    paymob_intention_id = str(obj.get("payment_key_claims", {}).get("extra", {}).get("session_id", ""))

    # Find the matching payment
    # First try by intention ID, then by order
    payment = None
    if paymob_intention_id:
        payment = db.scalar(
            select(Payment)
            .where(Payment.paymob_intention_id == paymob_intention_id)
            .options(
                selectinload(Payment.session).selectinload(LearningSession.request),
            )
        )

    if payment is None:
        # Try matching by extras.session_id from the order
        extras = obj.get("order", {}).get("extras", {}) if obj.get("order") else {}
        session_id_str = extras.get("session_id", "")
        if session_id_str:
            payment = db.scalar(
                select(Payment)
                .where(
                    Payment.session_id == int(session_id_str),
                    Payment.status == "pending",
                )
                .options(
                    selectinload(Payment.session).selectinload(LearningSession.request),
                )
            )

    if payment is None:
        logger.warning("No matching payment found for Paymob transaction %s", transaction_id)
        return {"status": "ignored", "reason": "no matching payment"}

    # Update payment with Paymob identifiers
    payment.paymob_transaction_id = transaction_id
    payment.paymob_order_id = order_id

    if success and payment.status == "pending":
        session = payment.session
        if session:
            _hold_payment_and_update_wallet(db, payment, session)
        else:
            payment.status = "held"
            payment.paid_at = datetime.now(timezone.utc)

        db.commit()
        logger.info("Payment %s marked as held via Paymob webhook", payment.id)
        return {"status": "success", "payment_id": payment.id}
    elif not success and payment.status == "pending":
        payment.status = "cancelled"
        db.commit()
        logger.info("Payment %s marked as cancelled via Paymob webhook", payment.id)
        return {"status": "failed", "payment_id": payment.id}
    else:
        logger.info("Payment %s already processed (status=%s), ignoring webhook", payment.id, payment.status)
        return {"status": "already_processed", "payment_id": payment.id}


@router.get("/{payment_id}/status", response_model=PaymentDetailResponse)
def get_payment_status(
    payment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PaymentDetailResponse:
    """Poll payment status. Used by the frontend after Paymob redirect."""
    payment = get_payment_with_details(db, payment_id)
    if payment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found.")
    if current_user.role != "admin" and current_user.id not in {payment.student_id, payment.instructor_id}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You cannot view this payment.")
    return serialize_payment(payment)


@router.post("/{payment_id}/dev-confirm", response_model=PaymentDetailResponse)
def dev_confirm_payment(
    payment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PaymentDetailResponse:
    """Development-only endpoint to simulate a successful Paymob webhook.

    This lets you test the full payment flow locally without needing ngrok
    or a real Paymob webhook. Only available in development mode.
    """
    if settings.environment not in ("development", "dev", "local", "test"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This endpoint is only available in development mode.",
        )

    payment = db.scalar(
        select(Payment)
        .where(Payment.id == payment_id)
        .options(
            selectinload(Payment.session).selectinload(LearningSession.request),
            selectinload(Payment.request),
            selectinload(Payment.student),
            selectinload(Payment.instructor),
        )
    )
    if payment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found.")
    if payment.status != "pending":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only pending payments can be confirmed.")
    if current_user.role != "admin" and current_user.id != payment.student_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You cannot confirm this payment.")

    session = payment.session
    if session:
        _hold_payment_and_update_wallet(db, payment, session)
    else:
        payment.status = "held"
        payment.paid_at = datetime.now(timezone.utc)

    payment.paymob_transaction_id = f"dev_confirm_{payment.id}"
    db.commit()
    db.refresh(payment)

    return serialize_payment(payment)


@router.get("/my", response_model=list[PaymentResponse])
def get_my_payments(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[PaymentResponse]:
    if current_user.role != "student":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only students can view student payments.")

    payments = db.scalars(
        select(Payment)
        .where(Payment.student_id == current_user.id)
        .order_by(Payment.created_at.desc())
        .options(
            selectinload(Payment.session),
            selectinload(Payment.request),
            selectinload(Payment.student),
            selectinload(Payment.instructor),
        )
    ).all()
    return [serialize_payment(payment) for payment in payments]


@router.get("/session/{session_id}", response_model=PaymentDetailResponse)
def get_payment_by_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PaymentDetailResponse:
    session = db.scalar(
        select(LearningSession)
        .where(LearningSession.id == session_id)
        .options(selectinload(LearningSession.request))
    )
    if session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")
    statement = select(Payment).where(Payment.session_id == session_id)
    if session.request is not None and session.request.request_type == "group" and current_user.role == "student":
        statement = statement.where(Payment.student_id == current_user.id)
    payment = db.scalar(
        statement.order_by(Payment.created_at.desc()).options(
            selectinload(Payment.session),
            selectinload(Payment.request),
            selectinload(Payment.student),
            selectinload(Payment.instructor),
        )
    )
    if payment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found.")
    if current_user.role != "admin" and current_user.id not in {payment.student_id, payment.instructor_id}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You cannot view this payment.")
    return serialize_payment(payment)


@router.post("/{payment_id}/release", response_model=PaymentResponse)
def release_payment(
    payment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PaymentResponse:
    payment = get_payment_with_details(db, payment_id)
    if payment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found.")
    if current_user.role != "admin" and current_user.id != payment.student_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You cannot release this payment.")
    if payment.status != "held":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only held payments can be released.")

    release_held_payment(db, payment)
    create_notification(
        db,
        user_id=payment.instructor_id,
        type="payment_released",
        title="Payment released",
        message="Payment has been released to your wallet.",
        link_url="/instructor/wallet",
    )
    db.commit()
    db.refresh(payment)
    return serialize_payment(payment)


@router.post("/{payment_id}/refund", response_model=PaymentResponse)
def refund_payment(
    payment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PaymentResponse:
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Refunds are admin-only for now.")

    payment = get_payment_with_details(db, payment_id)
    if payment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found.")
    if payment.status != "held":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only held payments can be refunded.")

    refund_held_payment(db, payment)
    create_notification(
        db,
        user_id=payment.student_id,
        type="payment_refunded",
        title="Payment refunded",
        message="Your payment was refunded.",
        link_url="/student/payments",
    )
    create_notification(
        db,
        user_id=payment.instructor_id,
        type="payment_refunded",
        title="Payment refunded",
        message="A held payment was refunded.",
        link_url="/instructor/wallet",
    )
    db.commit()
    db.refresh(payment)
    return serialize_payment(payment)
