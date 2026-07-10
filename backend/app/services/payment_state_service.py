from dataclasses import dataclass
from decimal import Decimal

from sqlalchemy import case, select
from sqlalchemy.orm import Session

from app.models import Payment, Session as LearningSession

PAYMENT_PENDING_STATES = {"pending"}
PAYMENT_SUCCESS_STATES = {"held", "released"}
PAYMENT_RETRYABLE_STATES = {"cancelled", "refunded"}
PAYMENT_BLOCKED_STATES = PAYMENT_SUCCESS_STATES | {"disputed"}
SESSION_TERMINAL_STATES = {"completed", "cancelled", "disputed"}
REQUEST_PAYABLE_STATUS = "waiting_payment"


@dataclass(frozen=True)
class SessionPaymentState:
    session_id: int
    latest_payment: Payment | None
    successful_payment: Payment | None
    pending_payment: Payment | None
    payment_exists: bool
    payment_status: str | None
    is_successfully_paid: bool
    can_initiate_payment: bool
    can_retry_payment: bool
    session_access_allowed: bool
    reason: str | None = None


def get_latest_session_payment(db: Session, session_id: int, student_id: int | None = None) -> Payment | None:
    statement = select(Payment).where(Payment.session_id == session_id)
    if student_id is not None:
        statement = statement.where(Payment.student_id == student_id)
    return db.scalar(statement.order_by(Payment.created_at.desc(), Payment.id.desc()))


def get_successful_session_payment(db: Session, session_id: int, student_id: int | None = None) -> Payment | None:
    statement = select(Payment).where(
        Payment.session_id == session_id,
        Payment.status.in_(PAYMENT_SUCCESS_STATES),
    )
    if student_id is not None:
        statement = statement.where(Payment.student_id == student_id)
    return db.scalar(statement.order_by(Payment.created_at.desc(), Payment.id.desc()))


def get_pending_session_payment(db: Session, session_id: int, student_id: int | None = None) -> Payment | None:
    statement = select(Payment).where(
        Payment.session_id == session_id,
        Payment.status.in_(PAYMENT_PENDING_STATES),
    )
    if student_id is not None:
        statement = statement.where(Payment.student_id == student_id)
    return db.scalar(statement.order_by(Payment.created_at.desc(), Payment.id.desc()))


def get_authoritative_session_payment(db: Session, session_id: int, student_id: int | None = None) -> Payment | None:
    """Return the payment attempt that should represent the session's current state.

    Successful escrow states always win over pending or failed attempts. This
    prevents a stale pending/failed checkout from hiding a later successful
    payment when the frontend asks for session payment status.
    """
    statement = select(Payment).where(Payment.session_id == session_id)
    if student_id is not None:
        statement = statement.where(Payment.student_id == student_id)
    status_rank = case(
        (Payment.status.in_(PAYMENT_SUCCESS_STATES), 0),
        (Payment.status.in_(PAYMENT_PENDING_STATES), 1),
        else_=2,
    )
    return db.scalar(statement.order_by(status_rank, Payment.created_at.desc(), Payment.id.desc()))


def calculate_payment_amounts(amount: Decimal) -> tuple[Decimal, Decimal]:
    platform_fee = (amount * Decimal("0.10")).quantize(Decimal("0.01"))
    return platform_fee, amount + platform_fee


def get_session_payment_state(db: Session, session: LearningSession, student_id: int | None = None) -> SessionPaymentState:
    latest_payment = get_authoritative_session_payment(db, session.id, student_id)
    successful_payment = get_successful_session_payment(db, session.id, student_id)
    pending_payment = get_pending_session_payment(db, session.id, student_id)
    latest_status = latest_payment.status if latest_payment else None

    if successful_payment is not None:
        return SessionPaymentState(
            session_id=session.id,
            latest_payment=latest_payment,
            successful_payment=successful_payment,
            pending_payment=pending_payment,
            payment_exists=True,
            payment_status=latest_status,
            is_successfully_paid=True,
            can_initiate_payment=False,
            can_retry_payment=False,
            session_access_allowed=True,
            reason="successful_payment_exists",
        )

    if session.status in SESSION_TERMINAL_STATES:
        return SessionPaymentState(
            session_id=session.id,
            latest_payment=latest_payment,
            successful_payment=None,
            pending_payment=pending_payment,
            payment_exists=latest_payment is not None,
            payment_status=latest_status,
            is_successfully_paid=False,
            can_initiate_payment=False,
            can_retry_payment=False,
            session_access_allowed=False,
            reason=f"session_{session.status}",
        )

    request_status = session.request.status if session.request is not None else None
    if request_status == REQUEST_PAYABLE_STATUS:
        return SessionPaymentState(
            session_id=session.id,
            latest_payment=latest_payment,
            successful_payment=None,
            pending_payment=pending_payment,
            payment_exists=latest_payment is not None,
            payment_status=latest_status,
            is_successfully_paid=False,
            can_initiate_payment=True,
            can_retry_payment=latest_status in PAYMENT_PENDING_STATES | PAYMENT_RETRYABLE_STATES if latest_status else True,
            session_access_allowed=False,
            reason="request_waiting_payment",
        )

    return SessionPaymentState(
        session_id=session.id,
        latest_payment=latest_payment,
        successful_payment=None,
        pending_payment=pending_payment,
        payment_exists=latest_payment is not None,
        payment_status=latest_status,
        is_successfully_paid=False,
        can_initiate_payment=False,
        can_retry_payment=False,
        session_access_allowed=False,
        reason=f"request_{request_status or 'missing'}",
    )
