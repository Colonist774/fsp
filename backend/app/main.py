from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Submission, Task
from app.schemas import SubmissionCreate, SubmissionRead, TaskRead


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"status": "ok"}


@app.get("/api/tasks", response_model=list[TaskRead])
def get_tasks(db: Session = Depends(get_db)):
    statement = select(Task).order_by(Task.id)
    return db.scalars(statement).all()


@app.get("/api/tasks/{task_id}", response_model=TaskRead)
def get_task(task_id: int, db: Session = Depends(get_db)):
    task = db.get(Task, task_id)

    if task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Задача не найдена",
        )

    return task


@app.post(
    "/api/submissions",
    response_model=SubmissionRead,
    status_code=status.HTTP_201_CREATED,
)
def create_submission(
    submission_data: SubmissionCreate,
    db: Session = Depends(get_db),
):
    task = db.get(Task, submission_data.task_id)

    if task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Задача не найдена",
        )

    submission = Submission(
        task_id=submission_data.task_id,
        code=submission_data.code,
    )

    db.add(submission)
    db.commit()
    db.refresh(submission)

    return submission
