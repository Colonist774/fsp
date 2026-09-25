"""restore athlete locality and education

Revision ID: 0017_restore_profile_fields
Revises: 0016_organizer_probation
Create Date: 2026-09-25
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0017_restore_profile_fields"
down_revision: Union[str, None] = "0016_organizer_probation"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("locality", sa.String(length=120), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column(
            "hide_locality",
            sa.Boolean(),
            server_default="false",
            nullable=False,
        ),
    )
    op.add_column(
        "users",
        sa.Column("education_org", sa.String(length=200), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("users", "education_org")
    op.drop_column("users", "hide_locality")
    op.drop_column("users", "locality")
