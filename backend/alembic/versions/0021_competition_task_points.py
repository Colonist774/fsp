"""add competition task points

Revision ID: 0021_competition_task_points
Revises: 0020_competition_finish
Create Date: 2026-09-25
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0021_competition_task_points"
down_revision: Union[str, None] = "0020_competition_finish"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "competition_tasks",
        sa.Column(
            "points",
            sa.Integer(),
            server_default="100",
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_column("competition_tasks", "points")
