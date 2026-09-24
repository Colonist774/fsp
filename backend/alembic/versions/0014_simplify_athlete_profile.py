"""remove locality and education organization

Revision ID: 0014_simplify_athlete_profile
Revises: 0013_athlete_profile
Create Date: 2026-09-24
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0014_simplify_athlete_profile"
down_revision: Union[str, None] = "0013_athlete_profile"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column("users", "education_org")
    op.drop_column("users", "locality")


def downgrade() -> None:
    op.add_column(
        "users",
        sa.Column("locality", sa.String(length=120), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("education_org", sa.String(length=200), nullable=True),
    )
