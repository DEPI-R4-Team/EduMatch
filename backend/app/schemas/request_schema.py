from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.schemas.application_schema import ApplicationResponse
from app.services.pricing_service import is_below_minimum, minimum_price_error

RequestStatus = Literal[
    "open",
    "instant_open",
    "instant_accepted",
    "pending_instant",
    "accepted",
    "waiting_payment",
    "paid",
    "in_session",
    "completed",
    "cancelled",
    "expired",
]


class RequestCreate(BaseModel):
    title: str = Field(min_length=1, max_length=180)
    subject: str = Field(min_length=1, max_length=160)
    description: str = Field(min_length=1, max_length=4000)
    level: str | None = Field(default=None, max_length=80)
    request_type: str = "normal"
    session_mode: str = "individual"
    session_type: str = "online"
    preferred_datetime: datetime | None = None
    base_price: Decimal | None = Field(default=None, gt=0)
    discount_per_extra_student: Decimal | None = Field(default=None, ge=0)
    minimum_price: Decimal | None = Field(default=None, ge=0)
    final_price_per_student: Decimal | None = Field(default=None, ge=0)
    max_students: int | None = Field(default=None, ge=1)
    max_participants: int | None = Field(default=None, ge=1)
    min_participants: int | None = Field(default=None, ge=1)
    min_price_per_student: Decimal | None = Field(default=None, ge=0)
    current_price_per_student: Decimal | None = Field(default=None, ge=0)
    expires_at: datetime | None = None

    @model_validator(mode="after")
    def validate_minimum_prices(self) -> "RequestCreate":
        for value in (self.base_price, self.final_price_per_student, self.minimum_price, self.min_price_per_student, self.current_price_per_student):
            if is_below_minimum(value):
                raise ValueError(minimum_price_error())
        return self


class RequestUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=180)
    subject: str | None = Field(default=None, min_length=1, max_length=160)
    description: str | None = Field(default=None, min_length=1, max_length=4000)
    level: str | None = Field(default=None, max_length=80)
    preferred_datetime: datetime | None = None
    base_price: Decimal | None = Field(default=None, gt=0)

    @model_validator(mode="after")
    def validate_minimum_prices(self) -> "RequestUpdate":
        if is_below_minimum(self.base_price):
            raise ValueError(minimum_price_error())
        return self


class RequestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    student_id: int
    title: str
    subject: str
    description: str
    level: str | None = None
    request_type: str
    session_mode: str
    session_type: str
    preferred_datetime: datetime | None = None
    base_price: Decimal | None = None
    discount_per_extra_student: Decimal | None = None
    minimum_price: Decimal | None = None
    final_price_per_student: Decimal | None = None
    max_students: int | None = None
    max_participants: int | None = None
    min_participants: int | None = None
    min_price_per_student: Decimal | None = None
    current_price_per_student: Decimal | None = None
    group_owner_id: int | None = None
    group_status: str | None = None
    status: RequestStatus
    accepted_instructor_id: int | None = None
    accepted_at: datetime | None = None
    urgency_level: str | None = None
    expires_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
    student_name: str | None = None
    accepted_instructor_name: str | None = None
    applications_count: int = 0


class RequestDetailResponse(RequestResponse):
    applications: list[ApplicationResponse] = []
