"""Paymob payment gateway integration service.

Handles communication with Paymob's Intention API and webhook HMAC verification.
Uses test mode credentials — no real money is processed.
"""

import hashlib
import hmac as hmac_module
import logging

import httpx

from app.config import settings
from app.models.user import User

logger = logging.getLogger(__name__)

PAYMOB_INTENTION_URL = f"{settings.paymob_base_url}/v1/intention/"


def _amount_to_piasters(amount_egp: float | int | str) -> int:
    """Convert EGP amount to piasters (smallest currency unit).

    Paymob expects amounts in piasters: 100 EGP = 10,000 piasters.
    """
    return int(round(float(amount_egp) * 100))


def build_billing_data(user: User) -> dict:
    """Build the billing_data dict required by Paymob from a User model.

    Paymob requires first_name, last_name, email, and phone_number at minimum.
    We split full_name into first/last.
    """
    name_parts = (user.full_name or "Student").split(" ", 1)
    first_name = name_parts[0]
    last_name = name_parts[1] if len(name_parts) > 1 else "N/A"

    phone = "N/A"
    if user.student_profile and user.student_profile.phone:
        phone = user.student_profile.phone
    elif user.instructor_profile and user.instructor_profile.phone:
        phone = user.instructor_profile.phone

    return {
        "first_name": first_name,
        "last_name": last_name,
        "email": user.email,
        "phone_number": phone,
        "apartment": "N/A",
        "floor": "N/A",
        "street": "N/A",
        "building": "N/A",
        "shipping_method": "N/A",
        "postal_code": "N/A",
        "city": "Cairo",
        "country": "EG",
        "state": "Cairo",
    }


def create_intention(
    amount_egp: float | int | str,
    session_id: int,
    payment_id: int,
    user: User,
    item_name: str = "Learning Session",
) -> dict:
    """Create a Paymob payment intention.

    Calls POST /v1/intention/ to initialize a payment.
    Returns the full Paymob response containing ``client_secret`` and ``id``.

    Raises:
        httpx.HTTPStatusError: If the Paymob API returns an error status.
        RuntimeError: If the Paymob API key or integration ID is not configured.
    """
    if not settings.paymob_secret_key or settings.paymob_integration_id == 0:
        raise RuntimeError(
            "Paymob is not configured. Set PAYMOB_SECRET_KEY and PAYMOB_INTEGRATION_ID in your .env file."
        )

    amount_piasters = _amount_to_piasters(amount_egp)

    # Build the redirect URL that Paymob will send the student to after checkout
    callback_url = f"{settings.frontend_url}/student/payment/callback?payment_id={payment_id}"

    payload = {
        "amount": amount_piasters,
        "currency": "EGP",
        "payment_methods": [settings.paymob_integration_id],
        "items": [
            {
                "name": item_name,
                "amount": amount_piasters,
                "description": f"Session #{session_id}",
                "quantity": 1,
            }
        ],
        "billing_data": build_billing_data(user),
        "extras": {
            "session_id": str(session_id),
        },
        "redirection_url": callback_url,
    }

    headers = {
        "Authorization": f"Token {settings.paymob_secret_key}",
        "Content-Type": "application/json",
    }

    logger.info("Creating Paymob intention for session %s, amount %s piasters", session_id, amount_piasters)

    response = httpx.post(PAYMOB_INTENTION_URL, json=payload, headers=headers, timeout=30.0)
    response.raise_for_status()
    data = response.json()

    logger.info("Paymob intention created: id=%s", data.get("id"))
    return data


def get_checkout_url(client_secret: str) -> str:
    """Build the Paymob Unified Checkout URL from a client_secret.

    The student is redirected to this URL to complete their payment.
    """
    return f"{settings.paymob_base_url}/unifiedcheckout/?publicKey={settings.paymob_public_key}&clientSecret={client_secret}"


def verify_hmac(data: dict, received_hmac: str) -> bool:
    """Verify the HMAC signature of a Paymob webhook callback.

    Paymob sends a set of fields in the callback. We must:
    1. Extract the specific HMAC fields from the ``obj`` dict
    2. Sort them lexicographically by key
    3. Concatenate their values
    4. Hash with HMAC-SHA512 using our HMAC secret
    5. Compare to the received HMAC

    Returns True if the HMAC is valid, False otherwise.
    """
    if not settings.paymob_hmac_secret:
        logger.warning("HMAC verification skipped: PAYMOB_HMAC_SECRET not configured")
        return False

    # Fields used by Paymob for HMAC calculation (transaction processed callback)
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

    # Build the concatenated string from field values
    obj = data.get("obj", data)

    values = []
    for field in hmac_fields:
        if field == "order":
            values.append(str(obj.get("order", {}).get("id", "")))
        elif field.startswith("source_data_"):
            source_data = obj.get("source_data", {})
            sub_field = field.replace("source_data_", "")
            values.append(str(source_data.get(sub_field, "")))
        else:
            values.append(str(obj.get(field, "")))

    concatenated = "".join(values)

    calculated_hmac = hmac_module.new(
        key=settings.paymob_hmac_secret.encode("utf-8"),
        msg=concatenated.encode("utf-8"),
        digestmod=hashlib.sha512,
    ).hexdigest()

    is_valid = hmac_module.compare_digest(calculated_hmac, received_hmac)

    if not is_valid:
        logger.warning("HMAC verification failed for transaction %s", obj.get("id"))

    return is_valid
