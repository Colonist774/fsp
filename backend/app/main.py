from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

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