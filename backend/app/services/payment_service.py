from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import GroupParticipant, InstructorWallet, Payment, WalletTransaction


def get_or_create_wallet(db: Session, instructor_id: int) -> InstructorWallet:
    wallet = db.scalar(select(InstructorWallet).where(InstructorWallet.instructor_id == instructor_id))
    if wallet is None:
        wallet = InstructorWallet(instructor_id=instructor_id)
        db.add(wallet)
        db.flush()
    return wallet


def release_held_payment(db: Session, payment: Payment) -> Payment:
    if payment.status != "held":
        return payment

    wallet = get_or_create_wallet(db, payment.instructor_id)
    wallet.pending_balance = max(Decimal("0.00"), wallet.pending_balance - payment.amount)
    wallet.available_balance += payment.amount
    wallet.total_earned += payment.amount
    payment.status = "released"
    payment.released_at = datetime.now(timezone.utc)
    participant = db.scalar(select(GroupParticipant).where(GroupParticipant.payment_id == payment.id))
    if participant is not None:
        participant.payment_status = "released"

    db.add(
        WalletTransaction(
            instructor_id=payment.instructor_id,
            payment_id=payment.id,
            type="release",
            amount=payment.amount,
            status="completed",
        )
    )
    return payment


def refund_held_payment(db: Session, payment: Payment) -> Payment:
    if payment.status != "held":
        return payment

    wallet = get_or_create_wallet(db, payment.instructor_id)
    wallet.pending_balance = max(Decimal("0.00"), wallet.pending_balance - payment.amount)
    payment.status = "refunded"
    payment.refunded_at = datetime.now(timezone.utc)
    participant = db.scalar(select(GroupParticipant).where(GroupParticipant.payment_id == payment.id))
    if participant is not None:
        participant.payment_status = "refunded"

    db.add(
        WalletTransaction(
            instructor_id=payment.instructor_id,
            payment_id=payment.id,
            type="refund",
            amount=payment.amount,
            status="completed",
        )
    )
    return payment
