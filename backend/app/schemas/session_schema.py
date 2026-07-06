from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict

SessionStatus = Literal["waiting_payment", "ready", "active", "completed", "cancelled", "disputed"]


class SessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    request_id: int
    student_id: int
    instructor_id: int
    session_mode: str
    session_type: str
    scheduled_at: datetime | None = None
    started_at: datetime | None = None
    ended_at: datetime | None = None
    instructor_marked_completed_at: datetime | None = None
    student_confirmed_completed_at: datetime | None = None
    completed_at: datetime | None = None
    status: SessionStatus
    created_at: datetime
    updated_at: datetime
    request_title: str | None = None
    request_type: str | None = None
    request_status: str | None = None
    payment_status: str | None = None
    payment_amount: Decimal | None = None
    payment_platform_fee: Decimal | None = None
    payment_total_amount: Decimal | None = None
    student_name: str | None = None
    instructor_name: str | None = None
    has_review: bool = False


class SessionRescheduleRequest(BaseModel):
    scheduled_at: datetime
