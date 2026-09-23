"""add user profile fields

Revision ID: 0007_user_profile
Revises: 0006_user_email
Create Date: 2026-09-23
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0007_user_profile"
down_revision: Union[str, None] = "0006_user_email"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("bio", sa.Text(), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column(
            "team_status",
            sa.String(length=20),
            server_default="solo",
            nullable=False,
        ),
    )
    op.add_column(
        "users",
        sa.Column("team_name", sa.String(length=100), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("users", "team_name")
    op.drop_column("users", "team_status")
    op.drop_column("users", "bio")
