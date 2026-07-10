import hashlib
import hmac
import logging
from decimal import Decimal, ROUND_HALF_UP
from typing import Any

import httpx

from app.config import settings
from app.schemas.paymob_checkout_schema import PaymobCheckoutItem, PaymobCheckoutRequest

logger = logging.getLogger(__name__)


class PaymobProviderError(RuntimeError):
    pass


class PaymobNetworkError(RuntimeError):
    pass


def _amount_to_cents(amount: Decimal | int | float | str) -> int:
    cents = (Decimal(str(amount)) * Decimal("100")).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
    return int(cents)


def _hmac_value(value: Any) -> str:
    if isinstance(value, bool):
        return str(value).lower()
    if value is None:
        return ""
    return str(value)


def _require_paymob_iframe_settings() -> None:
    missing = []
    if not settings.paymob_api_key:
        missing.append("PAYMOB_API_KEY")
    if not settings.paymob_integration_id:
        missing.append("PAYMOB_INTEGRATION_ID")
    if not settings.paymob_iframe_id:
        missing.append("PAYMOB_IFRAME_ID")

    if missing:
        raise RuntimeError(f"Missing Paymob iframe configuration: {', '.join(missing)}")


def validate_paymob_iframe_runtime() -> None:
    """Validate Paymob runtime dependencies and configuration when enabled."""
    configured_values = [
        settings.paymob_api_key,
        settings.paymob_integration_id,
        settings.paymob_iframe_id,
    ]
    if any(configured_values):
        _require_paymob_iframe_settings()
        logger.info("Paymob iframe runtime validated with httpx %s", httpx.__version__)


def _item_payload(item: PaymobCheckoutItem) -> dict[str, Any]:
    return {
        "name": item.name,
        "amount_cents": _amount_to_cents(item.amount),
        "description": item.description,
        "quantity": item.quantity,
    }


async def create_iframe_checkout(payload: PaymobCheckoutRequest) -> dict[str, Any]:
    """Create a legacy Paymob iframe checkout token.

    Flow:
    1. Authenticate with API key.
    2. Register an ecommerce order.
    3. Generate a payment key for the configured integration ID.
    """
    _require_paymob_iframe_settings()
    amount_cents = _amount_to_cents(payload.amount)
    base_url = settings.paymob_base_url.rstrip("/")

    try:
        async with httpx.AsyncClient(base_url=base_url, timeout=30.0) as client:
            auth_response = await client.post("/api/auth/tokens", json={"api_key": settings.paymob_api_key})
            auth_response.raise_for_status()
            auth_token = auth_response.json().get("token")
            if not auth_token:
                raise RuntimeError("Paymob authentication did not return an auth token.")

            order_payload: dict[str, Any] = {
                "auth_token": auth_token,
                "delivery_needed": "false",
                "amount_cents": amount_cents,
                "currency": payload.currency,
                "items": [_item_payload(item) for item in payload.items],
            }
            if payload.merchant_order_id:
                order_payload["merchant_order_id"] = payload.merchant_order_id
            if payload.metadata:
                order_payload["extras"] = payload.metadata

            order_response = await client.post("/api/ecommerce/orders", json=order_payload)
            order_response.raise_for_status()
            order_id = order_response.json().get("id")
            if not order_id:
                raise RuntimeError("Paymob order registration did not return an order ID.")

            billing_data = payload.billing_data.model_dump()
            payment_key_payload = {
                "auth_token": auth_token,
                "amount_cents": amount_cents,
                "expiration": 3600,
                "order_id": order_id,
                "billing_data": billing_data,
                "currency": payload.currency,
                "integration_id": settings.paymob_integration_id,
                "lock_order_when_paid": "true",
            }
            if payload.metadata:
                payment_key_payload["extra"] = payload.metadata
            if payload.return_url:
                payment_key_payload["redirect_url"] = payload.return_url
            if payload.notification_url:
                payment_key_payload["notification_url"] = payload.notification_url
            key_response = await client.post("/api/acceptance/payment_keys", json=payment_key_payload)
            key_response.raise_for_status()
            payment_token = key_response.json().get("token")
            if not payment_token:
                raise RuntimeError("Paymob payment key generation did not return a payment token.")
    except httpx.HTTPStatusError as exc:
        provider_status = exc.response.status_code if exc.response is not None else "unknown"
        raise PaymobProviderError(f"Paymob provider error status={provider_status}") from exc
    except httpx.HTTPError as exc:
        raise PaymobNetworkError("Could not reach Paymob.") from exc

    logger.info("Created Paymob iframe checkout order_id=%s amount_cents=%s", order_id, amount_cents)
    return {
        "payment_token": payment_token,
        "iframe_url": f"{base_url}/api/acceptance/iframes/{settings.paymob_iframe_id}?payment_token={payment_token}",
        "order_id": int(order_id),
        "amount_cents": amount_cents,
        "currency": payload.currency,
    }


def verify_paymob_hmac(obj: dict[str, Any], received_hmac: str) -> bool:
    if not settings.paymob_hmac_secret or not received_hmac:
        return False

    hmac_fields = [
        "amount_cents",
        "created_at",
        "currency",
        "error_occured",
        "has_parent_transaction",
        "id",
        "integration_id",
        "is_3d_secure",
        "is_auth",
        "is_capture",
        "is_refunded",
        "is_standalone_payment",
        "is_voided",
        "order",
        "owner",
        "pending",
        "source_data_pan",
        "source_data_sub_type",
        "source_data_type",
        "success",
    ]

    values: list[str] = []
    for field in hmac_fields:
        if field == "order":
            order = obj.get("order") or {}
            values.append(_hmac_value(order.get("id", "")) if isinstance(order, dict) else _hmac_value(order))
        elif field.startswith("source_data_"):
            source_data = obj.get("source_data") or {}
            sub_field = field.replace("source_data_", "")
            values.append(_hmac_value(source_data.get(sub_field, "")) if isinstance(source_data, dict) else "")
        else:
            values.append(_hmac_value(obj.get(field, "")))

    calculated = hmac.new(
        settings.paymob_hmac_secret.encode("utf-8"),
        "".join(values).encode("utf-8"),
        hashlib.sha512,
    ).hexdigest()
    return hmac.compare_digest(calculated, received_hmac)


def mark_legacy_checkout_paid_placeholder(obj: dict[str, Any]) -> None:
    """Hook for updating EduMatch data after a verified Paymob iframe callback.

    The current EduMatch payment pages use the session/group escrow endpoints.
    If this generic iframe checkout is wired to a specific course/session later,
    look up the local payment/order reference here and transition it to `held`.
    """
    logger.info("Verified Paymob iframe webhook transaction_id=%s success=%s", obj.get("id"), obj.get("success"))
