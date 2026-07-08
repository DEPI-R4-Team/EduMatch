import logging
from datetime import datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.dependencies.auth import get_current_user, require_roles
from app.models import Application, GroupParticipant, LearningRequest, Payment, Session as LearningSession, User, WalletTransaction
from app.schemas.application_schema import ApplicationResponse
from app.schemas.group_request_schema import (
    GroupJoinResponse,
    GroupParticipantResponse,
    GroupPaymentResponse,
    GroupPricePreviewResponse,
    GroupRequestCreate,
    GroupRequestResponse,
)
from app.config import settings
from app.schemas.payment_schema import CreatePaymentIntentionResponse, PaymentResponse, SimulatePaymentRequest
from app.services import paymob_service
from app.services.group_request_service import (
    add_group_owner_as_participant,
    all_active_participants_paid,
    calculate_group_price,
    can_student_join_group_request,
    ensure_group_participant,
    get_active_participants,
    get_group_request_or_404,
    mark_participant_left,
    update_group_request_price,
)
from app.services.notification_service import create_notification, create_notifications
from app.services.payment_service import get_or_create_wallet

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/group-requests", tags=["group requests"])

PLATFORM_FEE_RATE = Decimal("0.10")


def participant_response(participant: GroupParticipant) -> GroupParticipantResponse:
    return GroupParticipantResponse.model_validate(participant).model_copy(
        update={"student_name": participant.student.full_name if participant.student else None}
    )


def application_response(application: Application, request: LearningRequest) -> ApplicationResponse:
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
            "request_title": request.title,
            "student_name": request.student.full_name if request.student else None,
        }
    )


def group_response(db: Session, request: LearningRequest, current_user: User | None = None, include_applications: bool = False) -> GroupRequestResponse:
    participants = get_active_participants(db, request.id)
    active_count = len(participants)
    paid_count = sum(1 for participant in participants if participant.payment_status in {"held", "released"})
    price_locked = request.status != "open" and request.final_price_per_student is not None
    price_if_join = None
    if not price_locked and request.base_price is not None and (request.min_price_per_student or request.minimum_price) is not None:
        price_if_join = calculate_group_price(
            request.base_price,
            request.min_price_per_student or request.minimum_price or Decimal("0"),
            active_count + 1,
        )

    current_user_participant = None
    if current_user is not None:
        current_user_participant = next((item for item in participants if item.student_id == current_user.id), None)

    session_id = request.sessions[0].id if request.sessions else None
    applications: list[ApplicationResponse] = []
    if include_applications:
        apps = db.scalars(
            select(Application)
            .where(Application.request_id == request.id)
            .order_by(Application.created_at.desc())
            .options(selectinload(Application.instructor).selectinload(User.instructor_profile))
        ).all()
        applications = [application_response(app, request) for app in apps]

    return GroupRequestResponse(
        id=request.id,
        student_id=request.student_id,
        group_owner_id=request.group_owner_id,
        owner_name=request.group_owner.full_name if request.group_owner else request.student.full_name if request.student else None,
        title=request.title,
        subject=request.subject,
        description=request.description,
        level=request.level,
        request_type=request.request_type,
        session_mode=request.session_mode,
        session_type=request.session_type,
        preferred_datetime=request.preferred_datetime,
        base_price=request.base_price,
        min_price_per_student=request.min_price_per_student or request.minimum_price,
        current_price_per_student=request.current_price_per_student or request.final_price_per_student,
        final_price_per_student=request.final_price_per_student,
        price_locked=price_locked,
        max_participants=request.max_participants or request.max_students,
        min_participants=request.min_participants,
        active_participants_count=active_count,
        price_if_you_join=price_if_join,
        paid_participants_count=paid_count,
        total_required_participants=active_count,
        fully_funded=bool(participants) and paid_count == active_count,
        current_user_payment_status=current_user_participant.payment_status if current_user_participant else None,
        status=request.status,
        accepted_instructor_id=request.accepted_instructor_id,
        accepted_instructor_name=request.accepted_instructor.full_name if request.accepted_instructor else None,
        session_id=session_id,
        current_user_participant=participant_response(current_user_participant) if current_user_participant else None,
        participants=[participant_response(participant) for participant in participants],
        applications=applications,
        created_at=request.created_at,
        updated_at=request.updated_at,
    )


