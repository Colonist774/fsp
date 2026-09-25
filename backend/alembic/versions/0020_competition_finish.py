"""track competition participation finish time

Revision ID: 0020_competition_finish
Revises: 0019_competition_tasks
Create Date: 2026-09-25
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0020_competition_finish"
down_revision: Union[str, None] = "0019_competition_tasks"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "competition_registrations",
        sa.Column(
            "finished_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column(
        "competition_registrations",
        "finished_at",
    )
