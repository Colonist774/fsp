from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth import (
    create_access_token,
    get_current_user,
    get_optional_current_user,
    hash_password,
    verify_password,
)
from app.database import get_db
from app.judge import judge_submission
from app.models import Submission, Task, User
from app.schemas import (
    SubmissionCreate,
    SubmissionRead,
    TaskRead,
    TokenRead,
    UserLogin,
    UserMe,
    UserProfileUpdate,
    UserRead,
    UserRegister,
    UserStatistics,
)


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


@app.post(
    "/api/register",
    response_model=UserRead,
    status_code=status.HTTP_201_CREATED,
)
def register(
    user_data: UserRegister,
    db: Session = Depends(get_db),
):
    username = user_data.username.strip()
    email = user_data.email.strip().lower()

    if len(username) < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Имя пользователя должно содержать минимум 3 символа",
        )

    existing_user = db.scalar(
        select(User).where(User.username == username)
    )

    if existing_user is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Пользователь с таким именем уже существует",
        )

    existing_email = db.scalar(
        select(User).where(User.email == email)
    )

    if existing_email is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Пользователь с таким email уже существует",
        )

    user = User(
        username=username,
        email=email,
        password_hash=hash_password(user_data.password),
        role="participant",
        rating=0,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user


@app.post("/api/login", response_model=TokenRead)
def login(
    user_data: UserLogin,
    db: Session = Depends(get_db),
):
    username = user_data.username.strip()

    user = db.scalar(
        select(User).where(User.username == username)
    )

    if user is None or not verify_password(
        user_data.password,
        user.password_hash,
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверное имя пользователя или пароль",
        )

    return TokenRead(
        access_token=create_access_token(user),
    )


def build_user_me(
    user: User,
    db: Session,
) -> UserMe:
    submissions_count = db.scalar(
        select(func.count(Submission.id)).where(
            Submission.user_id == user.id
        )
    ) or 0

    solved_tasks_count = db.scalar(
        select(func.count(func.distinct(Submission.task_id))).where(
            Submission.user_id == user.id,
            Submission.status == "accepted",
        )
    ) or 0

    return UserMe(
        id=user.id,
        username=user.username,
        email=user.email,
        bio=user.bio,
        team_status=user.team_status,
        team_name=user.team_name,
        role=user.role,
        rating=user.rating,
        created_at=user.created_at,
        solved_tasks=solved_tasks_count,
        submissions=submissions_count,
    )


@app.get("/api/me", response_model=UserMe)
def get_me(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return build_user_me(current_user, db)


@app.get("/api/me/statistics", response_model=UserStatistics)
def get_my_statistics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    higher_rated_users = db.scalar(
        select(func.count(User.id)).where(
            User.role == "participant",
            User.rating > current_user.rating,
        )
    ) or 0

    return UserStatistics(
        rating=current_user.rating,
        rank=higher_rated_users + 1,
        competitions=0,
        wins=0,
        podiums=0,
        recent_results=[],
    )


@app.patch("/api/me/profile", response_model=UserMe)
def update_profile(
    profile_data: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    username = profile_data.username.strip()
    email = profile_data.email.strip().lower()
    bio = profile_data.bio.strip() if profile_data.bio else None
    team_name = profile_data.team_name.strip() if profile_data.team_name else None

    if len(username) < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Имя пользователя должно содержать минимум 3 символа",
        )

    existing_user = db.scalar(
        select(User).where(
            User.username == username,
            User.id != current_user.id,
        )
    )

    if existing_user is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Пользователь с таким именем уже существует",
        )

    existing_email = db.scalar(
        select(User).where(
            User.email == email,
            User.id != current_user.id,
        )
    )

    if existing_email is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Пользователь с таким email уже существует",
        )

    if profile_data.team_status == "member" and not team_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Укажите название команды",
        )

    current_user.username = username
    current_user.email = email
    current_user.bio = bio
    current_user.team_status = profile_data.team_status
    current_user.team_name = (
        team_name if profile_data.team_status == "member" else None
    )

    db.commit()
    db.refresh(current_user)

    return build_user_me(current_user, db)


def get_solved_task_ids(
    db: Session,
    current_user: User | None,
) -> set[int]:
    if current_user is None:
        return set()

    statement = (
        select(Submission.task_id)
        .where(
            Submission.user_id == current_user.id,
            Submission.status == "accepted",
        )
        .distinct()
    )

    return set(db.scalars(statement).all())


@app.get("/api/tasks", response_model=list[TaskRead])
def get_tasks(
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_current_user),
):
    statement = select(Task).order_by(Task.id)
    tasks = db.scalars(statement).all()
    solved_task_ids = get_solved_task_ids(db, current_user)

    return [
        TaskRead.model_validate(task).model_copy(
            update={"solved": task.id in solved_task_ids}
        )
        for task in tasks
    ]


@app.get("/api/tasks/{task_id}", response_model=TaskRead)
def get_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_current_user),
):
    task = db.get(Task, task_id)

    if task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Задача не найдена",
        )

    solved_task_ids = get_solved_task_ids(db, current_user)

    return TaskRead.model_validate(task).model_copy(
        update={"solved": task.id in solved_task_ids}
    )


@app.post(
    "/api/submissions",
    response_model=SubmissionRead,
    status_code=status.HTTP_201_CREATED,
)
def create_submission(
    submission_data: SubmissionCreate,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_current_user),
):
    task = db.get(Task, submission_data.task_id)

    if task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Задача не найдена",
        )

    submission = Submission(
        task_id=submission_data.task_id,
        user_id=current_user.id if current_user is not None else None,
        code=submission_data.code,
        language=submission_data.language,
        status="pending",
    )

    db.add(submission)
    db.commit()
    db.refresh(submission)

    return judge_submission(db, submission)
