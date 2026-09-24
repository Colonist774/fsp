"""add athlete profile fields

Revision ID: 0013_athlete_profile
Revises: 0012_regional_championship
Create Date: 2026-09-24
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0013_athlete_profile"
down_revision: Union[str, None] = "0012_regional_championship"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("full_name", sa.String(length=200), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column(
            "hide_full_name",
            sa.Boolean(),
            server_default="false",
            nullable=False,
        ),
    )
    op.add_column(
        "users",
        sa.Column("locality", sa.String(length=120), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("education_org", sa.String(length=200), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column(
            "sports_disciplines",
            sa.String(length=255),
            nullable=True,
        ),
    )
    op.add_column(
        "users",
        sa.Column(
            "sports_qualification",
            sa.String(length=120),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column("users", "sports_qualification")
    op.drop_column("users", "sports_disciplines")
    op.drop_column("users", "education_org")
    op.drop_column("users", "locality")
    op.drop_column("users", "hide_full_name")
    op.drop_column("users", "full_name")
