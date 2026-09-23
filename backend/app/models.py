from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False,
        index=True,
    )
    email: Mapped[str | None] = mapped_column(
        String(254),
        unique=True,
        nullable=True,
        index=True,
    )
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)
    team_status: Mapped[str] = mapped_column(
        String(20),
        default="solo",
        server_default="solo",
        nullable=False,
    )
    team_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(
        String(20),
        default="participant",
        server_default="participant",
        nullable=False,
    )
    rating: Mapped[int] = mapped_column(
        Integer,
        default=0,
        server_default="0",
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    difficulty: Mapped[int] = mapped_column(Integer, nullable=False)

    description: Mapped[str] = mapped_column(Text, nullable=False)
    input: Mapped[str] = mapped_column(Text, default="", nullable=False)
    output: Mapped[str] = mapped_column(Text, default="", nullable=False)


class Submission(Base):
    __tablename__ = "submissions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    task_id: Mapped[int] = mapped_column(
        ForeignKey("tasks.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    code: Mapped[str] = mapped_column(Text, nullable=False)
    language: Mapped[str] = mapped_column(
        String(20),
        default="python",
        server_default="python",
        nullable=False,
    )
    status: Mapped[str] = mapped_column(
        String(30),
        default="pending",
        server_default="pending",
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


class TaskTest(Base):
    __tablename__ = "task_tests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    task_id: Mapped[int] = mapped_column(
        ForeignKey("tasks.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    input_data: Mapped[str] = mapped_column(Text, default="", nullable=False)
    expected_output: Mapped[str] = mapped_column(Text, nullable=False)
    is_hidden: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        server_default="true",
        nullable=False,
    )
