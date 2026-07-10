"""Shared Paymob helpers for billing data and callback HMAC verification."""

import hashlib
import hmac as hmac_module
import logging

from app.config import settings
from app.models.user import User

logger = logging.getLogger(__name__)

def _hmac_value(value: object) -> str:
    if isinstance(value, bool):
        return str(value).lower()
    if value is None:
        return ""
    return str(value)


def build_billing_data(user: User) -> dict:
    """Build the billing_data dict required by Paymob from a User model.

    Paymob requires first_name, last_name, email, and phone_number at minimum.
    We split full_name into first/last.
    """
    name_parts = (user.full_name or "Student").split(" ", 1)
    first_name = name_parts[0]
    last_name = name_parts[1] if len(name_parts) > 1 else "NA"

    phone = "01012345678"
    if user.student_profile and user.student_profile.phone:
        phone = user.student_profile.phone
    elif user.instructor_profile and user.instructor_profile.phone:
        phone = user.instructor_profile.phone

    return {
        "first_name": first_name,
        "last_name": last_name,
        "email": user.email,
        "phone_number": phone,
        "apartment": "NA",
        "floor": "NA",
        "street": "NA",
        "building": "NA",
        "shipping_method": "NA",
        "postal_code": "NA",
        "city": "Cairo",
        "country": "EG",
        "state": "Cairo",
    }




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
            order = obj.get("order") or {}
            values.append(_hmac_value(order.get("id", "")) if isinstance(order, dict) else _hmac_value(order))
        elif field.startswith("source_data_"):
            source_data = obj.get("source_data", {})
            sub_field = field.replace("source_data_", "")
            values.append(_hmac_value(source_data.get(sub_field, "")) if isinstance(source_data, dict) else "")
        else:
            values.append(_hmac_value(obj.get(field, "")))

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
