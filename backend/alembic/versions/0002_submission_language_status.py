"""add language and status to submissions

Revision ID: 0002_submission_language_status
Revises: 0001_tasks_submissions
Create Date: 2026-09-20
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0002_submission_language_status"
down_revision: Union[str, None] = "0001_tasks_submissions"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "submissions",
        sa.Column(
            "language",
            sa.String(length=20),
            server_default="python",
            nullable=False,
        ),
    )
    op.add_column(
        "submissions",
        sa.Column(
            "status",
            sa.String(length=30),
            server_default="pending",
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_column("submissions", "status")
    op.drop_column("submissions", "language")
