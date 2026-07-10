from datetime import datetime, timedelta, timezone
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import Application, InstructorProfile, LearningRequest, Payment, Session as LearningSession, User
from app.services.notification_service import create_notification, create_notifications

INSTANT_OPEN_STATUS = "instant_open"


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def is_instant_request_expired(request: LearningRequest) -> bool:
    if request.expires_at is None:
        return False
    expires_at = request.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    return expires_at <= now_utc()


def instructor_has_active_session(db: Session, instructor_id: int) -> bool:
    return (
        db.scalar(
            select(LearningSession.id).where(
                LearningSession.instructor_id == instructor_id,
                LearningSession.status == "active",
            )
        )
        is not None
    )


def can_instructor_accept_instant_request(db: Session, instructor: User, request: LearningRequest) -> None:
    if instructor.role != "instructor":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only instructors can accept instant requests.")
    if instructor.status == "suspended":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Suspended instructors cannot accept instant requests.")
    if instructor.instructor_profile is None or not instructor.instructor_profile.is_available_for_instant:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Turn on instant availability before accepting requests.")
    if instructor_has_active_session(db, instructor.id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot accept an instant request during an active session.")
    if request.student_id == instructor.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot accept your own request.")


def available_instructor_ids(db: Session) -> list[int]:
    return db.scalars(
        select(User.id)
        .join(InstructorProfile, InstructorProfile.user_id == User.id)
        .where(
            User.role == "instructor",
            User.status != "suspended",
            InstructorProfile.is_available_for_instant.is_(True),
        )
    ).all()


def create_instant_request(db: Session, current_student: User, payload) -> LearningRequest:
    if current_student.status == "suspended":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Suspended users cannot create instant requests.")

    request = LearningRequest(
        student_id=current_student.id,
        title=payload.title,
        subject=payload.subject,
        description=payload.description,
        level=payload.skill_level,
        request_type="instant",
        session_mode=payload.session_mode or "individual",
        session_type=payload.session_type or "online",
        base_price=payload.budget,
        final_price_per_student=payload.budget,
        urgency_level=payload.urgency_level,
        status=INSTANT_OPEN_STATUS,
        expires_at=now_utc() + timedelta(minutes=payload.expires_in_minutes or 30),
    )
    db.add(request)
    db.flush()

    create_notifications(
        db,
        available_instructor_ids(db),
        type="instant_request_created",
        title="New instant request",
        message=f"A student needs urgent help with {request.subject or request.title}.",
        link_url=f"/instructor/instant-requests/{request.id}",
    )
    return request


def expire_old_instant_requests(db: Session) -> int:
    expired_requests = db.scalars(
        select(LearningRequest).where(
            LearningRequest.request_type == "instant",
            LearningRequest.status == INSTANT_OPEN_STATUS,
            LearningRequest.expires_at.is_not(None),
            LearningRequest.expires_at <= now_utc(),
        )
    ).all()
    for request in expired_requests:
        request.status = "expired"
        create_notification(
            db,
            user_id=request.student_id,
            type="instant_request_expired",
            title="Instant request expired",
            message="Your instant request expired without being accepted.",
            link_url=f"/student/instant-requests/{request.id}",
        )
    return len(expired_requests)


def accept_instant_request(db: Session, request_id: int, current_instructor: User) -> tuple[LearningRequest, LearningSession]:
    request = db.scalar(
        select(LearningRequest)
        .where(LearningRequest.id == request_id)
        .with_for_update()
        .options(
            selectinload(LearningRequest.student),
            selectinload(LearningRequest.accepted_instructor),
            selectinload(LearningRequest.sessions),
        )
    )
    if request is None or request.request_type != "instant":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Instant request not found.")

    can_instructor_accept_instant_request(db, current_instructor, request)

    if is_instant_request_expired(request):
        request.status = "expired"
        create_notification(
            db,
            user_id=request.student_id,
            type="instant_request_expired",
            title="Instant request expired",
            message="Your instant request expired without being accepted.",
            link_url=f"/student/instant-requests/{request.id}",
        )
        db.commit()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This instant request has expired.")
    if request.status != INSTANT_OPEN_STATUS or request.accepted_instructor_id is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This instant request has already been accepted by another instructor.",
        )

    accepted_at = now_utc()
    request.status = "waiting_payment"
    request.accepted_instructor_id = current_instructor.id
    request.accepted_at = accepted_at

    application = db.scalar(
        select(Application).where(
            Application.request_id == request.id,
            Application.instructor_id == current_instructor.id,
        )
    )
    if application is None:
        application = Application(
            request_id=request.id,
            instructor_id=current_instructor.id,
            message="Accepted instant request.",
            proposed_price=request.final_price_per_student or request.base_price or Decimal("0.00"),
            status="accepted",
        )
        db.add(application)
    else:
        application.status = "accepted"

    session = LearningSession(
        request_id=request.id,
        student_id=request.student_id,
        instructor_id=current_instructor.id,
        session_mode=request.session_mode,
        session_type=request.session_type,
        scheduled_at=accepted_at,
        status="waiting_payment",
    )
    db.add(session)
    db.flush()

    create_notification(
        db,
        user_id=request.student_id,
        type="instant_request_accepted",
        title="Instant request accepted",
        message=f"{current_instructor.full_name} accepted your instant request.",
        link_url=f"/student/instant-requests/{request.id}",
    )
    create_notification(
        db,
        user_id=current_instructor.id,
        type="instant_request_accepted",
        title="Instant request accepted",
        message="You accepted an instant request. The student can now complete payment.",
        link_url=f"/instructor/sessions/{session.id}",
    )
    return request, session


def cancel_instant_request(db: Session, request: LearningRequest) -> LearningRequest:
    held_payment = db.scalar(
        select(Payment.id).where(
            Payment.request_id == request.id,
            Payment.status.in_(["held", "released"]),
        )
    )
    if held_payment is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This request has a held payment. Please contact support or use the existing cancellation/refund flow.",
        )
    if request.status in {"paid", "in_session", "completed"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Paid or completed instant requests cannot be cancelled here.")

    request.status = "cancelled"
    for session in request.sessions:
        if session.status != "completed":
            session.status = "cancelled"

    if request.accepted_instructor_id is not None:
        create_notification(
            db,
            user_id=request.accepted_instructor_id,
            type="instant_request_cancelled",
            title="Instant request cancelled",
            message="The student cancelled the instant request.",
            link_url="/instructor/instant-requests",
        )
    return request
