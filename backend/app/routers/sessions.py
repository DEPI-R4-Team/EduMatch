from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload
from decimal import Decimal

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models import GroupParticipant, Payment, Review, Session as LearningSession, User
from app.schemas.session_schema import SessionRescheduleRequest, SessionResponse
from app.services.notification_service import create_notification, create_notifications
from app.services.payment_service import refund_held_payment, release_held_payment

router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.get("/ping")
def ping() -> dict[str, str]:
    return {"router": "sessions", "status": "ok"}


def to_session_response(session: LearningSession, current_user: User | None = None) -> SessionResponse:
    payment = max(session.payments, key=lambda item: item.created_at) if session.payments else None
    participant_payment_status = None
    if session.request is not None and session.request.request_type == "group" and current_user is not None and current_user.role == "student":
        payment = next((item for item in session.payments if item.student_id == current_user.id), None)
        participant = next(
            (
                item
                for item in session.request.group_participants
                if item.student_id == current_user.id and item.status == "active"
            ),
            None,
        )
        participant_payment_status = participant.payment_status if participant else None
    amount = None
    platform_fee = None
    total_amount = None

    if payment:
        amount = payment.amount
        platform_fee = payment.platform_fee
        total_amount = payment.total_amount
    elif session.request:
        amount = session.request.final_price_per_student or session.request.current_price_per_student or session.request.base_price
        if amount:
            platform_fee = (amount * Decimal("0.10")).quantize(Decimal("0.01"))
            total_amount = amount + platform_fee

    return SessionResponse.model_validate(session).model_copy(
        update={
            "request_title": session.request.title if session.request else None,
            "request_type": session.request.request_type if session.request else None,
            "request_status": session.request.status if session.request else None,
            "payment_status": payment.status if payment else participant_payment_status,
            "payment_amount": amount,
            "payment_platform_fee": platform_fee,
            "payment_total_amount": total_amount,
            "student_name": session.student.full_name if session.student else None,
            "instructor_name": session.instructor.full_name if session.instructor else None,
            "has_review": bool(session.reviews),
        }
    )


@router.get("/my", response_model=list[SessionResponse])
def get_my_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[SessionResponse]:
    if current_user.role == "student":
        group_request_ids = db.scalars(
            select(GroupParticipant.request_id).where(GroupParticipant.student_id == current_user.id, GroupParticipant.status == "active")
        ).all()
        clause = or_(LearningSession.student_id == current_user.id, LearningSession.request_id.in_(group_request_ids))
    elif current_user.role == "instructor":
        clause = LearningSession.instructor_id == current_user.id
    else:
        clause = or_(LearningSession.student_id == current_user.id, LearningSession.instructor_id == current_user.id)

    sessions = db.scalars(
        select(LearningSession)
        .where(clause)
        .order_by(LearningSession.created_at.desc())
        .options(
            selectinload(LearningSession.request),
            selectinload(LearningSession.student),
            selectinload(LearningSession.instructor),
            selectinload(LearningSession.payments),
            selectinload(LearningSession.reviews),
        )
    ).all()
    return [to_session_response(session, current_user) for session in sessions]


@router.get("/{session_id}", response_model=SessionResponse)
def get_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SessionResponse:
    session = db.scalar(
        select(LearningSession)
        .where(LearningSession.id == session_id)
        .options(
            selectinload(LearningSession.request),
            selectinload(LearningSession.student),
            selectinload(LearningSession.instructor),
            selectinload(LearningSession.payments),
            selectinload(LearningSession.reviews),
        )
    )
    if session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")
    is_group_participant = False
    if session.request is not None and session.request.request_type == "group":
        is_group_participant = db.scalar(
            select(GroupParticipant.id).where(
                GroupParticipant.request_id == session.request_id,
                GroupParticipant.student_id == current_user.id,
                GroupParticipant.status == "active",
            )
        ) is not None
    if current_user.role != "admin" and current_user.id not in {session.student_id, session.instructor_id} and not is_group_participant:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You cannot view this session.")
    return to_session_response(session, current_user)


