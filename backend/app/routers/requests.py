from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.dependencies.auth import get_current_user, require_roles
from app.models import Application, LearningRequest, Payment, Session as LearningSession, User
from app.schemas.application_schema import ApplicationResponse
from app.schemas.request_schema import RequestCreate, RequestDetailResponse, RequestResponse, RequestUpdate
from app.services.notification_service import create_notifications

router = APIRouter(prefix="/requests", tags=["requests"])

PAYMENT_SUCCESS_STATES = {"paid", "held", "released"}
REQUEST_TERMINAL_STATES = {"completed", "paid"}


@router.get("/ping")
def ping() -> dict[str, str]:
    return {"router": "requests", "status": "ok"}


def to_request_response(request: LearningRequest) -> RequestResponse:
    return RequestResponse.model_validate(request).model_copy(
        update={
            "student_name": request.student.full_name if request.student else None,
            "accepted_instructor_name": request.accepted_instructor.full_name if request.accepted_instructor else None,
            "applications_count": len(request.applications or []),
        }
    )


def to_request_detail(request: LearningRequest) -> RequestDetailResponse:
    applications = [
        ApplicationResponse.model_validate(application).model_copy(
            update={
                "instructor_name": application.instructor.full_name if application.instructor else None,
                "instructor_specialization": (
                    application.instructor.instructor_profile.specialization
                    if application.instructor and application.instructor.instructor_profile
                    else None
                ),
                "instructor_rating": (
                    application.instructor.instructor_profile.rating
                    if application.instructor and application.instructor.instructor_profile
                    else None
                ),
                "request_title": request.title,
                "student_name": request.student.full_name if request.student else None,
            }
        )
        for application in request.applications
    ]
    base = to_request_response(request)
    return RequestDetailResponse(**base.model_dump(), applications=applications)


def get_request_or_404(db: Session, request_id: int) -> LearningRequest:
    request = db.scalar(
        select(LearningRequest)
        .where(LearningRequest.id == request_id)
        .options(
            selectinload(LearningRequest.student),
            selectinload(LearningRequest.accepted_instructor),
            selectinload(LearningRequest.applications).selectinload(Application.instructor).selectinload(User.instructor_profile),
        )
    )
    if request is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found.")
    return request


def get_request_for_cancel_or_404(db: Session, request_id: int) -> LearningRequest:
    request = db.scalar(
        select(LearningRequest)
        .where(LearningRequest.id == request_id)
        .with_for_update()
        .options(
            selectinload(LearningRequest.student),
            selectinload(LearningRequest.accepted_instructor),
            selectinload(LearningRequest.applications).selectinload(Application.instructor).selectinload(User.instructor_profile),
            selectinload(LearningRequest.payments),
            selectinload(LearningRequest.sessions).selectinload(LearningSession.payments),
        )
    )
    if request is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found.")
    return request


def cancel_normal_request(db: Session, request_id: int, current_user: User) -> RequestResponse:
    request = get_request_for_cancel_or_404(db, request_id)

    if request.student_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not allowed to cancel this request.")
    if request.request_type != "normal":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only normal requests can be cancelled from this endpoint.")
    if request.status == "cancelled":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Request is already cancelled.")
    if request.status in REQUEST_TERMINAL_STATES:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Completed or paid requests cannot be cancelled.")

    sessions = db.scalars(
        select(LearningSession)
        .where(LearningSession.request_id == request.id)
        .with_for_update()
    ).all()
    all_payments = db.scalars(
        select(Payment)
        .where(Payment.request_id == request.id)
        .with_for_update()
    ).all()
    if any(payment.status in PAYMENT_SUCCESS_STATES for payment in all_payments):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This request cannot be cancelled because payment has already been completed.",
        )

    for payment in all_payments:
        if payment.status == "pending":
            payment.status = "cancelled"

    for session in sessions:
        if session.status not in {"completed", "cancelled", "disputed"}:
            session.status = "cancelled"

    request.status = "cancelled"

    instructor_ids = {application.instructor_id for application in request.applications or []}
    create_notifications(
        db,
        instructor_ids,
        type="request_cancelled",
        title="Request Cancelled",
        message=f'The student cancelled the request "{request.title}" that you applied to.',
        link_url=f"/instructor/requests/{request.id}",
    )

    db.commit()
    db.refresh(request)
    return to_request_response(get_request_or_404(db, request.id))


