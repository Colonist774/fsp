"""rename regional championship competition level

Revision ID: 0012_regional_championship
Revises: 0011_recalculate_ratings
Create Date: 2026-09-24
"""

from typing import Sequence, Union

from alembic import op


revision: str = "0012_regional_championship"
down_revision: Union[str, None] = "0011_recalculate_ratings"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        UPDATE competitions
        SET level = 'regional_championship'
        WHERE level = 'dagestan_championship'
        """
    )


def downgrade() -> None:
    op.execute(
        """
        UPDATE competitions
        SET level = 'dagestan_championship'
        WHERE level = 'regional_championship'
        """
    )
