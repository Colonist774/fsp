from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict


Language = Literal["python", "javascript", "cpp", "java"]


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
    code: str
    language: Language
    status: str
    created_at: datetime
