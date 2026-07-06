from datetime import datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models import InstructorWallet, Payment, Session as LearningSession, User, WalletTransaction
from app.schemas.payment_schema import PaymentDetailResponse, PaymentResponse, SimulatePaymentRequest
from app.services.notification_service import create_notification
from app.services.payment_service import get_or_create_wallet, refund_held_payment, release_held_payment

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


@router.post("/session/{session_id}/pay", response_model=PaymentResponse)
def pay_for_session(
    session_id: int,
    payload: SimulatePaymentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PaymentResponse:
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
            Payment.status.in_(["held", "released"]),
        )
    )
    if existing_payment is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This session already has a held or released payment.")

    amount = session.request.final_price_per_student or session.request.base_price
    if amount is None or amount <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This request does not have a valid payment amount.")

    platform_fee = (amount * PLATFORM_FEE_RATE).quantize(Decimal("0.01"))
    total_amount = amount + platform_fee
    now = datetime.now(timezone.utc)

    payment = Payment(
        session_id=session.id,
        request_id=session.request_id,
        student_id=session.student_id,
        instructor_id=session.instructor_id,
        amount=amount,
        platform_fee=platform_fee,
        total_amount=total_amount,
        status="held",
        payment_method=payload.payment_method,
        paid_at=now,
    )
    db.add(payment)
    db.flush()

    session.request.status = "paid"
    session.status = "ready"

    wallet = get_or_create_wallet(db, session.instructor_id)
    wallet.pending_balance += amount

    db.add(
        WalletTransaction(
            instructor_id=session.instructor_id,
            payment_id=payment.id,
            type="hold",
            amount=amount,
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
    db.commit()

    created_payment = get_payment_with_details(db, payment.id)
    if created_payment is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Payment was not created.")
    return serialize_payment(created_payment)


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
