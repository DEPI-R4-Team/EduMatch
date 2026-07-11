import logging
import json
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import func, select
from sqlalchemy.exc import SQLAlchemyError
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
    get_authoritative_session_payment,
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


def _as_dict(value: object) -> dict:
    if isinstance(value, dict):
        return value
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
        except json.JSONDecodeError:
            return {}
        return parsed if isinstance(parsed, dict) else {}
    return {}


def _first_dict(*values: object) -> dict:
    for value in values:
        parsed = _as_dict(value)
        if parsed:
            return parsed
    return {}


def _nested_get(data: dict, *path: str) -> object:
    current: object = data
    for key in path:
        if not isinstance(current, dict):
            return None
        current = current.get(key)
    return current


def _extract_callback_obj(body: dict[str, Any]) -> dict[str, Any]:
    obj = body.get("obj", body)
    return _as_dict(obj)


def _extract_callback_metadata(obj: dict[str, Any]) -> dict[str, str]:
    payment_key_claims = _as_dict(obj.get("payment_key_claims"))
    order_extras = _extract_paymob_order_extras(obj)
    explicit_extra = _as_dict(obj.get("extra"))
    merchant_extra = _as_dict(obj.get("merchant_extra"))
    return {
        str(key): str(value)
        for key, value in _first_dict(
            payment_key_claims.get("extra"),
            payment_key_claims.get("extras"),
            explicit_extra,
            merchant_extra,
            order_extras,
        ).items()
    }


def _extract_paymob_intention_id(obj: dict[str, Any]) -> str:
    intention = obj.get("intention")
    if isinstance(intention, dict):
        intention_id = intention.get("id")
        if intention_id:
            return str(intention_id)
    payment_key_claims = _as_dict(obj.get("payment_key_claims"))
    for key in ("intention_id", "intention"):
        value = payment_key_claims.get(key)
        if value:
            return str(value)
    value = obj.get("intention_id")
    return str(value) if value else ""


def _extract_paymob_transaction_status(obj: dict[str, Any]) -> str:
    for key in ("data.message", "txn_response_code", "source_data.sub_type"):
        value = _nested_get(obj, *key.split("."))
        if value:
            return str(value)
    return str(obj.get("status", "") or obj.get("message", "") or "")


def _payment_return_url(payment_id: int, session_id: int) -> str:
    return f"{settings.frontend_url.rstrip('/')}/payment/result?payment_id={payment_id}&session_id={session_id}"


def _paymob_notification_url() -> str | None:
    if not settings.backend_url:
        logger.warning("Paymob notification URL is not configured. Set BACKEND_URL to a public backend URL for webhooks.")
        return None
    return f"{settings.backend_url.rstrip('/')}/payments/paymob/callback"


