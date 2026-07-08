from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict

PaymentStatus = Literal["pending", "held", "released", "refunded", "cancelled", "disputed"]
PaymentMethod = Literal[
    "paymob_card",
    "paymob_wallet",
    # Legacy simulation methods (kept for backwards compatibility with existing data)
    "card_simulation",
    "wallet_simulation",
    "cash_simulation",
]


class PaymentCreate(BaseModel):
    session_id: int
    payment_method: PaymentMethod = "paymob_card"


class SimulatePaymentRequest(BaseModel):
    payment_method: PaymentMethod = "paymob_card"


class PaymentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    session_id: int
    request_id: int
    student_id: int
    instructor_id: int
    amount: Decimal
    platform_fee: Decimal
    total_amount: Decimal
    status: PaymentStatus
    payment_method: str
    paymob_intention_id: str | None = None
    paymob_transaction_id: str | None = None
    paymob_order_id: str | None = None
    paid_at: datetime | None = None
    released_at: datetime | None = None
    refunded_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
    request_title: str | None = None
    student_name: str | None = None
    instructor_name: str | None = None


class PaymentDetailResponse(PaymentResponse):
    session_status: str | None = None
    request_status: str | None = None


class CreatePaymentIntentionResponse(BaseModel):
    """Returned to the frontend after creating a Paymob payment intention."""

    payment_id: int
    checkout_url: str
    client_secret: str


class PaymobCallbackData(BaseModel):
    """Subset of the Paymob webhook callback ``obj`` field we care about."""

    model_config = ConfigDict(extra="allow")

    id: int
    success: bool
    amount_cents: int
    order: dict | None = None
    pending: bool = False
