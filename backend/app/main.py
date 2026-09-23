from datetime import datetime, timezone

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth import (
    create_access_token,
    get_current_user,
    get_optional_current_user,
    hash_password,
    require_organizer,
    verify_password,
)
from app.database import get_db
from app.judge import judge_submission
from app.models import Competition, CompetitionRegistration, Submission, Task, User
from app.schemas import (
    CompetitionCreate,
    CompetitionRead,
    RankingEntry,
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


def get_ranked_participants(
    db: Session,
    limit: int | None = None,
) -> list[User]:
    statement = (
        select(User)
        .where(User.role == "participant")
        .order_by(
            User.rating.desc(),
            func.lower(User.username),
            User.id,
        )
    )

    if limit is not None:
        statement = statement.limit(limit)

    return list(db.scalars(statement).all())


@app.get("/api/me/statistics", response_model=UserStatistics)
def get_my_statistics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    participants = get_ranked_participants(db)
    rank = next(
        (
            index
            for index, participant in enumerate(participants, start=1)
            if participant.id == current_user.id
        ),
        1,
    )

    return UserStatistics(
        rating=current_user.rating,
        rank=rank,
        competitions=0,
        wins=0,
        podiums=0,
        recent_results=[],
    )


@app.get("/api/rankings", response_model=list[RankingEntry])
def get_rankings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    participants = get_ranked_participants(db, limit=100)

    return [
        RankingEntry(
            rank=index,
            user_id=user.id,
            username=user.username,
            team_status=user.team_status,
            team_name=user.team_name,
            rating=user.rating,
        )
        for index, user in enumerate(participants, start=1)
    ]


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



def get_competition_status(
    competition: Competition,
    now: datetime | None = None,
) -> str:
    current_time = now or datetime.now(timezone.utc)

    if current_time < competition.start_at:
        return "future"

    if current_time > competition.end_at:
        return "past"

    return "active"


def build_competition_read(
    competition: Competition,
    db: Session,
    current_user: User | None = None,
) -> CompetitionRead:
    current_time = datetime.now(timezone.utc)
    competition_status = get_competition_status(
        competition,
        current_time,
    )

    registered_count = db.scalar(
        select(func.count(CompetitionRegistration.id)).where(
            CompetitionRegistration.competition_id == competition.id
        )
    ) or 0

    is_registered = False

    if current_user is not None:
        registration = db.scalar(
            select(CompetitionRegistration).where(
                CompetitionRegistration.competition_id == competition.id,
                CompetitionRegistration.user_id == current_user.id,
            )
        )
        is_registered = registration is not None

    return CompetitionRead(
        id=competition.id,
        title=competition.title,
        description=competition.description,
        level=competition.level,
        discipline=competition.discipline,
        format=competition.format,
        conduct_mode=competition.conduct_mode,
        venue=competition.venue,
        start_at=competition.start_at,
        end_at=competition.end_at,
        registration_deadline=competition.registration_deadline,
        publish_tasks_after_finish=competition.publish_tasks_after_finish,
        status=competition_status,
        registration_open=(
            competition_status == "future"
            and current_time <= competition.registration_deadline
        ),
        is_registered=is_registered,
        registered_count=registered_count,
        created_by_user_id=competition.created_by_user_id,
        created_at=competition.created_at,
    )


def validate_competition_data(
    competition_data: CompetitionCreate,
) -> None:
    if competition_data.end_at <= competition_data.start_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Время завершения должно быть позже времени начала",
        )

    if competition_data.registration_deadline > competition_data.start_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Регистрация должна завершиться не позже начала соревнования",
        )


@app.get("/api/competitions", response_model=list[CompetitionRead])
def get_competitions(
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_current_user),
):
    competitions = db.scalars(
        select(Competition).order_by(Competition.start_at)
    ).all()

    return [
        build_competition_read(competition, db, current_user)
        for competition in competitions
    ]


@app.get("/api/competitions/{competition_id}", response_model=CompetitionRead)
def get_competition(
    competition_id: int,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_current_user),
):
    competition = db.get(Competition, competition_id)

    if competition is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Соревнование не найдено",
        )

    return build_competition_read(competition, db, current_user)


@app.post(
    "/api/competitions",
    response_model=CompetitionRead,
    status_code=status.HTTP_201_CREATED,
)
def create_competition(
    competition_data: CompetitionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_organizer),
):
    validate_competition_data(competition_data)

    competition = Competition(
        **competition_data.model_dump(),
        created_by_user_id=current_user.id,
    )

    db.add(competition)
    db.commit()
    db.refresh(competition)

    return build_competition_read(competition, db, current_user)


@app.patch(
    "/api/competitions/{competition_id}",
    response_model=CompetitionRead,
)
def update_competition(
    competition_id: int,
    competition_data: CompetitionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_organizer),
):
    competition = db.get(Competition, competition_id)

    if competition is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Соревнование не найдено",
        )

    validate_competition_data(competition_data)

    for field, value in competition_data.model_dump().items():
        setattr(competition, field, value)

    db.commit()
    db.refresh(competition)

    return build_competition_read(competition, db, current_user)


@app.post(
    "/api/competitions/{competition_id}/register",
    response_model=CompetitionRead,
)
def register_for_competition(
    competition_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "participant":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Организатор не может регистрироваться как участник",
        )

    competition = db.get(Competition, competition_id)

    if competition is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Соревнование не найдено",
        )

    competition_view = build_competition_read(
        competition,
        db,
        current_user,
    )

    if competition_view.is_registered:
        return competition_view

    if not competition_view.registration_open:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Регистрация на соревнование закрыта",
        )

    registration = CompetitionRegistration(
        competition_id=competition.id,
        user_id=current_user.id,
    )
    db.add(registration)
    db.commit()

    return build_competition_read(
        competition,
        db,
        current_user,
    )



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
