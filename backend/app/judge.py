from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Submission, Task, TaskTest
from app.runner import RunResult, prepare_code


def normalize_output(value: str) -> str:
    lines = value.replace("\r\n", "\n").replace("\r", "\n").split("\n")
    return "\n".join(line.rstrip() for line in lines).strip()


def _current_task_revision(
    db: Session,
    task_id: int,
) -> int | None:
    task = db.scalar(
        select(Task)
        .where(Task.id == task_id)
        .with_for_update()
    )

    return task.test_revision if task is not None else None


def _save_final_status(
    db: Session,
    submission: Submission,
    status: str,
    tested_revision: int,
) -> bool:
    current_revision = _current_task_revision(
        db,
        submission.task_id,
    )

    if current_revision is None:
        submission.status = "runner_error"
        submission.judged_test_revision = None
        db.commit()
        db.refresh(submission)
        return True

    if current_revision != tested_revision:
        db.commit()
        return False

    submission.status = status
    submission.judged_test_revision = tested_revision
    db.commit()
    db.refresh(submission)
    return True


def judge_submission(db: Session, submission: Submission) -> Submission:
    submission.status = "running"
    submission.judged_test_revision = None
    db.commit()

    with prepare_code(
        language=submission.language,
        code=submission.code,
    ) as prepared:
        if isinstance(prepared, RunResult):
            while True:
                task = db.get(Task, submission.task_id)

                if task is None:
                    submission.status = "runner_error"
                    submission.judged_test_revision = None
                    db.commit()
                    db.refresh(submission)
                    return submission

                db.refresh(task)

                if _save_final_status(
                    db,
                    submission,
                    prepared.status,
                    task.test_revision,
                ):
                    return submission

        while True:
            task = db.get(Task, submission.task_id)

            if task is None:
                submission.status = "runner_error"
                submission.judged_test_revision = None
                db.commit()
                db.refresh(submission)
                return submission

            db.refresh(task)
            tested_revision = task.test_revision

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
                final_status = "no_tests"
            else:
                final_status = "accepted"

                for test in tests:
                    result = prepared.run(test.input_data)

                    if result.status != "ok":
                        final_status = result.status
                        break

                    if normalize_output(result.stdout) != normalize_output(
                        test.expected_output
                    ):
                        final_status = "wrong_answer"
                        break

            if _save_final_status(
                db,
                submission,
                final_status,
                tested_revision,
            ):
                return submission
