"""recalculate ratings from competition placements

Revision ID: 0011_recalculate_ratings
Revises: 0010_remove_result_text
Create Date: 2026-09-23
"""

from typing import Sequence, Union

from alembic import op


revision: str = "0011_recalculate_ratings"
down_revision: Union[str, None] = "0010_remove_result_text"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        UPDATE users
        SET rating = COALESCE(
            (
                SELECT SUM(
                    CASE
                        WHEN cr.place IS NULL OR cr.place > 10 THEN 0

                        WHEN c.level IN ('russia', 'all_russian') THEN
                            CASE
                                WHEN cr.place = 1 THEN 500
                                WHEN cr.place = 2 THEN 400
                                WHEN cr.place = 3 THEN 300
                                WHEN cr.place IN (4, 5) THEN 200
                                WHEN cr.place BETWEEN 6 AND 10 THEN 100
                                ELSE 0
                            END

                        WHEN c.level = 'interregional' THEN
                            CASE
                                WHEN cr.place = 1 THEN 300
                                WHEN cr.place = 2 THEN 250
                                WHEN cr.place = 3 THEN 150
                                WHEN cr.place IN (4, 5) THEN 100
                                WHEN cr.place BETWEEN 6 AND 10 THEN 50
                                ELSE 0
                            END

                        WHEN c.level IN (
                            'dagestan_championship',
                            'regional'
                        ) THEN
                            CASE
                                WHEN cr.place = 1 THEN 200
                                WHEN cr.place = 2 THEN 150
                                WHEN cr.place = 3 THEN 100
                                WHEN cr.place IN (4, 5) THEN 50
                                WHEN cr.place BETWEEN 6 AND 10 THEN 25
                                ELSE 0
                            END

                        ELSE 0
                    END
                )
                FROM competition_results AS cr
                JOIN competitions AS c
                    ON c.id = cr.competition_id
                WHERE cr.user_id = users.id
            ),
            0
        )
        """
    )


def downgrade() -> None:
    pass
