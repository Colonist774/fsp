from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


Language = Literal["python", "javascript", "cpp", "java"]
UserRole = Literal["participant", "organizer"]


class TaskRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    difficulty: int
    solved: bool = False
    description: str
    input: str
    output: str


class SubmissionCreate(BaseModel):
    task_id: int
    code: str
    language: Language


class SubmissionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    task_id: int
    user_id: int | None
    code: str
    language: Language
    status: str
    created_at: datetime


class UserRegister(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=8, max_length=128)


class UserLogin(BaseModel):
    username: str
    password: str


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    role: UserRole
    rating: int
    created_at: datetime


class UserMe(UserRead):
    solved_tasks: int
    submissions: int


class TokenRead(BaseModel):
    access_token: str
    token_type: str = "bearer"
