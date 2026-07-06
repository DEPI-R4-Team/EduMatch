from datetime import datetime, timezone
from decimal import Decimal, ROUND_CEILING

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import GroupParticipant, LearningRequest, Payment, User


def calculate_group_price(
    base_price: Decimal,
    min_price_per_student: Decimal,
    active_participants_count: int,
) -> Decimal:
    count = max(active_participants_count, 1)
    split_price = (base_price / Decimal(count)).quantize(Decimal("1"), rounding=ROUND_CEILING)
    return max(min_price_per_student, split_price).quantize(Decimal("0.01"))


def get_active_participants(db: Session, request_id: int) -> list[GroupParticipant]:
    return db.scalars(
        select(GroupParticipant)
        .where(GroupParticipant.request_id == request_id, GroupParticipant.status == "active")
        .order_by(GroupParticipant.joined_at.asc(), GroupParticipant.id.asc())
        .options(selectinload(GroupParticipant.student))
    ).all()


def update_group_request_price(db: Session, request_id: int) -> Decimal | None:
    request = db.get(LearningRequest, request_id)
    if request is None or request.request_type != "group":
        return None

    base_price = request.base_price
    min_price = request.min_price_per_student or request.minimum_price
    if base_price is None or min_price is None:
        return None

    active_count = len(get_active_participants(db, request_id))
    price = calculate_group_price(base_price, min_price, active_count)
    request.current_price_per_student = price
    if request.status != "open":
        request.final_price_per_student = price
    return price


def lock_group_request_price(db: Session, request: LearningRequest) -> Decimal:
    if request.request_type != "group":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This is not a group request.")
    base_price = request.base_price
    min_price = request.min_price_per_student or request.minimum_price
    if base_price is None or min_price is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This group does not have valid pricing.")
    active_count = len(get_active_participants(db, request.id))
    locked_price = calculate_group_price(base_price, min_price, active_count)
    request.current_price_per_student = locked_price
    request.final_price_per_student = locked_price
    return locked_price


def add_group_owner_as_participant(db: Session, request: LearningRequest, owner_id: int) -> GroupParticipant:
    participant = GroupParticipant(
        request_id=request.id,
        student_id=owner_id,
        status="active",
        payment_status="unpaid",
    )
    db.add(participant)
    return participant


def can_student_join_group_request(db: Session, request: LearningRequest, student_id: int) -> None:
    if request.request_type != "group":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This is not a group request.")
    if request.status != "open":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only open group requests can be joined.")

    active_participants = get_active_participants(db, request.id)
    if request.max_participants is not None and len(active_participants) >= request.max_participants:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This group request is already full.")

    existing = db.scalar(
        select(GroupParticipant).where(
            GroupParticipant.request_id == request.id,
            GroupParticipant.student_id == student_id,
            GroupParticipant.status == "active",
        )
    )
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="You already joined this group request.")


def ensure_group_participant(db: Session, request_id: int, student_id: int) -> GroupParticipant:
    participant = db.scalar(
        select(GroupParticipant).where(
            GroupParticipant.request_id == request_id,
            GroupParticipant.student_id == student_id,
            GroupParticipant.status == "active",
        )
    )
    if participant is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not an active participant in this group.")
    return participant


def mark_participant_left(participant: GroupParticipant) -> None:
    participant.status = "left"
    participant.left_at = datetime.now(timezone.utc)


def get_group_request_or_404(db: Session, request_id: int) -> LearningRequest:
    request = db.scalar(
        select(LearningRequest)
        .where(LearningRequest.id == request_id)
        .options(
            selectinload(LearningRequest.student),
            selectinload(LearningRequest.group_owner),
            selectinload(LearningRequest.accepted_instructor),
            selectinload(LearningRequest.sessions),
            selectinload(LearningRequest.group_participants).selectinload(GroupParticipant.student),
        )
    )
    if request is None or request.request_type != "group":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group request not found.")
    return request


def active_group_payments(db: Session, request_id: int) -> list[Payment]:
    return db.scalars(
        select(Payment).where(Payment.request_id == request_id, Payment.status.in_(["held", "released"]))
    ).all()


def all_active_participants_paid(participants: list[GroupParticipant]) -> bool:
    return bool(participants) and all(participant.payment_status in {"held", "released"} for participant in participants)
