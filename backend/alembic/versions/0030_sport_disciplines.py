"""add sport disciplines catalog

Revision ID: 0030_sport_disciplines
Revises: 0029_competition_execution_time
Create Date: 2026-09-26
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0030_sport_disciplines"
down_revision: Union[str, None] = "0029_competition_execution_time"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


INITIAL_DISCIPLINES = [
    "Продуктовое программирование",
    "Программирование беспилотных систем",
    "Алгоритмическое программирование",
    "Программирование защищенных систем",
]


def upgrade() -> None:
    op.create_table(
        "sport_disciplines",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.UniqueConstraint("name"),
    )
    op.create_index(
        op.f("ix_sport_disciplines_name"),
        "sport_disciplines",
        ["name"],
        unique=True,
    )

    table = sa.table(
        "sport_disciplines",
        sa.column("name", sa.String(length=100)),
    )
    op.bulk_insert(
        table,
        [{"name": name} for name in INITIAL_DISCIPLINES],
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_sport_disciplines_name"),
        table_name="sport_disciplines",
    )
    op.drop_table("sport_disciplines")
