"""add competitions and registrations

Revision ID: 0008_competitions
Revises: 0007_user_profile
Create Date: 2026-09-23
"""

from datetime import datetime, timedelta, timezone
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0008_competitions"
down_revision: Union[str, None] = "0007_user_profile"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "competitions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column(
            "description",
            sa.Text(),
            server_default="",
            nullable=False,
        ),
        sa.Column("level", sa.String(length=40), nullable=False),
        sa.Column("discipline", sa.String(length=100), nullable=False),
        sa.Column("format", sa.String(length=20), nullable=False),
        sa.Column("conduct_mode", sa.String(length=20), nullable=False),
        sa.Column("venue", sa.String(length=255), nullable=True),
        sa.Column(
            "start_at",
            sa.DateTime(timezone=True),
            nullable=False,
        ),
        sa.Column(
            "end_at",
            sa.DateTime(timezone=True),
            nullable=False,
        ),
        sa.Column(
            "registration_deadline",
            sa.DateTime(timezone=True),
            nullable=False,
        ),
        sa.Column(
            "publish_tasks_after_finish",
            sa.Boolean(),
            server_default="false",
            nullable=False,
        ),
        sa.Column(
            "created_by_user_id",
            sa.Integer(),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["created_by_user_id"],
            ["users.id"],
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_competitions_created_by_user_id",
        "competitions",
        ["created_by_user_id"],
        unique=False,
    )

    op.create_table(
        "competition_registrations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("competition_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column(
            "registered_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["competition_id"],
            ["competitions.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "competition_id",
            "user_id",
            name="uq_competition_registrations_competition_user",
        ),
    )
    op.create_index(
        "ix_competition_registrations_competition_id",
        "competition_registrations",
        ["competition_id"],
        unique=False,
    )
    op.create_index(
        "ix_competition_registrations_user_id",
        "competition_registrations",
        ["user_id"],
        unique=False,
    )

    competitions = sa.table(
        "competitions",
        sa.column("title", sa.String()),
        sa.column("description", sa.Text()),
        sa.column("level", sa.String()),
        sa.column("discipline", sa.String()),
        sa.column("format", sa.String()),
        sa.column("conduct_mode", sa.String()),
        sa.column("venue", sa.String()),
        sa.column("start_at", sa.DateTime(timezone=True)),
        sa.column("end_at", sa.DateTime(timezone=True)),
        sa.column(
            "registration_deadline",
            sa.DateTime(timezone=True),
        ),
        sa.column("publish_tasks_after_finish", sa.Boolean()),
    )

    moscow_time = timezone(timedelta(hours=3))

    op.bulk_insert(
        competitions,
        [
            {
                "title": "Чемпионат Дагестана по алгоритмическому программированию",
                "description": "Соревнование по алгоритмическому программированию.",
                "level": "dagestan_championship",
                "discipline": "Алгоритмическое программирование",
                "format": "online",
                "conduct_mode": "platform",
                "venue": None,
                "start_at": datetime(2026, 9, 20, 12, 0, tzinfo=moscow_time),
                "end_at": datetime(2026, 9, 20, 20, 0, tzinfo=moscow_time),
                "registration_deadline": datetime(2026, 9, 20, 11, 0, tzinfo=moscow_time),
                "publish_tasks_after_finish": True,
            },
            {
                "title": "Осенний кубок ФСП",
                "description": "Соревнование Федерации спортивного программирования.",
                "level": "regional",
                "discipline": "Алгоритмическое программирование",
                "format": "online",
                "conduct_mode": "platform",
                "venue": None,
                "start_at": datetime(2026, 9, 19, 10, 0, tzinfo=moscow_time),
                "end_at": datetime(2026, 9, 19, 14, 0, tzinfo=moscow_time),
                "registration_deadline": datetime(2026, 9, 19, 9, 0, tzinfo=moscow_time),
                "publish_tasks_after_finish": True,
            },
            {
                "title": "Турнир первокурсников",
                "description": "Турнир для начинающих участников.",
                "level": "regional",
                "discipline": "Алгоритмическое программирование",
                "format": "offline",
                "conduct_mode": "external",
                "venue": "Махачкала",
                "start_at": datetime(2026, 9, 18, 15, 0, tzinfo=moscow_time),
                "end_at": datetime(2026, 9, 18, 18, 0, tzinfo=moscow_time),
                "registration_deadline": datetime(2026, 9, 18, 12, 0, tzinfo=moscow_time),
                "publish_tasks_after_finish": False,
            },
            {
                "title": "Открытый алгоритмический турнир",
                "description": "Открытый турнир по алгоритмическому программированию.",
                "level": "regional",
                "discipline": "Алгоритмическое программирование",
                "format": "online",
                "conduct_mode": "platform",
                "venue": None,
                "start_at": datetime(2026, 9, 25, 16, 0, tzinfo=moscow_time),
                "end_at": datetime(2026, 9, 25, 20, 0, tzinfo=moscow_time),
                "registration_deadline": datetime(2026, 9, 25, 15, 0, tzinfo=moscow_time),
                "publish_tasks_after_finish": True,
            },
            {
                "title": "Кубок по спортивному программированию",
                "description": "Кубок по спортивному программированию.",
                "level": "regional",
                "discipline": "Алгоритмическое программирование",
                "format": "offline",
                "conduct_mode": "external",
                "venue": "Махачкала",
                "start_at": datetime(2026, 10, 3, 11, 0, tzinfo=moscow_time),
                "end_at": datetime(2026, 10, 3, 17, 0, tzinfo=moscow_time),
                "registration_deadline": datetime(2026, 10, 2, 23, 59, tzinfo=moscow_time),
                "publish_tasks_after_finish": False,
            },
        ],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_competition_registrations_user_id",
        table_name="competition_registrations",
    )
    op.drop_index(
        "ix_competition_registrations_competition_id",
        table_name="competition_registrations",
    )
    op.drop_table("competition_registrations")

    op.drop_index(
        "ix_competitions_created_by_user_id",
        table_name="competitions",
    )
    op.drop_table("competitions")