@router.post("", response_model=RequestResponse, status_code=status.HTTP_201_CREATED)
def create_request(
    payload: RequestCreate,
    current_user: User = Depends(require_roles(["student"])),
    db: Session = Depends(get_db),
) -> RequestResponse:
    request = LearningRequest(
        student_id=current_user.id,
        title=payload.title,
        subject=payload.subject,
        description=payload.description,
        level=payload.level,
        request_type=payload.request_type or "normal",
        session_mode=payload.session_mode or "individual",
        session_type=payload.session_type or "online",
        preferred_datetime=payload.preferred_datetime,
        base_price=payload.base_price,
        discount_per_extra_student=payload.discount_per_extra_student,
        minimum_price=payload.minimum_price,
        final_price_per_student=payload.final_price_per_student or payload.base_price,
        max_students=payload.max_students,
        max_participants=payload.max_participants,
        min_participants=payload.min_participants,
        min_price_per_student=payload.min_price_per_student,
        current_price_per_student=payload.current_price_per_student,
        expires_at=payload.expires_at,
        status="open",
    )
    db.add(request)
    db.commit()
    db.refresh(request)
    return to_request_response(get_request_or_404(db, request.id))


@router.get("/my", response_model=list[RequestResponse])
def get_my_requests(
    current_user: User = Depends(require_roles(["student"])),
    db: Session = Depends(get_db),
) -> list[RequestResponse]:
    requests = db.scalars(
        select(LearningRequest)
        .where(LearningRequest.student_id == current_user.id)
        .order_by(LearningRequest.created_at.desc())
        .options(
            selectinload(LearningRequest.student),
            selectinload(LearningRequest.accepted_instructor),
            selectinload(LearningRequest.applications),
        )
    ).all()
    return [to_request_response(request) for request in requests]


@router.get("", response_model=list[RequestResponse])
def get_requests(
    subject: str | None = Query(default=None),
    status_filter: str | None = Query(default=None, alias="status"),
    current_user: User = Depends(require_roles(["instructor", "admin"])),
    db: Session = Depends(get_db),
) -> list[RequestResponse]:
    query = select(LearningRequest).where(LearningRequest.request_type.in_(["normal", "group"]))
    query = query.where(LearningRequest.status == (status_filter or "open"))
    if subject:
        query = query.where(LearningRequest.subject.ilike(f"%{subject}%"))

    requests = db.scalars(
        query.order_by(LearningRequest.created_at.desc()).options(
            selectinload(LearningRequest.student),
            selectinload(LearningRequest.accepted_instructor),
            selectinload(LearningRequest.applications),
        )
    ).all()
    return [to_request_response(request) for request in requests]


@router.get("/{request_id}", response_model=RequestDetailResponse)
def get_request(
    request_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> RequestDetailResponse:
    request = get_request_or_404(db, request_id)

    if current_user.role == "student" and request.student_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only view your own requests.")

    if current_user.role == "instructor":
        has_applied = any(application.instructor_id == current_user.id for application in request.applications)
        if request.status != "open" and not has_applied and request.accepted_instructor_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You cannot view this request.")

    return to_request_detail(request)


@router.put("/{request_id}", response_model=RequestResponse)
def update_request(
    request_id: int,
    payload: RequestUpdate,
    current_user: User = Depends(require_roles(["student"])),
    db: Session = Depends(get_db),
) -> RequestResponse:
    request = get_request_or_404(db, request_id)
    if request.student_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only update your own requests.")
    if request.status != "open":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only open requests can be updated.")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(request, field, value)

    db.commit()
    db.refresh(request)
    return to_request_response(get_request_or_404(db, request.id))


@router.delete("/{request_id}", response_model=RequestResponse)
def delete_request(
    request_id: int,
    current_user: User = Depends(require_roles(["student"])),
    db: Session = Depends(get_db),
) -> RequestResponse:
    return cancel_normal_request(db, request_id, current_user)


@router.post("/{request_id}/cancel", response_model=RequestResponse)
def cancel_request(
    request_id: int,
    current_user: User = Depends(require_roles(["student"])),
    db: Session = Depends(get_db),
) -> RequestResponse:
    return cancel_normal_request(db, request_id, current_user)
