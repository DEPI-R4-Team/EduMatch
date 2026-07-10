import logging
from datetime import datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.config import settings
from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models import GroupParticipant, InstructorWallet, Payment, Session as LearningSession, User, WalletTransaction
from app.schemas.payment_schema import (
    CreatePaymentIntentionResponse,
    PaymentDetailResponse,
    PaymentResponse,
    SimulatePaymentRequest,
)
from app.schemas.paymob_checkout_schema import PaymobCheckoutItem, PaymobCheckoutRequest
from app.services.notification_service import create_notification, create_notifications
from app.services.payment_service import get_or_create_wallet, refund_held_payment, release_held_payment
from app.services.payment_state_service import (
    calculate_payment_amounts,
    get_session_payment_state,
)
from app.services import paymob_service
from app.services.paymob_iframe_service import PaymobNetworkError, PaymobProviderError, create_iframe_checkout

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/payments", tags=["payments"])

@router.get("/ping")
def ping() -> dict[str, str]:
    return {"router": "payments", "status": "ok"}


def _as_bool(value: object) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().lower() == "true"
    return bool(value)


def _extract_paymob_order_id(obj: dict) -> str:
    order = obj.get("order")
    if isinstance(order, dict):
        return str(order.get("id", "") or "")
    if order is not None:
        return str(order)
    return ""


def _extract_paymob_order_extras(obj: dict) -> dict:
    order = obj.get("order")
    if isinstance(order, dict):
        extras = order.get("extras") or {}
        return extras if isinstance(extras, dict) else {}
    return {}


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

    participant = db.scalar(select(GroupParticipant).where(GroupParticipant.payment_id == payment.id))
    if participant is not None:
        participant.payment_status = "held"

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

    if session.request and session.request.request_type == "group":
        active_participants = db.scalars(
            select(GroupParticipant).where(
                GroupParticipant.request_id == session.request_id,
                GroupParticipant.status == "active",
            )
        ).all()
        if active_participants and all(item.payment_status in {"held", "released"} for item in active_participants):
            session.request.status = "paid"
            session.status = "ready"
            recipient_ids = [item.student_id for item in active_participants] + [session.instructor_id]
            create_notifications(
                db,
                recipient_ids,
                type="group_all_paid",
                title="Group session is ready",
                message="All active group participants have paid. The session is ready.",
                link_url=f"/student/sessions/{session.id}",
            )
    else:
        session.request.status = "paid"
        session.status = "ready"


