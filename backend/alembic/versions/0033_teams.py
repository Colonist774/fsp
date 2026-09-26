"""add teams

Revision ID: 0033_teams
Revises: 0032_comp_start_notice
Create Date: 2026-09-26
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0033_teams"
down_revision: Union[str, None] = "0032_comp_start_notice"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "teams",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column(
            "captain_user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.UniqueConstraint("name"),
    )
    op.create_index(op.f("ix_teams_name"), "teams", ["name"], unique=True)

    op.create_table(
        "team_members",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "team_id",
            sa.Integer(),
            sa.ForeignKey("teams.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "joined_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.UniqueConstraint("team_id", "user_id", name="uq_team_members_team_user"),
        sa.UniqueConstraint("user_id", name="uq_team_members_user"),
    )
    op.create_index(op.f("ix_team_members_team_id"), "team_members", ["team_id"])
    op.create_index(op.f("ix_team_members_user_id"), "team_members", ["user_id"])

    op.execute("""
        INSERT INTO teams (name, captain_user_id)
        SELECT team_name, MIN(id)
        FROM users
        WHERE team_status = 'member'
          AND team_name IS NOT NULL
          AND btrim(team_name) <> ''
        GROUP BY team_name
    """)

    op.execute("""
        INSERT INTO team_members (team_id, user_id)
        SELECT t.id, u.id
        FROM users AS u
        JOIN teams AS t ON t.name = u.team_name
        WHERE u.team_status = 'member'
          AND u.team_name IS NOT NULL
          AND btrim(u.team_name) <> ''
    """)

    op.execute("""
        UPDATE users
        SET team_status = 'solo', team_name = NULL
        WHERE team_status = 'member'
          AND (team_name IS NULL OR btrim(team_name) = '')
    """)


def downgrade() -> None:
    op.drop_index(op.f("ix_team_members_user_id"), table_name="team_members")
    op.drop_index(op.f("ix_team_members_team_id"), table_name="team_members")
    op.drop_table("team_members")
    op.drop_index(op.f("ix_teams_name"), table_name="teams")
    op.drop_table("teams")