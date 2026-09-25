"""track task test revisions

Revision ID: 0025_task_test_revisions
Revises: 0024_sync_task_sequence
Create Date: 2026-09-25
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0025_task_test_revisions"
down_revision: Union[str, None] = "0024_sync_task_sequence"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "tasks",
        sa.Column(
            "test_revision",
            sa.Integer(),
            server_default="1",
            nullable=False,
        ),
    )
    op.add_column(
        "submissions",
        sa.Column(
            "judged_test_revision",
            sa.Integer(),
            nullable=True,
        ),
    )

    op.execute(
        """
        UPDATE submissions
        SET judged_test_revision = 1
        """
    )


def downgrade() -> None:
    op.drop_column("submissions", "judged_test_revision")
    op.drop_column("tasks", "test_revision")
