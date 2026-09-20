from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, HTTPException

class SubmissionCreate(BaseModel):
    task_id: int
    code: str

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

@app.post("/api/submissions")
def create_submission(submission: SubmissionCreate):
    return {
        "task_id": submission.task_id,
        "code": submission.code,
    }

@app.get("/api/tasks")
def get_tasks():
    return tasks

@app.get("/api/tasks/{task_id}")
def get_task(task_id: int):
    for task in tasks:
        if task["id"] == task_id:
            return task

    raise HTTPException(
        status_code=404,
        detail="Задача не найдена"
    )

tasks = [
    {
        "id": 1,
        "title": "Быстрая сортировка",
        "difficulty": 3,
        "solved": False,
        "description": "Напишите алгоритм быстрой сортировки данных",
        "input": "",
        "output": "",
    },
    {
        "id": 2,
        "title": "Работа со строками",
        "difficulty": 1,
        "solved": False,
        "description": "Объедините две исходные строки в одну",
        "input": "",
        "output": "",
    },
    {
        "id": 3,
        "title": "Работа с числами",
        "difficulty": 1,
        "solved": False,
        "description": "Объедините две исходные строки в одну",
        "input": "",
        "output": "",
    },
]