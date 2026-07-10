from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.dependencies.admin import require_admin_user
from app.models import Application, InstructorProfile, InstructorWallet, LearningRequest, Payment, Review
from app.models import Session as LearningSession
from app.models import User
from app.schemas.admin_schema import (
    AdminInstructorProfileSummary,
    AdminPaymentListItem,
    AdminRequestListItem,
    AdminReviewListItem,
    AdminRejectInstructorRequest,
    AdminSessionListItem,
    AdminStatsResponse,
    AdminStudentProfileSummary,
    AdminSuspendUserRequest,
    AdminUserListItem,
)
from app.services.payment_service import refund_held_payment, release_held_payment
from app.services.notification_service import create_notification
from app.services.review_service import recalculate_instructor_rating

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/ping")
def ping() -> dict[str, str]:
    return {"router": "admin", "status": "ok"}


def count_where(db: Session, model: type, *criteria: object) -> int:
    statement = select(func.count()).select_from(model)
    if criteria:
        statement = statement.where(*criteria)
    return db.scalar(statement) or 0


def sum_decimal(db: Session, column: object) -> Decimal:
    return db.scalar(select(func.coalesce(func.sum(column), 0))) or Decimal("0")


def serialize_admin_user(user: User) -> AdminUserListItem:
    return AdminUserListItem(
        id=user.id,
        full_name=user.full_name,
        email=user.email,
        role=user.role,
        status=user.status,
        created_at=user.created_at,
        student_profile=AdminStudentProfileSummary(
            education_level=user.student_profile.education_level,
            phone=user.student_profile.phone,
        )
        if user.student_profile
        else None,
        instructor_profile=AdminInstructorProfileSummary(
            specialization=user.instructor_profile.specialization,
            rating=user.instructor_profile.rating,
            verification_status=user.instructor_profile.verification_status,
            price_per_session=user.instructor_profile.price_per_session,
        )
        if user.instructor_profile
        else None,
    )


def serialize_admin_payment(payment: Payment) -> AdminPaymentListItem:
    return AdminPaymentListItem(
        id=payment.id,
        session_id=payment.session_id,
        request_id=payment.request_id,
        student_id=payment.student_id,
        student_name=payment.student.full_name if payment.student else None,
        instructor_id=payment.instructor_id,
        instructor_name=payment.instructor.full_name if payment.instructor else None,
        amount=payment.amount,
        platform_fee=payment.platform_fee,
        total_amount=payment.total_amount,
        status=payment.status,
        payment_method=payment.payment_method,
        paid_at=payment.paid_at,
        released_at=payment.released_at,
        refunded_at=payment.refunded_at,
        created_at=payment.created_at,
    )


def serialize_admin_review(review: Review) -> AdminReviewListItem:
    return AdminReviewListItem(
        id=review.id,
        session_id=review.session_id,
        student_id=review.student_id,
        student_name=review.student.full_name if review.student else None,
        instructor_id=review.instructor_id,
        instructor_name=review.instructor.full_name if review.instructor else None,
        rating=review.rating,
        comment=review.comment,
        status=review.status,
        created_at=review.created_at,
    )


def get_admin_user_or_404(db: Session, user_id: int) -> User:
    user = db.scalar(
        select(User)
        .where(User.id == user_id)
        .options(selectinload(User.student_profile), selectinload(User.instructor_profile))
    )
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    return user


def get_instructor_or_404(db: Session, instructor_id: int) -> User:
    user = get_admin_user_or_404(db, instructor_id)
    if user.role != "instructor":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Target user is not an instructor.")
    if user.instructor_profile is None:
        profile = InstructorProfile(user_id=user.id)
        db.add(profile)
        db.flush()
        db.refresh(user)
    return user


def get_payment_or_404(db: Session, payment_id: int) -> Payment:
    payment = db.scalar(
        select(Payment)
        .where(Payment.id == payment_id)
        .options(selectinload(Payment.student), selectinload(Payment.instructor), selectinload(Payment.session), selectinload(Payment.request))
    )
    if payment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found.")
    return payment


