from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.dependencies.auth import require_roles
from app.models import Application, GroupParticipant, LearningRequest, Session as LearningSession, User
from app.schemas.application_schema import ApplicationCreate, ApplicationDecisionResponse, ApplicationResponse
from app.schemas.session_schema import SessionResponse
from app.services.group_request_service import get_active_participants, lock_group_request_price
from app.services.notification_service import create_notification, create_notifications

router = APIRouter(prefix="/applications", tags=["applications"])


@router.get("/ping")
def ping() -> dict[str, str]:
    return {"router": "applications", "status": "ok"}


def to_application_response(application: Application) -> ApplicationResponse:
    return ApplicationResponse.model_validate(application).model_copy(
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
            "request_title": application.request.title if application.request else None,
            "student_name": application.request.student.full_name if application.request and application.request.student else None,
        }
    )


def to_session_response(session: LearningSession) -> SessionResponse:
    return SessionResponse.model_validate(session).model_copy(
        update={
            "request_title": session.request.title if session.request else None,
            "student_name": session.student.full_name if session.student else None,
            "instructor_name": session.instructor.full_name if session.instructor else None,
        }
    )


def get_application_or_404(db: Session, application_id: int) -> Application:
    application = db.scalar(
        select(Application)
        .where(Application.id == application_id)
        .options(
            selectinload(Application.instructor).selectinload(User.instructor_profile),
            selectinload(Application.request).selectinload(LearningRequest.student),
        )
    )
    if application is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found.")
    return application


@router.post("", response_model=ApplicationResponse, status_code=status.HTTP_201_CREATED)
def apply_to_request(
    payload: ApplicationCreate,
    current_user: User = Depends(require_roles(["instructor"])),
    db: Session = Depends(get_db),
) -> ApplicationResponse:
    request = db.scalar(select(LearningRequest).where(LearningRequest.id == payload.request_id))
    if request is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found.")
    if request.status != "open":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only open requests accept applications.")
    if request.student_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot apply to your own request.")

    existing = db.scalar(
        select(Application).where(
            Application.request_id == payload.request_id,
            Application.instructor_id == current_user.id,
        )
    )
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="You already applied to this request.")

    application = Application(
        request_id=payload.request_id,
        instructor_id=current_user.id,
        message=payload.message,
        proposed_price=payload.proposed_price,
        status="pending",
    )
    db.add(application)
    create_notification(
        db,
        user_id=request.student_id,
        type="application_received",
        title="New instructor application",
        message=f"{current_user.full_name} applied to your request.",
        link_url=f"/student/group-requests/{request.id}" if request.request_type == "group" else f"/student/requests/{request.id}",
    )
    db.commit()
    db.refresh(application)
    return to_application_response(get_application_or_404(db, application.id))


@router.get("/my", response_model=list[ApplicationResponse])
def get_my_applications(
    current_user: User = Depends(require_roles(["instructor"])),
    db: Session = Depends(get_db),
) -> list[ApplicationResponse]:
    applications = db.scalars(
        select(Application)
        .where(Application.instructor_id == current_user.id)
        .order_by(Application.created_at.desc())
        .options(
            selectinload(Application.instructor).selectinload(User.instructor_profile),
            selectinload(Application.request).selectinload(LearningRequest.student),
        )
    ).all()
    return [to_application_response(application) for application in applications]


@router.get("/request/{request_id}", response_model=list[ApplicationResponse])
def get_applications_for_request(
    request_id: int,
    current_user: User = Depends(require_roles(["student"])),
    db: Session = Depends(get_db),
) -> list[ApplicationResponse]:
    request = db.scalar(select(LearningRequest).where(LearningRequest.id == request_id))
    if request is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found.")
    if request.student_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only view applications for your own request.")

    applications = db.scalars(
        select(Application)
        .where(Application.request_id == request_id)
        .order_by(Application.created_at.desc())
        .options(
            selectinload(Application.instructor).selectinload(User.instructor_profile),
            selectinload(Application.request).selectinload(LearningRequest.student),
        )
    ).all()
    return [to_application_response(application) for application in applications]


@router.put("/{application_id}/accept", response_model=ApplicationDecisionResponse)
def accept_application(
    application_id: int,
    current_user: User = Depends(require_roles(["student"])),
    db: Session = Depends(get_db),
) -> ApplicationDecisionResponse:
    application = get_application_or_404(db, application_id)
    request = application.request
    if request.student_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only accept applications for your own request.")
    if request.status != "open":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only open requests can accept applications.")

    all_applications = db.scalars(select(Application).where(Application.request_id == request.id)).all()
    for item in all_applications:
        item.status = "accepted" if item.id == application.id else "rejected"

    request.status = "waiting_payment"
    request.accepted_instructor_id = application.instructor_id
    if request.request_type == "group":
        lock_group_request_price(db, request)
    session = LearningSession(
        request_id=request.id,
        student_id=request.student_id,
        instructor_id=application.instructor_id,
        session_mode=request.session_mode,
        session_type=request.session_type,
        scheduled_at=request.preferred_datetime,
        status="waiting_payment",
    )
    db.add(session)
    db.flush()
    create_notification(
        db,
        user_id=application.instructor_id,
        type="application_accepted",
        title="Application accepted",
        message="Your application was accepted. A session has been created.",
        link_url=f"/instructor/sessions/{session.id}",
    )
    if request.request_type == "group":
        participants = get_active_participants(db, request.id)
        create_notifications(
            db,
            [participant.student_id for participant in participants],
            type="group_instructor_accepted",
            title="Instructor accepted for group request",
            message="An instructor was accepted for your group request. Please pay your share.",
            link_url=f"/student/group-requests/{request.id}",
        )
    db.commit()
    db.refresh(application)
    db.refresh(session)
    application = get_application_or_404(db, application.id)
    session = db.scalar(
        select(LearningSession)
        .where(LearningSession.id == session.id)
        .options(
            selectinload(LearningSession.request),
            selectinload(LearningSession.student),
            selectinload(LearningSession.instructor),
        )
    )
    return ApplicationDecisionResponse(application=to_application_response(application), session=to_session_response(session))


@router.put("/{application_id}/reject", response_model=ApplicationResponse)
def reject_application(
    application_id: int,
    current_user: User = Depends(require_roles(["student"])),
    db: Session = Depends(get_db),
) -> ApplicationResponse:
    application = get_application_or_404(db, application_id)
    if application.request.student_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only reject applications for your own request.")
    if application.request.status != "open":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only open requests can reject applications.")

    application.status = "rejected"
    create_notification(
        db,
        user_id=application.instructor_id,
        type="application_rejected",
        title="Application rejected",
        message="Your application was not selected for this request.",
        link_url="/instructor/dashboard",
    )
    db.commit()
    db.refresh(application)
    return to_application_response(get_application_or_404(db, application.id))
