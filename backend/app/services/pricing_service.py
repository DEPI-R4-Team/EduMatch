from decimal import Decimal

from app.config import settings


def minimum_session_price() -> Decimal:
    return Decimal(settings.min_session_price).quantize(Decimal("0.01"))


def minimum_price_error() -> str:
    return f"Session price cannot be less than {minimum_session_price():.0f}."


def is_below_minimum(value: Decimal | None) -> bool:
    return value is not None and value < minimum_session_price()
