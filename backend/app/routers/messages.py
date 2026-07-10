from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, object_session, selectinload

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models import Application, GroupParticipant, LearningRequest, Message, Session as LearningSession, User
from app.schemas.message_schema import ChatConversationResponse, MessageCreate, MessageResponse
from app.services.notification_service import create_notification
from app.services.payment_state_service import get_session_payment_state

router = APIRouter(prefix="/messages", tags=["messages"])

CHAT_BLOCKED_STATUSES = {"cancelled", "disputed"}
CHAT_ALLOWED_STATUSES = {"ready", "active", "completed"}


@router.get("/ping")
def ping() -> dict[str, str]:
    return {"router": "messages", "status": "ok"}


def to_message_response(message: Message) -> MessageResponse:
    return MessageResponse.model_validate(message).model_copy(
        update={
            "sender_name": message.sender.full_name if message.sender else None,
            "sender_role": message.sender.role if message.sender else None,
        }
    )


def get_accessible_application(db: Session, application_id: int, current_user: User) -> Application:
    application = db.scalar(
        select(Application)
        .where(Application.id == application_id)
        .options(
            selectinload(Application.request).selectinload(LearningRequest.student),
            selectinload(Application.instructor),
        )
    )
    if application is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found.")

    if application.request is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found.")

    if current_user.id in {application.request.student_id, application.instructor_id}:
        return application

    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have access to this conversation.")


def get_accessible_session(db: Session, session_id: int, current_user: User) -> LearningSession:
    session = db.scalar(
        select(LearningSession)
        .where(LearningSession.id == session_id)
        .options(selectinload(LearningSession.request))
    )
    if session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")
    if current_user.id in {session.student_id, session.instructor_id}:
        return session
    is_paid_group_participant = False
    if session.request is not None and session.request.request_type == "group":
        is_paid_group_participant = db.scalar(
            select(GroupParticipant.id).where(
                GroupParticipant.request_id == session.request_id,
                GroupParticipant.student_id == current_user.id,
                GroupParticipant.status == "active",
                GroupParticipant.payment_status.in_(["held", "released"]),
            )
        ) is not None
    if not is_paid_group_participant:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have access to this chat.")
    return session


def ensure_session_can_chat(session: LearningSession) -> None:
    if session.status in CHAT_BLOCKED_STATUSES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Chat is not available for this session.")
    if session.status not in CHAT_ALLOWED_STATUSES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Chat is not available for this session status.")
    db = object_session(session)
    if session.request is not None and session.request.request_type != "group" and db is not None:
        if not get_session_payment_state(db, session).session_access_allowed:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Payment must be held before chat is available.")


def last_message_for_application(db: Session, application_id: int) -> Message | None:
    return db.scalar(
        select(Message)
        .where(Message.application_id == application_id)
        .order_by(Message.created_at.desc(), Message.id.desc())
        .limit(1)
    )


def last_message_for_session(db: Session, session_id: int) -> Message | None:
    return db.scalar(
        select(Message)
        .where(Message.session_id == session_id)
        .order_by(Message.created_at.desc(), Message.id.desc())
        .limit(1)
    )


def session_label(session: LearningSession) -> str:
    request_type = session.request.request_type if session.request is not None else ""
    if request_type == "group":
        return "Group Session"
    if request_type == "instant":
        return "Instant Session"
    return "Session"


def conversation_sort_key(conversation: ChatConversationResponse) -> tuple[object, int]:
    return (conversation.last_message_at or conversation.created_at, conversation.session_id or conversation.application_id or 0)