def get_session_or_404(db: Session, session_id: int) -> LearningSession:
    session = db.scalar(
        select(LearningSession)
        .where(LearningSession.id == session_id)
        .options(
            selectinload(LearningSession.request),
            selectinload(LearningSession.student),
            selectinload(LearningSession.instructor),
            selectinload(LearningSession.payments),
            selectinload(LearningSession.reviews),
        )
    )
    if session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")
    return session


def ensure_involved(session: LearningSession, current_user: User) -> None:
    if current_user.id in {session.student_id, session.instructor_id}:
        return
    if session.request is not None and session.request.request_type == "group":
        if any(
            participant.student_id == current_user.id and participant.status == "active" and participant.payment_status in {"held", "released"}
            for participant in session.request.group_participants
        ):
            return
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You cannot update this session.")


def get_latest_held_payment(db: Session, session_id: int) -> Payment | None:
    return db.scalar(
        select(Payment)
        .where(Payment.session_id == session_id, Payment.status == "held")
        .order_by(Payment.created_at.desc())
    )


def get_held_payments(db: Session, session_id: int) -> list[Payment]:
    return db.scalars(select(Payment).where(Payment.session_id == session_id, Payment.status == "held")).all()


def has_held_payment_or_paid_request(session: LearningSession) -> bool:
    if session.request is not None and session.request.request_type == "group":
        active_participants = [participant for participant in session.request.group_participants if participant.status == "active"]
        return bool(active_participants) and all(participant.payment_status in {"held", "released"} for participant in active_participants)
    return any(payment.status == "held" for payment in session.payments) or (
        session.request is not None and session.request.status in {"paid", "in_session", "completed"}
    )


