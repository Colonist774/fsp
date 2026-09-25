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


NEW_COMPETITION_POINTS_SQL = """CASE c.level
    WHEN 'russia' THEN CASE cr.place
        WHEN 1 THEN 400 WHEN 2 THEN 300 WHEN 3 THEN 240
        WHEN 4 THEN 200 WHEN 5 THEN 160 WHEN 6 THEN 120
        WHEN 7 THEN 100 WHEN 8 THEN 80 WHEN 9 THEN 60
        WHEN 10 THEN 40 ELSE 0 END
    WHEN 'all_russian' THEN CASE cr.place
        WHEN 1 THEN 300 WHEN 2 THEN 225 WHEN 3 THEN 180
        WHEN 4 THEN 150 WHEN 5 THEN 120 WHEN 6 THEN 90
        WHEN 7 THEN 75 WHEN 8 THEN 60 WHEN 9 THEN 45
        WHEN 10 THEN 30 ELSE 0 END
    WHEN 'interregional' THEN CASE cr.place
        WHEN 1 THEN 200 WHEN 2 THEN 150 WHEN 3 THEN 120
        WHEN 4 THEN 100 WHEN 5 THEN 80 WHEN 6 THEN 60
        WHEN 7 THEN 50 WHEN 8 THEN 40 WHEN 9 THEN 30
        WHEN 10 THEN 20 ELSE 0 END
    WHEN 'regional_championship' THEN CASE cr.place
        WHEN 1 THEN 150 WHEN 2 THEN 115 WHEN 3 THEN 90
        WHEN 4 THEN 75 WHEN 5 THEN 60 WHEN 6 THEN 45
        WHEN 7 THEN 40 WHEN 8 THEN 30 WHEN 9 THEN 25
        WHEN 10 THEN 15 ELSE 0 END
    WHEN 'regional' THEN CASE cr.place
        WHEN 1 THEN 100 WHEN 2 THEN 75 WHEN 3 THEN 60
        WHEN 4 THEN 50 WHEN 5 THEN 40 WHEN 6 THEN 30
        WHEN 7 THEN 25 WHEN 8 THEN 20 WHEN 9 THEN 15
        WHEN 10 THEN 10 ELSE 0 END
    ELSE 0
END"""
OLD_COMPETITION_POINTS_SQL = """CASE c.level
    WHEN 'russia' THEN CASE cr.place
        WHEN 1 THEN 500 WHEN 2 THEN 400 WHEN 3 THEN 300
        WHEN 4 THEN 200 WHEN 5 THEN 200 WHEN 6 THEN 100
        WHEN 7 THEN 100 WHEN 8 THEN 100 WHEN 9 THEN 100
        WHEN 10 THEN 100 ELSE 0 END
    WHEN 'all_russian' THEN CASE cr.place
        WHEN 1 THEN 500 WHEN 2 THEN 400 WHEN 3 THEN 300
        WHEN 4 THEN 200 WHEN 5 THEN 200 WHEN 6 THEN 100
        WHEN 7 THEN 100 WHEN 8 THEN 100 WHEN 9 THEN 100
        WHEN 10 THEN 100 ELSE 0 END
    WHEN 'interregional' THEN CASE cr.place
        WHEN 1 THEN 300 WHEN 2 THEN 250 WHEN 3 THEN 150
        WHEN 4 THEN 100 WHEN 5 THEN 100 WHEN 6 THEN 50
        WHEN 7 THEN 50 WHEN 8 THEN 50 WHEN 9 THEN 50
        WHEN 10 THEN 50 ELSE 0 END
    WHEN 'regional_championship' THEN CASE cr.place
        WHEN 1 THEN 200 WHEN 2 THEN 150 WHEN 3 THEN 100
        WHEN 4 THEN 50 WHEN 5 THEN 50 WHEN 6 THEN 25
        WHEN 7 THEN 25 WHEN 8 THEN 25 WHEN 9 THEN 25
        WHEN 10 THEN 25 ELSE 0 END
    WHEN 'regional' THEN CASE cr.place
        WHEN 1 THEN 200 WHEN 2 THEN 150 WHEN 3 THEN 100
        WHEN 4 THEN 50 WHEN 5 THEN 50 WHEN 6 THEN 25
        WHEN 7 THEN 25 WHEN 8 THEN 25 WHEN 9 THEN 25
        WHEN 10 THEN 25 ELSE 0 END
    ELSE 0
END"""
NEW_QUALIFICATION_POINTS_SQL = """CASE users.sports_qualification
    WHEN 'Заслуженный мастер спорта России (ЗМС)' THEN 1600
    WHEN 'Мастер спорта России международного класса (МСМК): Гроссмейстер России' THEN 1200
    WHEN 'Мастер спорта России (МС)' THEN 800
    WHEN 'Кандидат в мастера спорта России (КМС)' THEN 500
    WHEN '1-й спортивный разряд' THEN 300
    WHEN '2-й спортивный разряд' THEN 200
    WHEN '3-й спортивный разряд' THEN 150
    WHEN '1-й юношеский разряд' THEN 100
    WHEN '2-й юношеский разряд' THEN 75
    WHEN '3-й юношеский разряд' THEN 50
    ELSE 0
END"""
OLD_QUALIFICATION_POINTS_SQL = """CASE users.sports_qualification
    WHEN 'Заслуженный мастер спорта России (ЗМС)' THEN 5000
    WHEN 'Мастер спорта России международного класса (МСМК): Гроссмейстер России' THEN 4000
    WHEN 'Мастер спорта России (МС)' THEN 3000
    WHEN 'Кандидат в мастера спорта России (КМС)' THEN 2000
    WHEN '1-й спортивный разряд' THEN 1500
    WHEN '2-й спортивный разряд' THEN 1000
    WHEN '3-й спортивный разряд' THEN 800
    WHEN '1-й юношеский разряд' THEN 500
    WHEN '2-й юношеский разряд' THEN 400
    WHEN '3-й юношеский разряд' THEN 300
    ELSE 0
END"""


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
        NEW_COMPETITION_POINTS_SQL,
        NEW_QUALIFICATION_POINTS_SQL,
    )


def downgrade() -> None:
    _recalculate_ratings(
        OLD_COMPETITION_POINTS_SQL,
        OLD_QUALIFICATION_POINTS_SQL,
    )
