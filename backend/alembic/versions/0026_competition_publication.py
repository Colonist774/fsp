"""add competition publication lifecycle and rules

Revision ID: 0026_competition_publication
Revises: 0025_task_test_revisions
Create Date: 2026-09-26
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0026_competition_publication"
down_revision: Union[str, None] = "0025_task_test_revisions"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "competitions",
        sa.Column(
            "rules",
            sa.Text(),
            server_default="",
            nullable=False,
        ),
    )
    op.add_column(
        "competitions",
        sa.Column(
            "published_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )

    # Existing competitions were already visible before drafts existed,
    # so keep them published after the migration.
    op.execute(
        """
        UPDATE competitions
        SET published_at = created_at
        """
    )


def downgrade() -> None:
    op.drop_column("competitions", "published_at")
    op.drop_column("competitions", "rules")