@router.post("/session/{session_id}/pay", response_model=CreatePaymentIntentionResponse)
async def pay_for_session(
    session_id: int,
    payload: SimulatePaymentRequest | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CreatePaymentIntentionResponse:
    """Create a local pending payment and a fresh Paymob iframe checkout."""
    if current_user.role != "student":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only students can pay for sessions.")

    session = db.scalar(
        select(LearningSession)
        .where(LearningSession.id == session_id)
        .with_for_update()
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
    if session.request is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This session is not linked to a payable request.")
    payment_state = get_session_payment_state(db, session, current_user.id)
    if payment_state.is_successfully_paid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This session has already been paid.")
    if not payment_state.can_initiate_payment:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This session is not waiting for payment.")

    existing_payment = payment_state.pending_payment

    amount = session.request.final_price_per_student or session.request.base_price
    if amount is None or amount <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This request does not have a valid payment amount.")

    platform_fee, total_amount = calculate_payment_amounts(amount)

    payment_method = (payload.payment_method if payload else "paymob_card")

    if existing_payment is not None and existing_payment.status == "pending":
        payment = existing_payment
        payment.amount = amount
        payment.platform_fee = platform_fee
        payment.total_amount = total_amount
        payment.payment_method = payment_method
        payment.paymob_transaction_id = None
        payment.paymob_order_id = None
        logger.info("Reusing pending payment %s for session %s checkout retry", payment.id, session.id)
    else:
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

    if session.status == "ready" and not payment_state.session_access_allowed:
        session.status = "waiting_payment"

    if not settings.paymob_api_key or not settings.paymob_integration_id or not settings.paymob_iframe_id:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Paymob is not configured. Set PAYMOB_API_KEY, PAYMOB_INTEGRATION_ID, and PAYMOB_IFRAME_ID.",
        )

    try:
        checkout = await create_iframe_checkout(
            PaymobCheckoutRequest(
                amount=total_amount,
                currency="EGP",
                billing_data=paymob_service.build_billing_data(current_user),
                items=[
                    PaymobCheckoutItem(
                        name=session.request.title or "Learning Session",
                        amount=total_amount,
                        description=f"EduMatch session #{session.id}",
                        quantity=1,
                    )
                ],
            )
        )
        payment.paymob_order_id = str(checkout["order_id"])
        payment.paymob_intention_id = None
        payment_token = checkout["payment_token"]
    except (PaymobProviderError, PaymobNetworkError, RuntimeError) as exc:
        logger.error("Paymob checkout failed for session %s: %s", session.id, exc)
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to create payment with Paymob: {exc}",
        ) from exc

    db.commit()
    db.refresh(payment)
    return CreatePaymentIntentionResponse(
        payment_id=payment.id,
        checkout_url=checkout["iframe_url"],
        client_secret=payment_token,
    )


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
    success = _as_bool(obj.get("success", False))
    order_id = _extract_paymob_order_id(obj)
    payment_key_claims = obj.get("payment_key_claims", {}) or {}
    claim_extras = payment_key_claims.get("extra", {}) or {}
    order_extras = _extract_paymob_order_extras(obj)
    payment_id_str = str(claim_extras.get("payment_id") or order_extras.get("payment_id") or "")
    paymob_intention_id = str(obj.get("intention", {}).get("id", "") or payment_key_claims.get("intention_id", ""))

    # Find the matching payment
    # First try by intention ID, then by order
    payment = None
    if payment_id_str.isdigit():
        payment = db.scalar(
            select(Payment)
            .where(Payment.id == int(payment_id_str))
            .with_for_update()
            .options(
                selectinload(Payment.session).selectinload(LearningSession.request),
            )
        )

    if payment is None and paymob_intention_id:
        payment = db.scalar(
            select(Payment)
            .where(Payment.paymob_intention_id == paymob_intention_id)
            .with_for_update()
            .options(
                selectinload(Payment.session).selectinload(LearningSession.request),
            )
        )

    if payment is None and order_id:
        payment = db.scalar(
            select(Payment)
            .where(Payment.paymob_order_id == order_id)
            .with_for_update()
            .options(
                selectinload(Payment.session).selectinload(LearningSession.request),
            )
        )

    if payment is None:
        # Fall back by session only when it uniquely identifies one pending payment.
        session_id_str = str(claim_extras.get("session_id") or order_extras.get("session_id") or "")
        if session_id_str:
            pending_payments = db.scalars(
                select(Payment)
                .where(
                    Payment.session_id == int(session_id_str),
                    Payment.status == "pending",
                )
                .with_for_update()
                .options(
                    selectinload(Payment.session).selectinload(LearningSession.request),
                )
            ).all()
            if len(pending_payments) == 1:
                payment = pending_payments[0]

    if payment is None:
        logger.warning("No matching payment found for Paymob transaction %s", transaction_id)
        return {"status": "ignored", "reason": "no matching payment"}

    # Update payment with Paymob identifiers
    payment.paymob_transaction_id = transaction_id
    payment.paymob_order_id = order_id

    amount_cents = obj.get("amount_cents")
    expected_amount_cents = int((payment.total_amount * 100).quantize(Decimal("1")))
    try:
        received_amount_cents = int(amount_cents) if amount_cents is not None else None
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid Paymob amount.") from exc

    if received_amount_cents is not None and received_amount_cents != expected_amount_cents:
        logger.warning(
            "Paymob amount mismatch for payment %s: expected=%s received=%s",
            payment.id,
            expected_amount_cents,
            received_amount_cents,
        )
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Payment amount mismatch.")

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
    if current_user.role != "admin" and current_user.id not in {session.student_id, session.instructor_id}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You cannot view this payment.")

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