@router.post("", response_model=GroupRequestResponse, status_code=status.HTTP_201_CREATED)
def create_group_request(
    payload: GroupRequestCreate,
    current_user: User = Depends(require_roles(["student"])),
    db: Session = Depends(get_db),
) -> GroupRequestResponse:
    if current_user.status == "suspended":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Suspended users cannot create group requests.")
    if payload.min_participants > payload.max_participants:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Minimum participants cannot exceed maximum participants.")

    price = calculate_group_price(payload.base_price, payload.min_price_per_student, 1)
    request = LearningRequest(
        student_id=current_user.id,
        group_owner_id=current_user.id,
        title=payload.title,
        subject=payload.subject,
        description=payload.description,
        level=payload.level,
        request_type="group",
        session_mode="group",
        session_type=payload.session_type,
        preferred_datetime=payload.preferred_datetime,
        base_price=payload.base_price,
        minimum_price=payload.min_price_per_student,
        min_price_per_student=payload.min_price_per_student,
        final_price_per_student=price,
        current_price_per_student=price,
        max_students=payload.max_participants,
        max_participants=payload.max_participants,
        min_participants=payload.min_participants,
        group_status="open",
        status="open",
    )
    db.add(request)
    db.flush()
    add_group_owner_as_participant(db, request, current_user.id)
    db.commit()
    db.refresh(request)
    return group_response(db, get_group_request_or_404(db, request.id), current_user)


