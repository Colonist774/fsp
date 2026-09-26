"""add competition evaluation mode

Revision ID: 0028_competition_evaluation_mode
Revises: 0027_submission_manual_scores
Create Date: 2026-09-26
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0028_competition_evaluation_mode"
down_revision: Union[str, None] = "0027_submission_manual_scores"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "competitions",
        sa.Column(
            "evaluation_mode",
            sa.String(length=20),
            nullable=False,
            server_default="hybrid",
        ),
    )
    op.alter_column(
        "competitions",
        "evaluation_mode",
        server_default="automatic",
    )


def downgrade() -> None:
    op.drop_column("competitions", "evaluation_mode")
