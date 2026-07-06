"""add paymob payment gateway columns

Revision ID: 20260706_0010
Revises: 20260701_0009
Create Date: 2026-07-06
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "20260706_0010"
down_revision: str | None = "20260701_0009"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("payments", sa.Column("paymob_intention_id", sa.String(255), nullable=True))
    op.add_column("payments", sa.Column("paymob_transaction_id", sa.String(255), nullable=True))
    op.add_column("payments", sa.Column("paymob_order_id", sa.String(255), nullable=True))

    # Update default payment_method from card_simulation to paymob_card
    op.alter_column(
        "payments",
        "payment_method",
        existing_type=sa.String(32),
        server_default="paymob_card",
    )


def downgrade() -> None:
    op.alter_column(
        "payments",
        "payment_method",
        existing_type=sa.String(32),
        server_default="card_simulation",
    )
    op.drop_column("payments", "paymob_order_id")
    op.drop_column("payments", "paymob_transaction_id")
    op.drop_column("payments", "paymob_intention_id")