@router.get("", response_model=list[GroupRequestResponse])
def list_group_requests(
    search: str | None = Query(default=None, max_length=120),
    subject: str | None = Query(default=None, max_length=120),
    status_filter: str | None = Query(default="open", alias="status"),
    available_only: bool = True,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[GroupRequestResponse]:
    statement = select(LearningRequest).where(LearningRequest.request_type == "group")
    if status_filter:
        statement = statement.where(LearningRequest.status == status_filter)
    if subject:
        statement = statement.where(LearningRequest.subject.ilike(f"%{subject.strip()}%"))
    if search:
        term = f"%{search.strip()}%"
        statement = statement.where(or_(LearningRequest.title.ilike(term), LearningRequest.subject.ilike(term), LearningRequest.description.ilike(term)))

    requests = db.scalars(
        statement.order_by(LearningRequest.created_at.desc()).options(
            selectinload(LearningRequest.student),
            selectinload(LearningRequest.group_owner),
            selectinload(LearningRequest.accepted_instructor),
            selectinload(LearningRequest.sessions),
        )
    ).all()
    if available_only:
        requests = [
            request
            for request in requests
            if request.max_participants is None or len(get_active_participants(db, request.id)) < request.max_participants
        ]
    return [group_response(db, request, current_user) for request in requests]


@router.get("/my", response_model=list[GroupRequestResponse])
def get_my_group_requests(
    current_user: User = Depends(require_roles(["student"])),
    db: Session = Depends(get_db),
) -> list[GroupRequestResponse]:
    participant_request_ids = db.scalars(
        select(GroupParticipant.request_id).where(GroupParticipant.student_id == current_user.id, GroupParticipant.status == "active")
    ).all()
    requests = db.scalars(
        select(LearningRequest)
        .where(LearningRequest.request_type == "group", LearningRequest.id.in_(participant_request_ids))
        .order_by(LearningRequest.created_at.desc())
        .options(
            selectinload(LearningRequest.student),
            selectinload(LearningRequest.group_owner),
            selectinload(LearningRequest.accepted_instructor),
            selectinload(LearningRequest.sessions),
        )
    ).all()
    return [group_response(db, request, current_user) for request in requests]


@router.get("/{request_id}", response_model=GroupRequestResponse)
def get_group_request(
    request_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> GroupRequestResponse:
    request = get_group_request_or_404(db, request_id)
    include_applications = current_user.role == "admin" or current_user.id == request.group_owner_id
    return group_response(db, request, current_user, include_applications=include_applications)


@router.post("/{request_id}/join", response_model=GroupJoinResponse)
def join_group_request(
    request_id: int,
    current_user: User = Depends(require_roles(["student"])),
    db: Session = Depends(get_db),
) -> GroupJoinResponse:
    if current_user.status == "suspended":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Suspended users cannot join group requests.")
    request = get_group_request_or_404(db, request_id)
    can_student_join_group_request(db, request, current_user.id)
    participant = GroupParticipant(request_id=request.id, student_id=current_user.id, status="active", payment_status="unpaid")
    db.add(participant)
    update_group_request_price(db, request.id)
    create_notification(
        db,
        user_id=request.group_owner_id,
        type="group_participant_joined",
        title="Student joined your group request",
        message=f"{current_user.full_name} joined your group request.",
        link_url=f"/student/group-requests/{request.id}",
    )
    db.commit()
    return GroupJoinResponse(group_request=group_response(db, get_group_request_or_404(db, request.id), current_user))


@router.post("/{request_id}/leave", response_model=GroupRequestResponse)
def leave_group_request(
    request_id: int,
    current_user: User = Depends(require_roles(["student"])),
    db: Session = Depends(get_db),
) -> GroupRequestResponse:
    request = get_group_request_or_404(db, request_id)
    if request.group_owner_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Group owner cannot leave unless the request is cancelled.")
    participant = ensure_group_participant(db, request.id, current_user.id)
    if participant.payment_status != "unpaid":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Paid participants cannot leave. Please contact support.")
    mark_participant_left(participant)
    update_group_request_price(db, request.id)
    db.commit()
    return group_response(db, get_group_request_or_404(db, request.id), current_user)


@router.get("/{request_id}/participants", response_model=list[GroupParticipantResponse])
def get_group_participants(
    request_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[GroupParticipantResponse]:
    request = get_group_request_or_404(db, request_id)
    is_participant = any(participant.student_id == current_user.id for participant in get_active_participants(db, request.id))
    applied = db.scalar(select(Application.id).where(Application.request_id == request.id, Application.instructor_id == current_user.id))
    if current_user.role != "admin" and current_user.id != request.group_owner_id and not is_participant and not applied:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You cannot view these participants.")
    return [participant_response(participant) for participant in get_active_participants(db, request.id)]


@router.get("/{request_id}/price-preview", response_model=GroupPricePreviewResponse)
def get_group_price_preview(
    request_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> GroupPricePreviewResponse:
    request = get_group_request_or_404(db, request_id)
    active_count = len(get_active_participants(db, request.id))
    participants = get_active_participants(db, request.id)
    paid_count = sum(1 for participant in participants if participant.payment_status in {"held", "released"})
    min_price = request.min_price_per_student or request.minimum_price
    current_price = request.current_price_per_student or request.final_price_per_student
    price_locked = request.status != "open" and request.final_price_per_student is not None
    price_if_join = calculate_group_price(request.base_price, min_price, active_count + 1) if not price_locked and request.base_price and min_price else None
    return GroupPricePreviewResponse(
        base_price=request.base_price,
        min_price_per_student=min_price,
        active_participants_count=active_count,
        max_participants=request.max_participants,
        current_price_per_student=current_price,
        final_price_per_student=request.final_price_per_student,
        price_locked=price_locked,
        price_if_you_join=price_if_join,
        paid_participants_count=paid_count,
        total_required_participants=active_count,
        fully_funded=bool(participants) and paid_count == active_count,
    )


@router.post("/{request_id}/pay", response_model=GroupPaymentResponse | CreatePaymentIntentionResponse)
def pay_group_share(
    request_id: int,
    payload: SimulatePaymentRequest | None = None,
    current_user: User = Depends(require_roles(["student"])),
    db: Session = Depends(get_db),
) -> GroupPaymentResponse | CreatePaymentIntentionResponse:
    """Pay a group session share via Paymob or dev-confirm fallback."""
    request = db.scalar(
        select(LearningRequest)
        .where(LearningRequest.id == request_id, LearningRequest.request_type == "group")
        .with_for_update()
        .options(
            selectinload(LearningRequest.student),
            selectinload(LearningRequest.group_owner),
            selectinload(LearningRequest.accepted_instructor),
            selectinload(LearningRequest.sessions),
            selectinload(LearningRequest.group_participants).selectinload(GroupParticipant.student),
        )
    )
    if request is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group request not found.")
    if request.status != "waiting_payment":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This group is not waiting for participant payments.")
    participant = db.scalar(
        select(GroupParticipant)
        .where(
            GroupParticipant.request_id == request.id,
            GroupParticipant.student_id == current_user.id,
            GroupParticipant.status == "active",
        )
        .with_for_update()
    )
    if participant is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not an active participant in this group.")
    if participant.payment_status in {"held", "released"} or participant.payment_id is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="You already paid your share.")
    session = request.sessions[0] if request.sessions else None
    if session is None or request.accepted_instructor_id is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This group does not have an accepted instructor yet.")
    amount = request.final_price_per_student
    if amount is None or amount <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This group does not have a locked payment price.")

    platform_fee = (amount * PLATFORM_FEE_RATE).quantize(Decimal("0.01"))
    total_amount = amount + platform_fee
    payment_method = payload.payment_method if payload else "paymob_card"

    payment = Payment(
        session_id=session.id,
        request_id=request.id,
        student_id=current_user.id,
        instructor_id=request.accepted_instructor_id,
        amount=amount,
        platform_fee=platform_fee,
        total_amount=total_amount,
        status="pending",
        payment_method=payment_method,
    )
    db.add(payment)
    db.flush()
    participant.payment_id = payment.id

    paymob_configured = bool(settings.paymob_secret_key and settings.paymob_integration_id)

    if paymob_configured:
        try:
            intention = paymob_service.create_intention(
                amount_egp=float(total_amount),
                session_id=session.id,
                payment_id=payment.id,
                user=current_user,
                item_name=f"Group Session: {request.title or 'Learning Session'}",
            )
            payment.paymob_intention_id = str(intention.get("id", ""))
            client_secret = intention.get("client_secret", "")
            checkout_url = paymob_service.get_checkout_url(client_secret)
        except Exception as exc:
            logger.error("Paymob intention failed for group request %s: %s", request.id, exc)
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Failed to create payment with Paymob: {exc}",
            ) from exc

        db.commit()
        return CreatePaymentIntentionResponse(
            payment_id=payment.id,
            checkout_url=checkout_url,
            client_secret=client_secret,
        )
    else:
        # Dev mode: instantly hold payment
        payment.status = "held"
        payment.paid_at = datetime.now(timezone.utc)
        payment.paymob_transaction_id = f"dev_group_{payment.id}"
        participant.payment_status = "held"

        wallet = get_or_create_wallet(db, request.accepted_instructor_id)
        wallet.pending_balance += amount
        db.add(WalletTransaction(instructor_id=request.accepted_instructor_id, payment_id=payment.id, type="hold", amount=amount, status="completed"))

        create_notification(
            db,
            user_id=request.group_owner_id,
            type="group_participant_paid",
            title="Group participant paid",
            message=f"{current_user.full_name} paid their group session share.",
            link_url=f"/student/group-requests/{request.id}",
        )

        participants = get_active_participants(db, request.id)
        if all_active_participants_paid(participants):
            request.status = "paid"
            session.status = "ready"
            recipient_ids = [participant.student_id for participant in participants] + [request.accepted_instructor_id]
            create_notifications(
                db,
                recipient_ids,
                type="group_all_paid",
                title="Group session is ready",
                message="All active group participants have paid. The session is ready.",
                link_url=f"/student/sessions/{session.id}",
            )

        db.commit()
        db.refresh(payment)
        payment_response = PaymentResponse.model_validate(payment).model_copy(
            update={
                "request_title": request.title,
                "student_name": current_user.full_name,
                "instructor_name": request.accepted_instructor.full_name if request.accepted_instructor else None,
            }
        )
        return GroupPaymentResponse(payment=payment_response, group_request=group_response(db, get_group_request_or_404(db, request.id), current_user))