@router.get("/stats", response_model=AdminStatsResponse)
def get_admin_stats(
    current_user: User = Depends(require_admin_user),
    db: Session = Depends(get_db),
) -> AdminStatsResponse:
    average_rating = db.scalar(select(func.coalesce(func.avg(Review.rating), 0))) or 0
    return AdminStatsResponse(
        total_users=count_where(db, User),
        total_students=count_where(db, User, User.role == "student"),
        total_instructors=count_where(db, User, User.role == "instructor"),
        total_admins=count_where(db, User, User.role == "admin"),
        suspended_users=count_where(db, User, User.status == "suspended"),
        total_requests=count_where(db, LearningRequest),
        open_requests=count_where(db, LearningRequest, LearningRequest.status == "open"),
        waiting_payment_requests=count_where(db, LearningRequest, LearningRequest.status == "waiting_payment"),
        completed_requests=count_where(db, LearningRequest, LearningRequest.status == "completed"),
        cancelled_requests=count_where(db, LearningRequest, LearningRequest.status == "cancelled"),
        total_applications=count_where(db, Application),
        pending_applications=count_where(db, Application, Application.status == "pending"),
        accepted_applications=count_where(db, Application, Application.status == "accepted"),
        rejected_applications=count_where(db, Application, Application.status == "rejected"),
        total_sessions=count_where(db, LearningSession),
        ready_sessions=count_where(db, LearningSession, LearningSession.status == "ready"),
        active_sessions=count_where(db, LearningSession, LearningSession.status == "active"),
        completed_sessions=count_where(db, LearningSession, LearningSession.status == "completed"),
        cancelled_sessions=count_where(db, LearningSession, LearningSession.status == "cancelled"),
        total_payments=count_where(db, Payment),
        held_payments=count_where(db, Payment, Payment.status == "held"),
        released_payments=count_where(db, Payment, Payment.status == "released"),
        refunded_payments=count_where(db, Payment, Payment.status == "refunded"),
        total_reviews=count_where(db, Review),
        average_platform_rating=round(float(average_rating), 2),
        total_wallet_pending_balance=sum_decimal(db, InstructorWallet.pending_balance),
        total_wallet_available_balance=sum_decimal(db, InstructorWallet.available_balance),
        total_platform_revenue=sum_decimal(db, Payment.platform_fee),
    )


@router.get("/users", response_model=list[AdminUserListItem])
def list_admin_users(
    role: str | None = Query(default=None, pattern="^(student|instructor|admin)$"),
    search: str | None = Query(default=None, max_length=120),
    status: str | None = Query(default=None, pattern="^(active|suspended|pending)$"),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(require_admin_user),
    db: Session = Depends(get_db),
) -> list[AdminUserListItem]:
    statement = select(User).options(selectinload(User.student_profile), selectinload(User.instructor_profile))
    if role:
        statement = statement.where(User.role == role)
    if status:
        statement = statement.where(User.status == status)
    if search:
        term = f"%{search.strip()}%"
        statement = statement.where(or_(User.full_name.ilike(term), User.email.ilike(term)))

    users = db.scalars(statement.order_by(User.created_at.desc()).offset(offset).limit(limit)).all()
    return [serialize_admin_user(user) for user in users]


@router.put("/instructors/{instructor_id}/verify", response_model=AdminUserListItem)
def verify_instructor(
    instructor_id: int,
    current_user: User = Depends(require_admin_user),
    db: Session = Depends(get_db),
) -> AdminUserListItem:
    instructor = get_instructor_or_404(db, instructor_id)
    if instructor.instructor_profile is not None:
        instructor.instructor_profile.verification_status = "verified"
    create_notification(
        db,
        user_id=instructor.id,
        type="instructor_verified",
        title="Instructor profile verified",
        message="Your instructor profile has been verified.",
        link_url="/instructor/profile",
    )
    db.commit()
    db.refresh(instructor)
    return serialize_admin_user(instructor)


@router.put("/instructors/{instructor_id}/reject", response_model=AdminUserListItem)
def reject_instructor(
    instructor_id: int,
    payload: AdminRejectInstructorRequest | None = None,
    current_user: User = Depends(require_admin_user),
    db: Session = Depends(get_db),
) -> AdminUserListItem:
    instructor = get_instructor_or_404(db, instructor_id)
    if instructor.instructor_profile is not None:
        instructor.instructor_profile.verification_status = "rejected"
    create_notification(
        db,
        user_id=instructor.id,
        type="instructor_rejected",
        title="Instructor verification rejected",
        message="Your instructor verification was rejected. Please review your profile.",
        link_url="/instructor/profile",
    )
    db.commit()
    db.refresh(instructor)
    return serialize_admin_user(instructor)


