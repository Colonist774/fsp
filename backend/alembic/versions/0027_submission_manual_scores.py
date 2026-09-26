"""add manual submission review scores

Revision ID: 0027_submission_manual_scores
Revises: 0026_competition_publication
Create Date: 2026-09-26
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0027_submission_manual_scores"
down_revision: Union[str, None] = "0026_competition_publication"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "submissions",
        sa.Column("manual_score", sa.Integer(), nullable=True),
    )
    op.add_column(
        "submissions",
        sa.Column("reviewed_by_user_id", sa.Integer(), nullable=True),
    )
    op.add_column(
        "submissions",
        sa.Column(
            "reviewed_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )
    op.create_foreign_key(
        "fk_submissions_reviewed_by_user_id_users",
        "submissions",
        "users",
        ["reviewed_by_user_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_submissions_reviewed_by_user_id_users",
        "submissions",
        type_="foreignkey",
    )
    op.drop_column("submissions", "reviewed_at")
    op.drop_column("submissions", "reviewed_by_user_id")
    op.drop_column("submissions", "manual_score")
