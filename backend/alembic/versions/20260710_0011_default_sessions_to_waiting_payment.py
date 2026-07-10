"""Default new sessions to waiting_payment.

Revision ID: 20260710_0011
Revises: 20260706_0010
Create Date: 2026-07-10
"""

from alembic import op


revision = "20260710_0011"
down_revision = "20260706_0010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column("sessions", "status", server_default="waiting_payment")


def downgrade() -> None:
    op.alter_column("sessions", "status", server_default="ready")
