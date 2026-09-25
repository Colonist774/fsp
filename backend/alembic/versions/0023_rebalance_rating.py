"""rebalance athlete rating model

Revision ID: 0023_rebalance_rating
Revises: 0022_competition_finalization
Create Date: 2026-09-25
"""

from typing import Sequence, Union

from alembic import op


revision: str = "0023_rebalance_rating"
down_revision: Union[str, None] = "0022_competition_finalization"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _recalculate_ratings(
    competition_points_sql: str,
    qualification_points_sql: str,
) -> None:
    op.execute(
        f"""
        UPDATE users
        SET rating =
            COALESCE(
                (
                    SELECT SUM({competition_points_sql})
                    FROM competition_results AS cr
                    JOIN competitions AS c
                      ON c.id = cr.competition_id
                    WHERE cr.user_id = users.id
                      AND cr.place IS NOT NULL
                ),
                0
            )
            + ({qualification_points_sql})
        """
    )


def upgrade() -> None:
    _recalculate_ratings(
        competition_points_sql={newCompetitionCase!r},
        qualification_points_sql={newQualificationCase!r},
    )


def downgrade() -> None:
    _recalculate_ratings(
        competition_points_sql={oldCompetitionCase!r},
        qualification_points_sql={oldQualificationCase!r},
    )
