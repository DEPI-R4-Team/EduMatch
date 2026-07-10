"""Read-only local payment-state audit for EduMatch development databases.

This script never updates rows. It refuses to run unless DATABASE_URL points to
localhost or 127.0.0.1 so it cannot accidentally inspect production data.
"""

from __future__ import annotations

import sys
from pathlib import Path
from urllib.parse import urlparse

from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.config import settings  # noqa: E402
from app.database import SessionLocal  # noqa: E402
from app.models import Payment, Session as LearningSession  # noqa: E402

LOCAL_HOSTS = {"localhost", "127.0.0.1", "::1"}
SUCCESS_STATUSES = {"held", "released"}
FAILED_STATUSES = {"cancelled", "refunded", "disputed"}


def _ensure_local_database() -> str:
    parsed = urlparse(settings.database_url)
    host = parsed.hostname or ""
    if host not in LOCAL_HOSTS:
        raise RuntimeError(
            "Refusing to audit a non-local database. "
            f"Detected host={host or 'unknown'}; expected localhost or 127.0.0.1."
        )
    return host


def main() -> None:
    host = _ensure_local_database()
    print(f"Connected database host confirmed local: {host}")

    with SessionLocal() as db:
        sessions = db.scalars(
            select(LearningSession).options(
                selectinload(LearningSession.request),
                selectinload(LearningSession.payments),
            )
        ).all()

        payment_required_sessions = [
            session
            for session in sessions
            if session.request is not None
            and session.request.status in {"waiting_payment", "paid", "completed"}
        ]

        no_payment = 0
        pending_payment = 0
        failed_payment = 0
        successful_payment = 0
        released_payment = 0
        multiple_attempts = 0
        missing_gateway_mapping = 0
        inconsistent = 0

        for session in payment_required_sessions:
            payments = list(session.payments)
            if not payments:
                no_payment += 1
                continue

            if len(payments) > 1:
                multiple_attempts += 1

            has_success = any(payment.status in SUCCESS_STATUSES for payment in payments)
            has_pending = any(payment.status == "pending" for payment in payments)
            has_failed = any(payment.status in FAILED_STATUSES for payment in payments)
            has_released = any(payment.status == "released" for payment in payments)

            if has_success:
                successful_payment += 1
            elif has_pending:
                pending_payment += 1
            elif has_failed:
                failed_payment += 1

            if has_released:
                released_payment += 1

            missing_gateway_mapping += sum(
                1
                for payment in payments
                if payment.payment_method.startswith("paymob")
                and payment.status == "pending"
                and not payment.paymob_order_id
                and not payment.paymob_transaction_id
            )

            if has_success and session.status == "waiting_payment":
                inconsistent += 1

        total_payments = db.scalar(select(func.count(Payment.id))) or 0

        print(f"total payment records: {total_payments}")
        print(f"total sessions requiring payment: {len(payment_required_sessions)}")
        print(f"sessions with no payment: {no_payment}")
        print(f"sessions with pending payment: {pending_payment}")
        print(f"sessions with failed payment: {failed_payment}")
        print(f"sessions with successful/held payment: {successful_payment}")
        print(f"sessions with released payment: {released_payment}")
        print(f"sessions with multiple attempts: {multiple_attempts}")
        print(f"pending Paymob payments missing gateway mapping: {missing_gateway_mapping}")
        print(f"sessions with inconsistent payment state: {inconsistent}")


if __name__ == "__main__":
    main()
