"""add competition tasks and task authoring fields

Revision ID: 0019_competition_tasks
Revises: 0018_qualification_rating
Create Date: 2026-09-25
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0019_competition_tasks"
down_revision: Union[str, None] = "0018_qualification_rating"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "tasks",
        sa.Column(
            "constraints",
            sa.Text(),
            server_default="",
            nullable=False,
        ),
    )

    op.create_table(
        "competition_tasks",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("competition_id", sa.Integer(), nullable=False),
        sa.Column("task_id", sa.Integer(), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(
            ["competition_id"],
            ["competitions.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["task_id"],
            ["tasks.id"],
            ondelete="CASCADE",
        ),
        sa.UniqueConstraint(
            "competition_id",
            "task_id",
            name="uq_competition_tasks_competition_task",
        ),
        sa.UniqueConstraint(
            "competition_id",
            "position",
            name="uq_competition_tasks_competition_position",
        ),
    )
    op.create_index(
        "ix_competition_tasks_competition_id",
        "competition_tasks",
        ["competition_id"],
    )
    op.create_index(
        "ix_competition_tasks_task_id",
        "competition_tasks",
        ["task_id"],
    )

    op.add_column(
        "submissions",
        sa.Column("competition_id", sa.Integer(), nullable=True),
    )
    op.create_foreign_key(
        "fk_submissions_competition_id",
        "submissions",
        "competitions",
        ["competition_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(
        "ix_submissions_competition_id",
        "submissions",
        ["competition_id"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_submissions_competition_id",
        table_name="submissions",
    )
    op.drop_constraint(
        "fk_submissions_competition_id",
        "submissions",
        type_="foreignkey",
    )
    op.drop_column("submissions", "competition_id")

    op.drop_index(
        "ix_competition_tasks_task_id",
        table_name="competition_tasks",
    )
    op.drop_index(
        "ix_competition_tasks_competition_id",
        table_name="competition_tasks",
    )
    op.drop_table("competition_tasks")

    op.drop_column("tasks", "constraints")
