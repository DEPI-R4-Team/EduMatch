"""Audit and repair local development payment/session state inconsistencies.

Usage:
    cd backend
    .venv\\Scripts\\activate.bat
    python scripts/reconcile_payment_states.py
    python scripts/reconcile_payment_states.py --apply

The script refuses to run against non-local database hosts. The default mode is
read-only; pass --apply to repair clear local development inconsistencies.
"""

from __future__ import annotations

import argparse
from collections import Counter, defaultdict
from urllib.parse import urlparse

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.config import settings
from app.database import SessionLocal
from app.models import Payment, Session as LearningSession
from app.services.payment_state_service import PAYMENT_SUCCESS_STATES

LOCAL_DB_HOSTS = {"localhost", "127.0.0.1", "::1"}


def ensure_local_database() -> str:
    parsed = urlparse(settings.database_url)
    host = parsed.hostname or ""
    if host not in LOCAL_DB_HOSTS:
        raise RuntimeError(
            f"Refusing to reconcile payment state against non-local database host: {host or 'unknown'}"
        )
    return host


def summarize_payments(payments: list[Payment]) -> Counter[str]:
    return Counter(payment.status for payment in payments)


def main() -> None:
    parser = argparse.ArgumentParser(description="Audit and repair local EduMatch payment/session state.")
    parser.add_argument("--apply", action="store_true", help="Apply safe repairs. Without this flag the script is read-only.")
    args = parser.parse_args()

    host = ensure_local_database()
    print(f"Connected database host confirmed local: {host}")
    print(f"Mode: {'APPLY' if args.apply else 'DRY RUN'}")

    db = SessionLocal()
    repairs = Counter()
    inconsistencies: dict[str, list[str]] = defaultdict(list)
    try:
        sessions = db.scalars(
            select(LearningSession)
            .order_by(LearningSession.id)
            .options(
                selectinload(LearningSession.request),
                selectinload(LearningSession.payments),
            )
        ).all()
        payments = db.scalars(select(Payment).order_by(Payment.session_id, Payment.created_at, Payment.id)).all()

        payment_counts = summarize_payments(payments)
        sessions_with_payments = sum(1 for session in sessions if session.payments)
        sessions_without_payments = len(sessions) - sessions_with_payments

        print(f"total sessions: {len(sessions)}")
        print(f"total payments: {len(payments)}")
        print(f"sessions with no payment: {sessions_without_payments}")
        for status, count in sorted(payment_counts.items()):
            print(f"payments {status}: {count}")

        for session in sessions:
            request = session.request
            successful = [payment for payment in session.payments if payment.status in PAYMENT_SUCCESS_STATES]
            pending = [payment for payment in session.payments if payment.status == "pending"]

            if request is not None and request.status == "waiting_payment" and session.status == "ready" and not successful:
                inconsistencies["ready_without_successful_payment"].append(
                    f"session={session.id} request={request.id} payments={len(session.payments)}"
                )
                if args.apply:
                    session.status = "waiting_payment"
                    repairs["session_ready_to_waiting_payment"] += 1

            if successful and session.status == "waiting_payment":
                inconsistencies["successful_payment_but_session_locked"].append(
                    f"session={session.id} payment={successful[-1].id}"
                )
                if args.apply:
                    session.status = "ready"
                    repairs["session_unlocked"] += 1

            if successful and request is not None and request.status == "waiting_payment":
                inconsistencies["successful_payment_but_request_waiting_payment"].append(
                    f"session={session.id} request={request.id} payment={successful[-1].id}"
                )
                if args.apply:
                    request.status = "paid"
                    repairs["request_marked_paid"] += 1

            if len(pending) > 1:
                sorted_pending = sorted(pending, key=lambda item: (item.created_at, item.id))
                stale_pending = sorted_pending[:-1]
                inconsistencies["multiple_pending_payments"].append(
                    f"session={session.id} stale_payment_ids={[payment.id for payment in stale_pending]}"
                )
                if args.apply:
                    for payment in stale_pending:
                        payment.status = "cancelled"
                        repairs["stale_pending_cancelled"] += 1

            for payment in session.payments:
                if request is not None and payment.request_id != request.id:
                    inconsistencies["payment_request_mismatch"].append(
                        f"session={session.id} payment={payment.id} payment_request={payment.request_id} session_request={request.id}"
                    )
                    if args.apply and payment.status not in PAYMENT_SUCCESS_STATES:
                        payment.request_id = request.id
                        repairs["payment_request_relinked"] += 1

        for payment in payments:
            if payment.session_id is None:
                inconsistencies["payment_missing_session"].append(f"payment={payment.id}")

        print("inconsistencies:")
        if not inconsistencies:
            print("  none")
        for name, rows in sorted(inconsistencies.items()):
            print(f"  {name}: {len(rows)}")
            for row in rows[:25]:
                print(f"    - {row}")
            if len(rows) > 25:
                print(f"    ... {len(rows) - 25} more")

        if args.apply:
            db.commit()
            print("repairs applied:")
            if not repairs:
                print("  none")
            for name, count in sorted(repairs.items()):
                print(f"  {name}: {count}")
        else:
            db.rollback()
            print("No changes were made. Re-run with --apply to repair clear local development inconsistencies.")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
