from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Submission, TaskTest
from app.runner import run_code


def normalize_output(value: str) -> str:
    lines = value.replace("\r\n", "\n").replace("\r", "\n").split("\n")
    return "\n".join(line.rstrip() for line in lines).strip()


def judge_submission(db: Session, submission: Submission) -> Submission:
    statement = (
        select(TaskTest)
        .where(
            TaskTest.task_id == submission.task_id,
            TaskTest.is_hidden.is_(True),
        )
        .order_by(TaskTest.id)
    )
    tests = db.scalars(statement).all()

    if not tests:
        submission.status = "no_tests"
        db.commit()
        db.refresh(submission)
        return submission

    submission.status = "running"
    db.commit()

    for test in tests:
        result = run_code(
            language=submission.language,
            code=submission.code,
            stdin=test.input_data,
        )

        if result.status != "ok":
            submission.status = result.status
            db.commit()
            db.refresh(submission)
            return submission

        if normalize_output(result.stdout) != normalize_output(test.expected_output):
            submission.status = "wrong_answer"
            db.commit()
            db.refresh(submission)
            return submission

    submission.status = "accepted"
    db.commit()
    db.refresh(submission)
    return submission
