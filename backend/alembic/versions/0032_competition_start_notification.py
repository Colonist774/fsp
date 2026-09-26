"""add competition start notification state

Revision ID: 0032_comp_start_notice
Revises: 0031_task_discipline
Create Date: 2026-09-26
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0032_comp_start_notice"
down_revision: Union[str, None] = "0031_task_discipline"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "competition_registrations",
        sa.Column(
            "start_notification_seen_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column(
        "competition_registrations",
        "start_notification_seen_at",
    )
