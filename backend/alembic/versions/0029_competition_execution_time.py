"""add competition execution time and participation start

Revision ID: 0029_competition_execution_time
Revises: 0028_competition_evaluation_mode
Create Date: 2026-09-26
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0029_competition_execution_time"
down_revision: Union[str, None] = "0028_competition_evaluation_mode"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "competitions",
        sa.Column("execution_time_minutes", sa.Integer(), nullable=True),
    )
    op.execute(
        """
        UPDATE competitions
        SET execution_time_minutes = GREATEST(
            1,
            CEIL(EXTRACT(EPOCH FROM (end_at - start_at)) / 60.0)::integer
        )
        WHERE conduct_mode = 'platform'
        """
    )
    op.add_column(
        "competition_registrations",
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("competition_registrations", "started_at")
    op.drop_column("competitions", "execution_time_minutes")
