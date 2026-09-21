"""add users and submission ownership

Revision ID: 0005_users
Revises: 0004_max_array_task
Create Date: 2026-09-21
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0005_users"
down_revision: Union[str, None] = "0004_max_array_task"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("username", sa.String(length=50), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column(
            "role",
            sa.String(length=20),
            server_default="participant",
            nullable=False,
        ),
        sa.Column(
            "rating",
            sa.Integer(),
            server_default="0",
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("username"),
    )

    op.create_index(
        "ix_users_username",
        "users",
        ["username"],
        unique=True,
    )

    op.add_column(
        "submissions",
        sa.Column("user_id", sa.Integer(), nullable=True),
    )
    op.create_foreign_key(
        "fk_submissions_user_id_users",
        "submissions",
        "users",
        ["user_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(
        "ix_submissions_user_id",
        "submissions",
        ["user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_submissions_user_id", table_name="submissions")
    op.drop_constraint(
        "fk_submissions_user_id_users",
        "submissions",
        type_="foreignkey",
    )
    op.drop_column("submissions", "user_id")

    op.drop_index("ix_users_username", table_name="users")
    op.drop_table("users")