def _trace(message: str, **fields: object) -> None:
    details = " ".join(f"{key}={value}" for key, value in fields.items())
    logger.info("[PAYMENT-CONFIRM-TRACE] %s%s", message, f" {details}" if details else "")


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

    _trace(
        "PAYMENT CREATED",
        local_payment_id=payment.id,
        session_id=session.id,
        status=payment.status,
        paymob_intention_id=payment.paymob_intention_id or "none",
        paymob_order_id=payment.paymob_order_id or "none",
        paymob_transaction_id=payment.paymob_transaction_id or "none",
    )

    if session.status == "ready" and not payment_state.session_access_allowed:
        session.status = "waiting_payment"

    if not settings.paymob_api_key or not settings.paymob_integration_id or not settings.paymob_iframe_id:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Paymob is not configured. Set PAYMOB_API_KEY, PAYMOB_INTEGRATION_ID, and PAYMOB_IFRAME_ID.",
        )

    try:
        return_url = _payment_return_url(payment.id, session.id)
        checkout = await create_iframe_checkout(
            PaymobCheckoutRequest(
                amount=total_amount,
                currency="EGP",
                billing_data=paymob_service.build_billing_data(current_user),
                return_url=return_url,
                notification_url=_paymob_notification_url(),
                metadata={
                    "payment_id": str(payment.id),
                    "session_id": str(session.id),
                    "request_id": str(session.request_id),
                    "student_id": str(current_user.id),
                },
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
        _trace(
            "PAYMOB CHECKOUT CREATED",
            local_payment_id=payment.id,
            session_id=session.id,
            status=payment.status,
            paymob_order_id=payment.paymob_order_id or "none",
            paymob_intention_id=payment.paymob_intention_id or "none",
            paymob_transaction_id=payment.paymob_transaction_id or "none",
        )
    except (PaymobProviderError, PaymobNetworkError, RuntimeError) as exc:
        logger.error("Paymob checkout failed for session %s: %s", session.id, exc)
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to create payment with Paymob: {exc}",
        ) from exc

    db.commit()
    db.refresh(payment)
    _trace(
        "PAYMENT CREATION COMMIT COMPLETE",
        local_payment_id=payment.id,
        session_id=session.id,
        database_status_after_commit=payment.status,
        paymob_order_id=payment.paymob_order_id or "none",
        paymob_intention_id=payment.paymob_intention_id or "none",
        paymob_transaction_id=payment.paymob_transaction_id or "none",
    )
    return CreatePaymentIntentionResponse(
        payment_id=payment.id,
        checkout_url=checkout["iframe_url"],
        client_secret=payment_token,
    )


@router.get("/paymob/callback")
@router.post("/paymob/callback")
async def paymob_webhook_callback(request: Request, db: Session = Depends(get_db)) -> dict:
    """Receive and process Paymob webhook callbacks.

    This endpoint is called by Paymob's servers (not authenticated via JWT).
    Security is ensured via HMAC verification.

    Paymob sends the HMAC in the query string ``?hmac=...`` and the transaction
    data in the POST body under ``obj``.
    """
    try:
        body = await request.json() if request.method != "GET" else {}
    except json.JSONDecodeError:
        body = {}
    if not isinstance(body, dict):
        body = {}
    if request.method == "GET" and not body:
        body = dict(request.query_params)

    received_hmac = request.query_params.get("hmac", "") or str(body.get("hmac", "") or "")
    callback_type = body.get("type")
    obj = _extract_callback_obj(body)
    if not obj:
        logger.warning("[PAYMOB] Invalid callback payload type=%s", type(obj).__name__)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid Paymob callback payload.")

    transaction_id = str(obj.get("id", ""))
    order_id = _extract_paymob_order_id(obj)
    callback_metadata = _extract_callback_metadata(obj)
    payment_id_str = str(callback_metadata.get("payment_id") or "")
    paymob_intention_id = _extract_paymob_intention_id(obj)
    paymob_pending = _as_bool(obj.get("pending", False))
    paymob_status = _extract_paymob_transaction_status(obj)
    _trace(
        "CALLBACK RECEIVED",
        method=request.method,
        path=request.url.path,
        callback_type=callback_type or "none",
        transaction_id=transaction_id or "none",
        order_id=order_id or "none",
        reference=payment_id_str or paymob_intention_id or order_id or "none",
    )
    _trace(
        "CALLBACK STRUCTURE",
        top_level_keys=",".join(sorted(body.keys())) or "none",
        transaction_object_present=bool(obj),
        transaction_id_present=bool(transaction_id),
        order_id_present=bool(order_id),
        success_field_present="success" in obj,
        metadata_keys=",".join(sorted(callback_metadata.keys())) or "none",
    )
    logger.info(
        "[PAYMOB] Transaction callback received type=%s transaction_id=%s order_id=%s hmac_present=%s",
        callback_type,
        transaction_id,
        order_id,
        bool(received_hmac),
    )

    hmac_valid = paymob_service.verify_hmac(body, received_hmac)
    _trace(
        "CALLBACK AUTH",
        hmac_present=bool(received_hmac),
        hmac_valid=hmac_valid,
        transaction_id=transaction_id or "none",
        order_id=order_id or "none",
    )
    logger.info("[PAYMOB] HMAC valid=%s transaction_id=%s order_id=%s", hmac_valid, transaction_id, order_id)
    if not hmac_valid:
        logger.warning("[PAYMOB] Webhook HMAC verification failed transaction_id=%s order_id=%s", transaction_id, order_id)
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid HMAC signature.")

    success = _as_bool(obj.get("success", False))
    _trace(
        "CALLBACK REFERENCES",
        transaction_id=transaction_id or "none",
        order_id=order_id or "none",
        reference=payment_id_str or paymob_intention_id or order_id or "none",
        payment_id=payment_id_str or "none",
        intention_id=paymob_intention_id or "none",
        success=success,
        pending=paymob_pending,
    )
    logger.info(
        "[PAYMOB] Callback references transaction_id=%s order_id=%s local_payment_ref=%s intention_id=%s success=%s",
        transaction_id,
        order_id,
        payment_id_str or "none",
        paymob_intention_id or "none",
        success,
    )

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
        _trace(
            "PAYMENT LOOKUP",
            lookup_field="payment_id",
            lookup_value=payment_id_str,
            payment_found=payment is not None,
            local_payment_id=payment.id if payment else "none",
            session_id=payment.session_id if payment else "none",
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
        _trace(
            "PAYMENT LOOKUP",
            lookup_field="paymob_intention_id",
            lookup_value=paymob_intention_id,
            payment_found=payment is not None,
            local_payment_id=payment.id if payment else "none",
            session_id=payment.session_id if payment else "none",
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
        _trace(
            "PAYMENT LOOKUP",
            lookup_field="paymob_order_id",
            lookup_value=order_id,
            payment_found=payment is not None,
            local_payment_id=payment.id if payment else "none",
            session_id=payment.session_id if payment else "none",
        )

    if payment is None:
        # Fall back by session only when it uniquely identifies one pending payment.
        session_id_str = str(callback_metadata.get("session_id") or "")
        if session_id_str.isdigit():
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
            _trace(
                "PAYMENT LOOKUP",
                lookup_field="session_id_pending_unique",
                lookup_value=session_id_str,
                payment_found=payment is not None,
                local_payment_id=payment.id if payment else "none",
                session_id=payment.session_id if payment else "none",
            )
        elif session_id_str:
            logger.warning("[PAYMOB] Ignoring non-numeric session reference from callback: %s", session_id_str)

    if payment is None:
        logger.warning("[PAYMOB] Payment lookup failed transaction_id=%s order_id=%s", transaction_id, order_id)
        return {"status": "ignored", "reason": "no matching payment"}

    old_status = payment.status
    logger.info(
        "[PAYMOB] Payment lookup result payment_id=%s session_id=%s old_status=%s",
        payment.id,
        payment.session_id,
        old_status,
    )

    payment.paymob_transaction_id = transaction_id
    payment.paymob_order_id = order_id
    if paymob_intention_id:
        payment.paymob_intention_id = paymob_intention_id

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

    try:
        _trace(
            "TRANSACTION RESULT",
            paymob_success=success,
            paymob_pending=paymob_pending,
            paymob_status=paymob_status or "none",
            current_local_status=payment.status,
        )
        if success and not paymob_pending and payment.status == "pending":
            session = payment.session
            if session:
                _hold_payment_and_update_wallet(db, payment, session)
            else:
                payment.status = "held"
                payment.paid_at = datetime.now(timezone.utc)
            _trace(
                "STATUS TRANSITION",
                old_status=old_status,
                new_status=payment.status,
            )

            db.commit()
            database_status = db.scalar(select(Payment.status).where(Payment.id == payment.id))
            _trace(
                "COMMIT COMPLETE",
                payment_id=payment.id,
                database_status_after_commit=database_status or "missing",
            )
            logger.info(
                "[PAYMOB] Status transition payment_id=%s session_id=%s %s -> %s; transaction committed successfully",
                payment.id,
                payment.session_id,
                old_status,
                payment.status,
            )
            return {"status": "success", "payment_id": payment.id}
        if not success and not paymob_pending and payment.status == "pending":
            payment.status = "cancelled"
            _trace(
                "STATUS TRANSITION",
                old_status=old_status,
                new_status=payment.status,
            )
            db.commit()
            database_status = db.scalar(select(Payment.status).where(Payment.id == payment.id))
            _trace(
                "COMMIT COMPLETE",
                payment_id=payment.id,
                database_status_after_commit=database_status or "missing",
            )
            logger.info(
                "[PAYMOB] Status transition payment_id=%s session_id=%s %s -> %s; transaction committed successfully",
                payment.id,
                payment.session_id,
                old_status,
                payment.status,
            )
            return {"status": "failed", "payment_id": payment.id}

        db.commit()
        database_status = db.scalar(select(Payment.status).where(Payment.id == payment.id))
        _trace(
            "COMMIT COMPLETE",
            payment_id=payment.id,
            database_status_after_commit=database_status or "missing",
        )
        logger.info(
            "[PAYMOB] Payment already processed payment_id=%s session_id=%s status=%s; no side effects repeated",
            payment.id,
            payment.session_id,
            payment.status,
        )
        return {"status": "already_processed", "payment_id": payment.id}
    except Exception:
        db.rollback()
        logger.exception(
            "[PAYMOB] Transaction processing failed payment_id=%s session_id=%s old_status=%s",
            payment.id,
            payment.session_id,
            old_status,
        )
        raise


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
    _trace(
        "STATUS GET",
        requested_payment_id=payment_id,
        requested_session_id=payment.session_id,
        selected_payment_id=payment.id,
        selected_payment_status=payment.status,
        number_of_payment_attempts=db.scalar(select(func.count(Payment.id)).where(Payment.session_id == payment.session_id)) or 0,
    )
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
    logger.info("[PAYMENTS-MY] request started user_id=%s role=%s", current_user.id, current_user.role)
    if current_user.role != "student":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only students can view student payments.")

    try:
        logger.info("[PAYMENTS-MY] payments query started user_id=%s", current_user.id)
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
    except SQLAlchemyError:
        logger.exception("[PAYMENTS-MY] payments query failed user_id=%s exception_type=SQLAlchemyError", current_user.id)
        raise
    logger.info("[PAYMENTS-MY] payments query completed user_id=%s count=%s", current_user.id, len(payments))
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

    student_scope = current_user.id if session.request is not None and session.request.request_type == "group" and current_user.role == "student" else None
    payment = get_authoritative_session_payment(db, session_id, student_scope)
    if payment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found.")
    payment = get_payment_with_details(db, payment.id)
    if payment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found.")
    if current_user.role != "admin" and current_user.id not in {payment.student_id, payment.instructor_id}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You cannot view this payment.")
    _trace(
        "STATUS GET",
        requested_session_id=session_id,
        selected_payment_id=payment.id,
        selected_payment_status=payment.status,
        number_of_payment_attempts=db.scalar(select(func.count(Payment.id)).where(Payment.session_id == session_id)) or 0,
    )
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