@router.put("/{session_id}/reschedule", response_model=SessionResponse)
def reschedule_session(
    session_id: int,
    payload: SessionRescheduleRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SessionResponse:
    session = get_session_or_404(db, session_id)
    if session.request is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Session request is missing.")
    if session.request.request_type != "normal":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only normal sessions can be rescheduled.")
    if current_user.role != "student" or current_user.id != session.student_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the student who owns this normal session can reschedule it.")
    if session.status not in {"waiting_payment", "ready"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only waiting payment or ready sessions can be rescheduled.")

    scheduled_at = payload.scheduled_at
    if scheduled_at.tzinfo is None:
        scheduled_at = scheduled_at.replace(tzinfo=timezone.utc)
    else:
        scheduled_at = scheduled_at.astimezone(timezone.utc)

    if scheduled_at <= datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="New schedule must be in the future.")

    session.scheduled_at = scheduled_at
    session.request.preferred_datetime = scheduled_at
    formatted_schedule = scheduled_at.strftime("%Y-%m-%d %H:%M UTC")
    create_notification(
        db,
        user_id=session.instructor_id,
        type="session_rescheduled",
        title="Session rescheduled",
        message=f"The student rescheduled {session.request.title} to {formatted_schedule}.",
        link_url=f"/instructor/sessions/{session.id}",
    )
    db.commit()
    db.refresh(session)
    return to_session_response(get_session_or_404(db, session_id), current_user)


@router.put("/{session_id}/start", response_model=SessionResponse)
def start_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SessionResponse:
    session = get_session_or_404(db, session_id)
    ensure_involved(session, current_user)
    if session.status != "ready":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only ready sessions can be started.")
    if not has_held_payment_or_paid_request(session):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Payment must be held before starting.")

    session.status = "active"
    session.started_at = session.started_at or datetime.now(timezone.utc)
    if session.request:
        session.request.status = "in_session"
    if session.request and session.request.request_type == "group":
        recipients = [participant.student_id for participant in session.request.group_participants if participant.status == "active" and participant.student_id != current_user.id]
        if current_user.id != session.instructor_id:
            recipients.append(session.instructor_id)
        create_notifications(
            db,
            recipients,
            type="session_started",
            title="Session started",
            message="Your group session has been started.",
            link_url=f"/student/sessions/{session.id}",
        )
    else:
        recipient_id = session.instructor_id if current_user.id == session.student_id else session.student_id
        recipient_link = (
            f"/instructor/sessions/{session.id}" if recipient_id == session.instructor_id else f"/student/sessions/{session.id}"
        )
        create_notification(
            db,
            user_id=recipient_id,
            type="session_started",
            title="Session started",
            message="Your session has been started.",
            link_url=recipient_link,
        )
    db.commit()
    db.refresh(session)
    return to_session_response(get_session_or_404(db, session_id), current_user)


@router.put("/{session_id}/instructor-complete", response_model=SessionResponse)
def instructor_complete_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SessionResponse:
    session = get_session_or_404(db, session_id)
    if current_user.role != "instructor" or current_user.id != session.instructor_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the assigned instructor can complete this session.")
    if session.status in {"cancelled", "disputed", "completed"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This session cannot be marked completed.")
    if session.status not in {"ready", "active"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Session must be ready or active.")

    first_completion_mark = session.instructor_marked_completed_at is None
    session.instructor_marked_completed_at = session.instructor_marked_completed_at or datetime.now(timezone.utc)
    if first_completion_mark:
        create_notification(
            db,
            user_id=session.request.group_owner_id if session.request and session.request.request_type == "group" else session.student_id,
            type="session_marked_completed",
            title="Session marked completed",
            message="Your instructor marked the session as completed. Please confirm completion.",
            link_url=f"/student/sessions/{session.id}",
        )
    db.commit()
    db.refresh(session)
    return to_session_response(get_session_or_404(db, session_id), current_user)


@router.post("/{session_id}/confirm-completion", response_model=SessionResponse)
def confirm_session_completion(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SessionResponse:
    session = get_session_or_404(db, session_id)
    if current_user.role != "student" or current_user.id != session.student_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the session student can confirm completion.")
    if session.status in {"cancelled", "disputed"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This session cannot be completed.")
    if session.status == "completed":
        return to_session_response(session, current_user)
    if session.instructor_marked_completed_at is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Instructor must mark the session completed first.")

    held_payments = get_held_payments(db, session.id) if session.request and session.request.request_type == "group" else []
    payment = get_latest_held_payment(db, session.id)
    if session.request is None or session.request.request_type != "group":
        held_payments = [payment] if payment is not None else []
    if not held_payments:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No held payment found for this session.")

    now = datetime.now(timezone.utc)
    for held_payment in held_payments:
        release_held_payment(db, held_payment)
    if session.request and session.request.request_type == "group":
        for participant in session.request.group_participants:
            if participant.status == "active" and participant.payment_status == "held":
                participant.payment_status = "released"
    session.status = "completed"
    session.ended_at = session.ended_at or now
    session.completed_at = session.completed_at or now
    session.student_confirmed_completed_at = session.student_confirmed_completed_at or now
    if session.request:
        session.request.status = "completed"
    create_notification(
        db,
        user_id=session.instructor_id,
        type="session_completed",
        title="Session completed",
        message="The student confirmed session completion.",
        link_url=f"/instructor/sessions/{session.id}",
    )
    if session.request and session.request.request_type == "group":
        create_notifications(
            db,
            [participant.student_id for participant in session.request.group_participants if participant.status == "active"],
            type="session_completed",
            title="Group session completed",
            message="The group owner confirmed session completion.",
            link_url=f"/student/sessions/{session.id}",
        )
    create_notification(db, user_id=session.instructor_id, type="payment_released", title="Payment released", message="Payment has been released to your wallet.", link_url="/instructor/wallet")
    db.commit()
    db.refresh(session)
    return to_session_response(get_session_or_404(db, session_id), current_user)


@router.put("/{session_id}/cancel", response_model=SessionResponse)
def cancel_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SessionResponse:
    session = get_session_or_404(db, session_id)
    ensure_involved(session, current_user)
    if session.status == "completed":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Completed sessions cannot be cancelled.")
    if session.status == "cancelled":
        return to_session_response(session, current_user)

    payments = get_held_payments(db, session.id) if session.request and session.request.request_type == "group" else []
    payment = get_latest_held_payment(db, session.id)
    if not payments and payment is not None:
        payments = [payment]
    for payment in payments:
        refund_held_payment(db, payment)
        if session.request and session.request.request_type == "group":
            for participant in session.request.group_participants:
                if participant.payment_id == payment.id:
                    participant.payment_status = "refunded"
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
    session.status = "cancelled"
    if session.request:
        session.request.status = "cancelled"
    db.commit()
    db.refresh(session)
    return to_session_response(get_session_or_404(db, session_id), current_user)
