from decimal import Decimal
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class PaymobCheckoutItem(BaseModel):
    name: str = Field(min_length=1, max_length=180)
    amount: Decimal = Field(gt=0)
    description: str = Field(default="EduMatch learning session", max_length=500)
    quantity: int = Field(default=1, ge=1)


class PaymobBillingData(BaseModel):
    first_name: str = Field(min_length=1, max_length=120)
    last_name: str = Field(default="N/A", max_length=120)
    email: str = Field(min_length=3, max_length=254)
    phone_number: str = Field(default="01012345678", max_length=32)
    apartment: str = "N/A"
    floor: str = "N/A"
    street: str = "N/A"
    building: str = "N/A"
    shipping_method: str = "N/A"
    postal_code: str = "N/A"
    city: str = "Cairo"
    country: str = "EG"
    state: str = "Cairo"


class PaymobCheckoutRequest(BaseModel):
    amount: Decimal = Field(gt=0, description="Total checkout amount in EGP.")
    currency: str = Field(default="EGP", min_length=3, max_length=3)
    billing_data: PaymobBillingData
    items: list[PaymobCheckoutItem] = Field(default_factory=list)
    merchant_order_id: str | None = Field(default=None, max_length=120)
    return_url: str | None = Field(default=None, max_length=500)
    notification_url: str | None = Field(default=None, max_length=500)
    metadata: dict[str, str] = Field(default_factory=dict)


class PaymobCheckoutResponse(BaseModel):
    payment_token: str
    iframe_url: str
    order_id: int
    amount_cents: int
    currency: str


class PaymobWebhookPayload(BaseModel):
    model_config = ConfigDict(extra="allow")

    type: str | None = None
    obj: dict[str, Any] | None = None