@router.put("/users/{user_id}/suspend", response_model=AdminUserListItem)
def suspend_user(
    user_id: int,
    payload: AdminSuspendUserRequest | None = None,
    current_user: User = Depends(require_admin_user),
    db: Session = Depends(get_db),
) -> AdminUserListItem:
    if user_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot suspend your own account.")
    user = get_admin_user_or_404(db, user_id)
    user.status = "suspended"
    create_notification(
        db,
        user_id=user.id,
        type="user_suspended",
        title="Account suspended",
        message="Your account has been suspended by admin.",
        link_url="/login",
    )
    db.commit()
    db.refresh(user)
    return serialize_admin_user(user)


@router.put("/users/{user_id}/activate", response_model=AdminUserListItem)
def activate_user(
    user_id: int,
    current_user: User = Depends(require_admin_user),
    db: Session = Depends(get_db),
) -> AdminUserListItem:
    user = get_admin_user_or_404(db, user_id)
    user.status = "active"
    dashboard_path = f"/{user.role}/dashboard" if user.role in {"student", "instructor", "admin"} else "/dashboard"
    create_notification(
        db,
        user_id=user.id,
        type="user_activated",
        title="Account activated",
        message="Your account has been activated again.",
        link_url=dashboard_path,
    )
    db.commit()
    db.refresh(user)
    return serialize_admin_user(user)


@router.get("/requests", response_model=list[AdminRequestListItem])
def list_admin_requests(
    status: str | None = Query(default=None, max_length=32),
    search: str | None = Query(default=None, max_length=120),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(require_admin_user),
    db: Session = Depends(get_db),
) -> list[AdminRequestListItem]:
    statement = select(LearningRequest).options(
        selectinload(LearningRequest.student),
        selectinload(LearningRequest.accepted_instructor),
        selectinload(LearningRequest.applications),
        selectinload(LearningRequest.sessions),
    )
    if status:
        statement = statement.where(LearningRequest.status == status)
    if search:
        term = f"%{search.strip()}%"
        statement = statement.where(
            or_(
                LearningRequest.title.ilike(term),
                LearningRequest.subject.ilike(term),
                LearningRequest.description.ilike(term),
            )
        )

    requests = db.scalars(statement.order_by(LearningRequest.created_at.desc()).offset(offset).limit(limit)).all()
    return [
        AdminRequestListItem(
            id=request.id,
            student_id=request.student_id,
            student_name=request.student.full_name if request.student else None,
            title=request.title,
            subject=request.subject,
            description_preview=request.description[:180],
            request_type=request.request_type,
            status=request.status,
            budget=request.base_price,
            created_at=request.created_at,
            applications_count=len(request.applications),
            session_id=request.sessions[0].id if request.sessions else None,
            expires_at=request.expires_at,
            accepted_instructor_id=request.accepted_instructor_id,
            accepted_instructor_name=request.accepted_instructor.full_name if request.accepted_instructor else None,
        )
        for request in requests
    ]


@router.get("/sessions", response_model=list[AdminSessionListItem])
def list_admin_sessions(
    status: str | None = Query(default=None, max_length=32),
    search: str | None = Query(default=None, max_length=120),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(require_admin_user),
    db: Session = Depends(get_db),
) -> list[AdminSessionListItem]:
    statement = select(LearningSession).options(
        selectinload(LearningSession.request),
        selectinload(LearningSession.student),
        selectinload(LearningSession.instructor),
        selectinload(LearningSession.payments),
    )
    if status:
        statement = statement.where(LearningSession.status == status)
    if search:
        term = f"%{search.strip()}%"
        statement = statement.join(LearningSession.request).where(LearningRequest.title.ilike(term))

    sessions = db.scalars(statement.order_by(LearningSession.created_at.desc()).offset(offset).limit(limit)).all()
    return [
        AdminSessionListItem(
            id=session.id,
            request_id=session.request_id,
            request_title=session.request.title if session.request else None,
            request_type=session.request.request_type if session.request else None,
            request_expires_at=session.request.expires_at if session.request else None,
            student_id=session.student_id,
            student_name=session.student.full_name if session.student else None,
            instructor_id=session.instructor_id,
            instructor_name=session.instructor.full_name if session.instructor else None,
            status=session.status,
            scheduled_at=session.scheduled_at,
            started_at=session.started_at,
            ended_at=session.ended_at,
            completed_at=session.completed_at,
            payment_status=max(session.payments, key=lambda item: (item.created_at, item.id)).status if session.payments else None,
            created_at=session.created_at,
        )
        for session in sessions
    ]