@router.get("/conversations/my", response_model=list[ChatConversationResponse])
def get_my_conversations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ChatConversationResponse]:
    conversations: list[ChatConversationResponse] = []

    if current_user.role == "student":
        applications = db.scalars(
            select(Application)
            .join(Application.request)
            .where(LearningRequest.student_id == current_user.id)
            .options(selectinload(Application.request), selectinload(Application.instructor))
        ).all()
        sessions = db.scalars(
            select(LearningSession)
            .where(LearningSession.student_id == current_user.id)
            .options(selectinload(LearningSession.request), selectinload(LearningSession.instructor))
        ).all()
        group_sessions = db.scalars(
            select(LearningSession)
            .join(LearningSession.request)
            .join(GroupParticipant, GroupParticipant.request_id == LearningSession.request_id)
            .where(
                GroupParticipant.student_id == current_user.id,
                GroupParticipant.status == "active",
                GroupParticipant.payment_status.in_(["held", "released"]),
                LearningSession.student_id != current_user.id,
            )
            .options(selectinload(LearningSession.request), selectinload(LearningSession.instructor))
        ).all()
        sessions = list({session.id: session for session in [*sessions, *group_sessions]}.values())
    elif current_user.role == "instructor":
        applications = db.scalars(
            select(Application)
            .where(Application.instructor_id == current_user.id)
            .options(selectinload(Application.request).selectinload(LearningRequest.student), selectinload(Application.instructor))
        ).all()
        sessions = db.scalars(
            select(LearningSession)
            .where(LearningSession.instructor_id == current_user.id)
            .options(selectinload(LearningSession.request).selectinload(LearningRequest.student), selectinload(LearningSession.student))
        ).all()
    else:
        applications = []
        sessions = []

    for application in applications:
        if application.request is None:
            continue
        has_session = db.scalar(
            select(LearningSession.id).where(
                LearningSession.request_id == application.request_id,
                LearningSession.instructor_id == application.instructor_id,
            )
        ) is not None
        if application.status == "accepted" and has_session:
            continue

        last_message = last_message_for_application(db, application.id)
        other_user = application.instructor if current_user.role == "student" else application.request.student
        if other_user is None:
            continue
        conversations.append(
            ChatConversationResponse(
                conversation_type="application",
                application_id=application.id,
                request_id=application.request_id,
                request_title=application.request.title,
                request_type=application.request.request_type,
                status=application.status,
                other_user_id=other_user.id,
                other_user_name=other_user.full_name,
                label="Applicant" if current_user.role == "student" else "Application",
                last_message=last_message.message if last_message else None,
                last_message_at=last_message.created_at if last_message else None,
                created_at=application.created_at,
            )
        )

    for chat_session in sessions:
        if chat_session.request is None:
            continue
        if chat_session.status not in CHAT_ALLOWED_STATUSES:
            continue
        last_message = last_message_for_session(db, chat_session.id)
        other_user = chat_session.instructor if current_user.role == "student" else chat_session.student
        if other_user is None:
            continue
        conversations.append(
            ChatConversationResponse(
                conversation_type="session",
                session_id=chat_session.id,
                request_id=chat_session.request_id,
                request_title=chat_session.request.title,
                request_type=chat_session.request.request_type,
                status=chat_session.status,
                other_user_id=other_user.id,
                other_user_name=other_user.full_name,
                label=session_label(chat_session),
                last_message=last_message.message if last_message else None,
                last_message_at=last_message.created_at if last_message else None,
                created_at=chat_session.created_at,
            )
        )

    return sorted(conversations, key=conversation_sort_key, reverse=True)


@router.get("/session/{session_id}", response_model=list[MessageResponse])
def get_session_messages(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[MessageResponse]:
    session = get_accessible_session(db, session_id, current_user)
    ensure_session_can_chat(session)

    messages = db.scalars(
        select(Message)
        .where(Message.session_id == session_id)
        .order_by(Message.created_at.asc(), Message.id.asc())
        .options(selectinload(Message.sender))
    ).all()
    return [to_message_response(message) for message in messages]


@router.get("/application/{application_id}", response_model=list[MessageResponse])
def get_application_messages(
    application_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[MessageResponse]:
    get_accessible_application(db, application_id, current_user)

    messages = db.scalars(
        select(Message)
        .where(Message.application_id == application_id)
        .order_by(Message.created_at.asc(), Message.id.asc())
        .options(selectinload(Message.sender))
    ).all()
    return [to_message_response(message) for message in messages]


@router.post("/application/{application_id}", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
def send_application_message(
    application_id: int,
    payload: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MessageResponse:
    trimmed_message = payload.message.strip()
    if not trimmed_message:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Message cannot be empty.")

    application = get_accessible_application(db, application_id, current_user)

    message = Message(application_id=application_id, sender_id=current_user.id, message=trimmed_message)
    db.add(message)

    if application.request is not None:
        if current_user.id == application.request.student_id:
            recipient_id = application.instructor_id
            title = "New message about your application"
            body = f"{current_user.full_name} sent a message about your application."
            link_url = f"/instructor/chat?applicationId={application_id}"
        else:
            recipient_id = application.request.student_id
            title = "New message from applicant"
            body = f"{current_user.full_name} sent a message about your request."
            link_url = f"/student/chat?applicationId={application_id}"
        create_notification(
            db,
            user_id=recipient_id,
            type="application_message_received",
            title=title,
            message=body,
            link_url=link_url,
        )

    db.commit()
    db.refresh(message)

    created_message = db.scalar(
        select(Message).where(Message.id == message.id).options(selectinload(Message.sender))
    )
    if created_message is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Message was not created.")
    return to_message_response(created_message)


@router.post("", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
def send_message(
    payload: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MessageResponse:
    trimmed_message = payload.message.strip()
    if not trimmed_message:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Message cannot be empty.")

    if payload.session_id is None:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Session id is required.")

    session = get_accessible_session(db, payload.session_id, current_user)
    ensure_session_can_chat(session)

    message = Message(session_id=payload.session_id, sender_id=current_user.id, message=trimmed_message)
    db.add(message)
    db.commit()
    db.refresh(message)

    created_message = db.scalar(
        select(Message).where(Message.id == message.id).options(selectinload(Message.sender))
    )
    if created_message is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Message was not created.")
    return to_message_response(created_message)
