"""synchronize task id sequence

Revision ID: 0024_sync_task_sequence
Revises: 0023_rebalance_rating
Create Date: 2026-09-25
"""

from typing import Sequence, Union

from alembic import op


revision: str = "0024_sync_task_sequence"
down_revision: Union[str, None] = "0023_rebalance_rating"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        SELECT setval(
            pg_get_serial_sequence('tasks', 'id'),
            COALESCE((SELECT MAX(id) FROM tasks), 1),
            EXISTS(SELECT 1 FROM tasks)
        )
        """
    )


def downgrade() -> None:
    # Sequence synchronization is data-state repair and should not be reversed.
    pass
