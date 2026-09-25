"""track automatic platform competition finalization

Revision ID: 0022_competition_finalization
Revises: 0021_competition_task_points
Create Date: 2026-09-25
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0022_competition_finalization"
down_revision: Union[str, None] = "0021_competition_task_points"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "competitions",
        sa.Column(
            "results_finalized_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column("competitions", "results_finalized_at")
