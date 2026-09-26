"""add task discipline

Revision ID: 0031_task_discipline
Revises: 0030_sport_disciplines
Create Date: 2026-09-26
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0031_task_discipline"
down_revision: Union[str, None] = "0030_sport_disciplines"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


DEFAULT_DISCIPLINE = "Алгоритмическое программирование"


def upgrade() -> None:
    op.add_column(
        "tasks",
        sa.Column(
            "discipline",
            sa.String(length=100),
            nullable=False,
            server_default=DEFAULT_DISCIPLINE,
        ),
    )

    op.execute(
        """
        UPDATE tasks AS t
        SET discipline = c.discipline
        FROM competition_tasks AS ct
        JOIN competitions AS c ON c.id = ct.competition_id
        WHERE ct.task_id = t.id
        """
    )


def downgrade() -> None:
    op.drop_column("tasks", "discipline")