@router.get("/payments", response_model=list[AdminPaymentListItem])
def list_admin_payments(
    status: str | None = Query(default=None, max_length=32),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(require_admin_user),
    db: Session = Depends(get_db),
) -> list[AdminPaymentListItem]:
    statement = select(Payment).options(selectinload(Payment.student), selectinload(Payment.instructor))
    if status:
        statement = statement.where(Payment.status == status)

    payments = db.scalars(statement.order_by(Payment.created_at.desc()).offset(offset).limit(limit)).all()
    return [serialize_admin_payment(payment) for payment in payments]


@router.post("/payments/{payment_id}/refund", response_model=AdminPaymentListItem)
def refund_admin_payment(
    payment_id: int,
    current_user: User = Depends(require_admin_user),
    db: Session = Depends(get_db),
) -> AdminPaymentListItem:
    payment = get_payment_or_404(db, payment_id)
    if payment.status != "held":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only held payments can be refunded.")
    refund_held_payment(db, payment)
    if payment.session is not None and payment.session.status not in {"completed", "cancelled"}:
        payment.session.status = "cancelled"
    if payment.request is not None and payment.request.status not in {"completed", "cancelled"}:
        payment.request.status = "cancelled"
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
    return serialize_admin_payment(payment)


@router.post("/payments/{payment_id}/release", response_model=AdminPaymentListItem)
def release_admin_payment(
    payment_id: int,
    current_user: User = Depends(require_admin_user),
    db: Session = Depends(get_db),
) -> AdminPaymentListItem:
    payment = get_payment_or_404(db, payment_id)
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
    return serialize_admin_payment(payment)


@router.get("/reviews", response_model=list[AdminReviewListItem])
def list_admin_reviews(
    instructor_id: int | None = None,
    student_id: int | None = None,
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(require_admin_user),
    db: Session = Depends(get_db),
) -> list[AdminReviewListItem]:
    statement = select(Review).options(selectinload(Review.student), selectinload(Review.instructor))
    if instructor_id is not None:
        statement = statement.where(Review.instructor_id == instructor_id)
    if student_id is not None:
        statement = statement.where(Review.student_id == student_id)

    reviews = db.scalars(statement.order_by(Review.created_at.desc()).offset(offset).limit(limit)).all()
    return [serialize_admin_review(review) for review in reviews]


@router.put("/reviews/{review_id}/hide", response_model=AdminReviewListItem)
def hide_review(
    review_id: int,
    current_user: User = Depends(require_admin_user),
    db: Session = Depends(get_db),
) -> AdminReviewListItem:
    review = db.scalar(
        select(Review)
        .where(Review.id == review_id)
        .options(selectinload(Review.student), selectinload(Review.instructor))
    )
    if review is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found.")
    review.status = "hidden"
    recalculate_instructor_rating(db, review.instructor_id)
    db.commit()
    db.refresh(review)
    return serialize_admin_review(review)


@router.put("/reviews/{review_id}/show", response_model=AdminReviewListItem)
def show_review(
    review_id: int,
    current_user: User = Depends(require_admin_user),
    db: Session = Depends(get_db),
) -> AdminReviewListItem:
    review = db.scalar(
        select(Review)
        .where(Review.id == review_id)
        .options(selectinload(Review.student), selectinload(Review.instructor))
    )
    if review is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found.")
    review.status = "visible"
    recalculate_instructor_rating(db, review.instructor_id)
    db.commit()
    db.refresh(review)
    return serialize_admin_review(review)
