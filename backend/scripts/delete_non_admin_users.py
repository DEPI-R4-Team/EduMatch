"""Delete all non-admin users from the local development database.

Safety rules:
- Refuses to run unless DATABASE_URL points to localhost/127.0.0.1/::1.
- Preserves users whose role is exactly "admin".
- Uses database FK cascades instead of dropping tables or resetting schema.
- Prints a before/after summary and rolls back on errors.
"""

from __future__ import annotations

from collections.abc import Iterable
from pathlib import Path
import sys

from sqlalchemy import delete, func, inspect, select, text
from sqlalchemy.engine import make_url

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.config import settings  # noqa: E402
from app.database import SessionLocal, engine  # noqa: E402
from app.models import User  # noqa: E402


LOCAL_HOSTS = {"localhost", "127.0.0.1", "::1"}
COUNT_TABLES = [
    "users",
    "student_profiles",
    "instructor_profiles",
    "requests",
    "applications",
    "sessions",
    "payments",
    "instructor_wallets",
    "wallet_transactions",
    "messages",
    "reviews",
    "notifications",
    "group_participants",
]


def assert_local_database() -> tuple[str, str]:
    url = make_url(settings.database_url)
    host = url.host or ""
    database = url.database or ""

    if host not in LOCAL_HOSTS:
        raise RuntimeError(
            f"Refusing to delete users because DATABASE_URL host is not local. host={host!r}, database={database!r}"
        )

    return host, database


def existing_tables(table_names: Iterable[str]) -> list[str]:
    inspector = inspect(engine)
    present = set(inspector.get_table_names())
    return [table for table in table_names if table in present]


def table_counts(db, tables: Iterable[str]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for table in tables:
        counts[table] = int(db.execute(text(f'SELECT COUNT(*) FROM "{table}"')).scalar_one())
    return counts


def print_counts(title: str, counts: dict[str, int]) -> None:
    print(title)
    for table, count in counts.items():
        print(f"  {table}: {count}")


def main() -> None:
    host, database = assert_local_database()
    tables = existing_tables(COUNT_TABLES)

    print("Confirmed local development database.")
    print(f"  host: {host}")
    print(f"  database: {database}")

    with SessionLocal() as db:
        before_counts = table_counts(db, tables)
        print_counts("Counts before cleanup:", before_counts)

        admins = db.scalars(select(User).where(User.role == "admin").order_by(User.id)).all()
        non_admins = db.scalars(select(User).where(User.role != "admin").order_by(User.id)).all()

        print(f"Admin users preserved: {len(admins)}")
        for user in admins:
            print(f"  KEEP id={user.id} email={user.email} role={user.role}")

        print(f"Non-admin users to delete: {len(non_admins)}")
        for user in non_admins:
            print(f"  DELETE id={user.id} email={user.email} role={user.role}")

        if not non_admins:
            print("No non-admin users found. Nothing to delete.")
            return

        try:
            result = db.execute(delete(User).where(User.role != "admin"))
            db.commit()
            deleted_count = int(result.rowcount or 0)
        except Exception:
            db.rollback()
            print("Cleanup failed. Rolled back transaction.")
            raise

        after_counts = table_counts(db, tables)
        print_counts("Counts after cleanup:", after_counts)

        non_admin_count = db.scalar(select(func.count()).select_from(User).where(User.role != "admin"))
        admin_count = db.scalar(select(func.count()).select_from(User).where(User.role == "admin"))

        print("Cleanup summary:")
        print(f"  users deleted: {deleted_count}")
        print(f"  total non-admin users: {non_admin_count}")
        print(f"  total admin users preserved: {admin_count}")

        if non_admin_count != 0:
            raise RuntimeError("Cleanup verification failed: non-admin users remain.")
        if admin_count == 0:
            raise RuntimeError("Cleanup verification failed: no admin users remain.")


if __name__ == "__main__":
    main()
