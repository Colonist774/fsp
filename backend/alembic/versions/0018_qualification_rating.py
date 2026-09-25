"""fix sports qualification values and rating

Revision ID: 0018_qualification_rating
Revises: 0017_restore_profile_fields
Create Date: 2026-09-25
"""

from typing import Sequence, Union

from alembic import op


revision: str = "0018_qualification_rating"
down_revision: Union[str, None] = "0017_restore_profile_fields"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


COMPETITION_POINTS_SQL = """
COALESCE(
    (
        SELECT SUM(
            CASE
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
                WHEN c.level IN ('regional_championship', 'regional') THEN
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
        FROM competition_results cr
        JOIN competitions c ON c.id = cr.competition_id
        WHERE cr.user_id = users.id
          AND cr.place IS NOT NULL
    ),
    0
)
"""


def upgrade() -> None:
    op.execute(
        """
        UPDATE users
        SET sports_qualification = CASE
            WHEN sports_qualification IS NULL THEN NULL
            WHEN LOWER(TRIM(sports_qualification)) IN (
                'змс',
                'заслуженный мастер спорта россии',
                'заслуженный мастер спорта россии (змс)'
            )
                THEN 'Заслуженный мастер спорта России (ЗМС)'
            WHEN LOWER(TRIM(sports_qualification)) IN (
                'мсмк',
                'гроссмейстер россии',
                'мсмк: гроссмейстер россии',
                'мастер спорта россии международного класса (мсмк)',
                'мастер спорта россии международного класса (мсмк): гроссмейстер россии'
            )
                THEN 'Мастер спорта России международного класса (МСМК): Гроссмейстер России'
            WHEN LOWER(TRIM(sports_qualification)) IN (
                'мс',
                'мастер спорта россии',
                'мастер спорта россии (мс)'
            )
                THEN 'Мастер спорта России (МС)'
            WHEN LOWER(TRIM(sports_qualification)) IN (
                'кмс',
                'кандидат в мастера спорта россии',
                'кандидат в мастера спорта россии (кмс)'
            )
                THEN 'Кандидат в мастера спорта России (КМС)'
            WHEN LOWER(TRIM(sports_qualification)) IN (
                '1 разряд',
                '1-й разряд',
                '1-й спортивный разряд'
            )
                THEN '1-й спортивный разряд'
            WHEN LOWER(TRIM(sports_qualification)) IN (
                '2 разряд',
                '2-й разряд',
                '2-й спортивный разряд'
            )
                THEN '2-й спортивный разряд'
            WHEN LOWER(TRIM(sports_qualification)) IN (
                '3 разряд',
                '3-й разряд',
                '3-й спортивный разряд'
            )
                THEN '3-й спортивный разряд'
            WHEN LOWER(TRIM(sports_qualification)) IN (
                '1 юношеский разряд',
                '1-й юношеский разряд'
            )
                THEN '1-й юношеский разряд'
            WHEN LOWER(TRIM(sports_qualification)) IN (
                '2 юношеский разряд',
                '2-й юношеский разряд'
            )
                THEN '2-й юношеский разряд'
            WHEN LOWER(TRIM(sports_qualification)) IN (
                '3 юношеский разряд',
                '3-й юношеский разряд',
                '3-й юношеский разряд.'
            )
                THEN '3-й юношеский разряд'
            ELSE NULL
        END
        """
    )

    op.execute(
        f"""
        UPDATE users
        SET rating =
            {COMPETITION_POINTS_SQL}
            + CASE sports_qualification
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
            END
        """
    )


def downgrade() -> None:
    op.execute(
        f"""
        UPDATE users
        SET rating = {COMPETITION_POINTS_SQL}
        """
    )
