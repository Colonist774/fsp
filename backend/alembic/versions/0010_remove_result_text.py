"""remove free-form competition result text

Revision ID: 0010_remove_result_text
Revises: 0009_competition_results
Create Date: 2026-09-23
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0010_remove_result_text"
down_revision: Union[str, None] = "0009_competition_results"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "DELETE FROM competition_results WHERE place IS NULL"
    )
    op.drop_column("competition_results", "result_text")


def downgrade() -> None:
    op.add_column(
        "competition_results",
        sa.Column(
            "result_text",
            sa.String(length=255),
            nullable=True,
        ),
    )
