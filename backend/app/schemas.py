from datetime import datetime

from pydantic import BaseModel, ConfigDict


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


class SubmissionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    task_id: int
    code: str
    created_at: datetime
