"""add competition results

Revision ID: 0009_competition_results
Revises: 0008_competitions
Create Date: 2026-09-23
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0009_competition_results"
down_revision: Union[str, None] = "0008_competitions"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "competition_results",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("competition_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("place", sa.Integer(), nullable=True),
        sa.Column("result_text", sa.String(length=255), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["competition_id"],
            ["competitions.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "competition_id",
            "user_id",
            name="uq_competition_results_competition_user",
        ),
    )
    op.create_index(
        "ix_competition_results_competition_id",
        "competition_results",
        ["competition_id"],
        unique=False,
    )
    op.create_index(
        "ix_competition_results_user_id",
        "competition_results",
        ["user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_competition_results_user_id",
        table_name="competition_results",
    )
    op.drop_index(
        "ix_competition_results_competition_id",
        table_name="competition_results",
    )
    op.drop_table("competition_results")
