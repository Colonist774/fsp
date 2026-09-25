from datetime import datetime, timedelta, timezone
from pathlib import Path
from uuid import uuid4

from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.auth import (
    create_access_token,
    get_current_user,
    get_optional_current_user,
    hash_password,
    organizer_is_on_probation,
    require_organizer,
    require_trusted_organizer,
    verify_password,
)
from app.database import get_db
from app.judge import judge_submission
from app.models import (
    Competition,
    CompetitionRegistration,
    CompetitionResult,
    CompetitionTask,
    Announcement,
    Submission,
    Task,
    TaskTest,
    User,
)
from app.schemas import (
    CompetitionCreate,
    CompetitionParticipantRead,
    CompetitionRead,
    CompetitionResultRead,
    CompetitionResultUpdate,
    CompetitionSubmissionDraftRead,
    CompetitionTaskRead,
    AthleteProfileRead,
    AthleteQualificationRead,
    AthleteQualificationUpdate,
    AnnouncementCreate,
    AnnouncementRead,
    OrganizerAccessRead,
    RankingEntry,
    SubmissionCreate,
    SubmissionRead,
    TaskExampleData,
    TaskOrganizerCreate,
    TaskOrganizerRead,
    TaskRead,
    TaskTestData,
    TokenRead,
    UserLogin,
    UserMe,
    UserProfileUpdate,
    UserRead,
    UserRegister,
    UserStatistics,
)


UPLOADS_DIR = Path(__file__).resolve().parent.parent / "uploads"
ANNOUNCEMENT_UPLOADS_DIR = UPLOADS_DIR / "announcements"
ANNOUNCEMENT_UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI()
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")

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
        organizer_probation_until=user.organizer_probation_until,
        bio=user.bio,
        full_name=user.full_name,
        hide_full_name=user.hide_full_name,
        locality=user.locality,
        hide_locality=user.hide_locality,
        education_org=user.education_org,
        sports_disciplines=user.sports_disciplines,
        sports_qualification=user.sports_qualification,
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



QUALIFICATION_POINTS: dict[str, int] = {
    "Заслуженный мастер спорта России (ЗМС)": 5000,
    "Мастер спорта России международного класса (МСМК): Гроссмейстер России": 4000,
    "Мастер спорта России (МС)": 3000,
    "Кандидат в мастера спорта России (КМС)": 2000,
    "1-й спортивный разряд": 1500,
    "2-й спортивный разряд": 1000,
    "3-й спортивный разряд": 800,
    "1-й юношеский разряд": 500,
    "2-й юношеский разряд": 400,
    "3-й юношеский разряд": 300,
}


RATING_POINTS_BY_LEVEL: dict[str, dict[int, int]] = {
    "russia": {
        1: 500,
        2: 400,
        3: 300,
        4: 200,
        5: 200,
        6: 100,
        7: 100,
        8: 100,
        9: 100,
        10: 100,
    },
    "all_russian": {
        1: 500,
        2: 400,
        3: 300,
        4: 200,
        5: 200,
        6: 100,
        7: 100,
        8: 100,
        9: 100,
        10: 100,
    },
    "interregional": {
        1: 300,
        2: 250,
        3: 150,
        4: 100,
        5: 100,
        6: 50,
        7: 50,
        8: 50,
        9: 50,
        10: 50,
    },
    "regional_championship": {
        1: 200,
        2: 150,
        3: 100,
        4: 50,
        5: 50,
        6: 25,
        7: 25,
        8: 25,
        9: 25,
        10: 25,
    },
    "regional": {
        1: 200,
        2: 150,
        3: 100,
        4: 50,
        5: 50,
        6: 25,
        7: 25,
        8: 25,
        9: 25,
        10: 25,
    },
}


def get_rating_points(
    competition_level: str,
    place: int | None,
) -> int:
    if place is None:
        return 0

    return RATING_POINTS_BY_LEVEL.get(
        competition_level,
        {},
    ).get(place, 0)


def recalculate_user_rating(
    db: Session,
    user_id: int,
) -> None:
    user = db.get(User, user_id)

    if user is None:
        return

    rows = db.execute(
        select(
            Competition.level,
            CompetitionResult.place,
        )
        .join(
            Competition,
            Competition.id == CompetitionResult.competition_id,
        )
        .where(
            CompetitionResult.user_id == user_id,
            CompetitionResult.place.is_not(None),
        )
    ).all()

    competition_points = sum(
        get_rating_points(level, place)
        for level, place in rows
    )
    qualification_points = QUALIFICATION_POINTS.get(
        user.sports_qualification or "",
        0,
    )

    user.rating = competition_points + qualification_points


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
        None,
    )

    competitions_count = db.scalar(
        select(func.count(CompetitionResult.id)).where(
            CompetitionResult.user_id == current_user.id
        )
    ) or 0

    wins_count = db.scalar(
        select(func.count(CompetitionResult.id)).where(
            CompetitionResult.user_id == current_user.id,
            CompetitionResult.place == 1,
        )
    ) or 0

    podiums_count = db.scalar(
        select(func.count(CompetitionResult.id)).where(
            CompetitionResult.user_id == current_user.id,
            CompetitionResult.place.is_not(None),
            CompetitionResult.place <= 3,
        )
    ) or 0

    recent_rows = db.execute(
        select(
            Competition.title,
            Competition.level,
            CompetitionResult.place,
        )
        .join(
            CompetitionResult,
            CompetitionResult.competition_id == Competition.id,
        )
        .where(
            CompetitionResult.user_id == current_user.id,
            CompetitionResult.place.is_not(None),
        )
        .order_by(Competition.end_at.desc())
    ).all()

    return UserStatistics(
        rating=current_user.rating,
        rank=rank,
        competitions=competitions_count,
        wins=wins_count,
        podiums=podiums_count,
        recent_results=[
            {
                "title": title,
                "place": place,
                "rating_points": get_rating_points(level, place),
            }
            for title, level, place in recent_rows
        ],
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




@app.get("/api/athletes/{user_id}", response_model=AthleteProfileRead)
def get_athlete_profile(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    athlete = db.get(User, user_id)

    if athlete is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пользователь не найден",
        )

    rank = None

    if athlete.role == "participant":
        participants = get_ranked_participants(db)
        rank = next(
            (
                index
                for index, participant in enumerate(participants, start=1)
                if participant.id == athlete.id
            ),
            len(participants),
        )

    result_rows = db.execute(
        select(
            Competition.id,
            Competition.title,
            Competition.level,
            Competition.end_at,
            CompetitionResult.place,
        )
        .join(
            CompetitionResult,
            CompetitionResult.competition_id == Competition.id,
        )
        .where(
            CompetitionResult.user_id == athlete.id,
            CompetitionResult.place.is_not(None),
        )
        .order_by(Competition.end_at.desc())
    ).all()

    wins = sum(
        1
        for _, _, _, _, place in result_rows
        if place == 1
    )
    podiums = sum(
        1
        for _, _, _, _, place in result_rows
        if place <= 3
    )

    locality_visible = (
        not athlete.hide_locality
        or current_user.role == "organizer"
        or current_user.id == athlete.id
    )

    return AthleteProfileRead(
        id=athlete.id,
        username=athlete.username,
        full_name=athlete.full_name,
        hide_full_name=athlete.hide_full_name,
        locality=athlete.locality if locality_visible else None,
        hide_locality=athlete.hide_locality,
        education_org=athlete.education_org,
        sports_disciplines=athlete.sports_disciplines,
        sports_qualification=athlete.sports_qualification,
        bio=athlete.bio,
        team_status=athlete.team_status,
        team_name=athlete.team_name,
        rating=athlete.rating,
        rank=rank,
        competitions=len(result_rows),
        wins=wins,
        podiums=podiums,
        results=[
            {
                "competition_id": competition_id,
                "title": title,
                "place": place,
                "rating_points": get_rating_points(level, place),
                "ended_at": ended_at,
            }
            for competition_id, title, level, ended_at, place in result_rows
        ],
    )


@app.get("/api/organizers", response_model=list[OrganizerAccessRead])
def get_organizers(
    current_user: User = Depends(require_organizer),
    db: Session = Depends(get_db),
):
    organizers = list(
        db.scalars(
            select(User)
            .where(User.role == "organizer")
            .order_by(func.lower(User.username), User.id)
        ).all()
    )

    return [
        OrganizerAccessRead(
            id=user.id,
            username=user.username,
            full_name=user.full_name,
            organizer_probation_until=user.organizer_probation_until,
            on_probation=organizer_is_on_probation(user),
        )
        for user in organizers
    ]


@app.post(
    "/api/users/{user_id}/grant-organizer",
    response_model=OrganizerAccessRead,
)
def grant_organizer_role(
    user_id: int,
    current_user: User = Depends(require_trusted_organizer),
    db: Session = Depends(get_db),
):
    user = db.get(User, user_id)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пользователь не найден",
        )

    if user.role == "organizer":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Пользователь уже является организатором",
        )

    user.role = "organizer"
    user.organizer_probation_until = (
        datetime.now(timezone.utc) + timedelta(days=7)
    )

    db.commit()
    db.refresh(user)

    return OrganizerAccessRead(
        id=user.id,
        username=user.username,
        full_name=user.full_name,
        organizer_probation_until=user.organizer_probation_until,
        on_probation=True,
    )


@app.delete(
    "/api/users/{user_id}/organizer-rights",
    response_model=UserRead,
)
def revoke_organizer_role(
    user_id: int,
    current_user: User = Depends(require_trusted_organizer),
    db: Session = Depends(get_db),
):
    user = db.get(User, user_id)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пользователь не найден",
        )

    if user.role != "organizer":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Пользователь не является организатором",
        )

    if not organizer_is_on_probation(user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "После завершения испытательного срока "
                "права организатора нельзя отозвать"
            ),
        )

    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Нельзя отозвать права у самого себя",
        )

    user.role = "participant"
    user.organizer_probation_until = None

    db.commit()
    db.refresh(user)

    return user


@app.patch(
    "/api/athletes/{user_id}/qualification",
    response_model=AthleteQualificationRead,
)
def update_athlete_qualification(
    user_id: int,
    qualification_data: AthleteQualificationUpdate,
    current_user: User = Depends(require_organizer),
    db: Session = Depends(get_db),
):
    athlete = db.get(User, user_id)

    if athlete is None or athlete.role != "participant":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Спортсмен не найден",
        )

    athlete.sports_qualification = (
        qualification_data.sports_qualification
    )
    recalculate_user_rating(db, athlete.id)

    db.commit()
    db.refresh(athlete)

    participants = get_ranked_participants(db)
    rank = next(
        (
            index
            for index, participant in enumerate(participants, start=1)
            if participant.id == athlete.id
        ),
        len(participants),
    )

    return AthleteQualificationRead(
        sports_qualification=athlete.sports_qualification,
        qualification_points=QUALIFICATION_POINTS.get(
            athlete.sports_qualification or "",
            0,
        ),
        rating=athlete.rating,
        rank=rank,
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
    full_name = (
        profile_data.full_name.strip()
        if profile_data.full_name
        else None
    )
    locality = (
        profile_data.locality.strip()
        if profile_data.locality
        else None
    )
    education_org = (
        profile_data.education_org.strip()
        if profile_data.education_org
        else None
    )
    sports_disciplines = (
        profile_data.sports_disciplines.strip()
        if profile_data.sports_disciplines
        else None
    )
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
    current_user.full_name = full_name
    current_user.hide_full_name = profile_data.hide_full_name
    current_user.locality = locality
    current_user.hide_locality = profile_data.hide_locality
    current_user.education_org = education_org
    current_user.sports_disciplines = sports_disciplines
    current_user.team_status = profile_data.team_status
    current_user.team_name = (
        team_name if profile_data.team_status == "member" else None
    )

    db.commit()
    db.refresh(current_user)

    return build_user_me(current_user, db)


ALLOWED_ANNOUNCEMENT_IMAGES = {
    "image/jpeg": ("jpg", b"\xff\xd8\xff"),
    "image/png": ("png", b"\x89PNG\r\n\x1a\n"),
    "image/gif": ("gif", (b"GIF87a", b"GIF89a")),
    "image/webp": ("webp", b"RIFF"),
}
MAX_ANNOUNCEMENT_IMAGE_SIZE = 8 * 1024 * 1024


def is_valid_announcement_image(
    content_type: str,
    data: bytes,
) -> bool:
    image_config = ALLOWED_ANNOUNCEMENT_IMAGES.get(content_type)

    if image_config is None:
        return False

    _, signature = image_config

    if content_type == "image/gif":
        return any(data.startswith(item) for item in signature)

    if content_type == "image/webp":
        return (
            data.startswith(signature)
            and len(data) >= 12
            and data[8:12] == b"WEBP"
        )

    return data.startswith(signature)


def delete_announcement_image(image_url: str | None) -> None:
    if not image_url or not image_url.startswith(
        "/uploads/announcements/"
    ):
        return

    image_path = ANNOUNCEMENT_UPLOADS_DIR / Path(image_url).name

    if image_path.exists():
        image_path.unlink()


@app.post("/api/announcements/upload-image")
async def upload_announcement_image(
    request: Request,
    current_user: User = Depends(require_organizer),
):
    content_type = (
        request.headers.get("content-type", "")
        .split(";", 1)[0]
        .strip()
        .lower()
    )
    image_config = ALLOWED_ANNOUNCEMENT_IMAGES.get(content_type)

    if image_config is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Поддерживаются JPEG, PNG, WEBP и GIF",
        )

    data = await request.body()

    if not data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Файл изображения пуст",
        )

    if len(data) > MAX_ANNOUNCEMENT_IMAGE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Изображение должно быть не больше 8 МБ",
        )

    if not is_valid_announcement_image(content_type, data):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Некорректный файл изображения",
        )

    extension, _ = image_config
    filename = f"{uuid4().hex}.{extension}"
    image_path = ANNOUNCEMENT_UPLOADS_DIR / filename
    image_path.write_bytes(data)

    return {
        "image_url": f"/uploads/announcements/{filename}",
    }


@app.get("/api/announcements", response_model=list[AnnouncementRead])
def get_announcements(
    db: Session = Depends(get_db),
):
    return list(
        db.scalars(
            select(Announcement).order_by(
                Announcement.created_at.desc(),
                Announcement.id.desc(),
            )
        ).all()
    )


@app.get(
    "/api/announcements/{announcement_id}",
    response_model=AnnouncementRead,
)
def get_announcement(
    announcement_id: int,
    db: Session = Depends(get_db),
):
    announcement = db.get(Announcement, announcement_id)

    if announcement is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Анонс не найден",
        )

    return announcement


@app.post(
    "/api/announcements",
    response_model=AnnouncementRead,
    status_code=status.HTTP_201_CREATED,
)
def create_announcement(
    announcement_data: AnnouncementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_organizer),
):
    title = announcement_data.title.strip()
    content = announcement_data.content.strip()
    image_url = (
        announcement_data.image_url.strip()
        if announcement_data.image_url
        else None
    )

    if len(title) < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Название должно содержать минимум 3 символа",
        )

    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Введите текст анонса",
        )

    announcement = Announcement(
        title=title,
        content=content,
        image_url=image_url,
        created_by_user_id=current_user.id,
    )

    db.add(announcement)
    db.commit()
    db.refresh(announcement)

    return announcement


@app.patch(
    "/api/announcements/{announcement_id}",
    response_model=AnnouncementRead,
)
def update_announcement(
    announcement_id: int,
    announcement_data: AnnouncementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_organizer),
):
    announcement = db.get(Announcement, announcement_id)

    if announcement is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Анонс не найден",
        )

    title = announcement_data.title.strip()
    content = announcement_data.content.strip()
    image_url = (
        announcement_data.image_url.strip()
        if announcement_data.image_url
        else None
    )

    if len(title) < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Название должно содержать минимум 3 символа",
        )

    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Введите текст анонса",
        )

    previous_image_url = announcement.image_url

    announcement.title = title
    announcement.content = content
    announcement.image_url = image_url

    db.commit()
    db.refresh(announcement)

    if previous_image_url != image_url:
        delete_announcement_image(previous_image_url)

    return announcement


@app.delete(
    "/api/announcements/{announcement_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_announcement(
    announcement_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_organizer),
):
    announcement = db.get(Announcement, announcement_id)

    if announcement is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Анонс не найден",
        )

    image_url = announcement.image_url

    db.delete(announcement)
    db.commit()

    delete_announcement_image(image_url)


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
    participation_finished = False

    if current_user is not None:
        registration = db.scalar(
            select(CompetitionRegistration).where(
                CompetitionRegistration.competition_id == competition.id,
                CompetitionRegistration.user_id == current_user.id,
            )
        )
        is_registered = registration is not None
        participation_finished = (
            registration is not None
            and registration.finished_at is not None
        )

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
        participation_finished=participation_finished,
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
    cleanup_expired_competition_submissions(db)

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

    db.flush()

    result_user_ids = db.scalars(
        select(CompetitionResult.user_id).where(
            CompetitionResult.competition_id == competition_id
        )
    ).all()

    for user_id in set(result_user_ids):
        recalculate_user_rating(db, user_id)

    db.commit()
    db.refresh(competition)

    return build_competition_read(competition, db, current_user)


@app.get(
    "/api/competitions/{competition_id}/participants",
    response_model=list[CompetitionParticipantRead],
)
def get_competition_participants(
    competition_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_organizer),
):
    competition = db.get(Competition, competition_id)

    if competition is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Соревнование не найдено",
        )

    rows = db.execute(
        select(
            CompetitionRegistration,
            User,
            CompetitionResult,
        )
        .join(
            User,
            User.id == CompetitionRegistration.user_id,
        )
        .outerjoin(
            CompetitionResult,
            (CompetitionResult.competition_id == competition_id)
            & (CompetitionResult.user_id == User.id),
        )
        .where(
            CompetitionRegistration.competition_id == competition_id
        )
        .order_by(CompetitionRegistration.registered_at)
    ).all()

    return [
        CompetitionParticipantRead(
            user_id=user.id,
            username=user.username,
            email=user.email,
            team_status=user.team_status,
            team_name=user.team_name,
            registered_at=registration.registered_at,
            finished_at=registration.finished_at,
            place=result.place if result is not None else None,
        )
        for registration, user, result in rows
    ]


@app.get(
    "/api/competitions/{competition_id}/results",
    response_model=list[CompetitionResultRead],
)
def get_competition_results(
    competition_id: int,
    db: Session = Depends(get_db),
):
    competition = db.get(Competition, competition_id)

    if competition is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Соревнование не найдено",
        )

    rows = db.execute(
        select(CompetitionResult, User)
        .join(User, User.id == CompetitionResult.user_id)
        .where(
            CompetitionResult.competition_id == competition_id,
            CompetitionResult.place.is_not(None),
        )
        .order_by(
            CompetitionResult.place.asc().nulls_last(),
            func.lower(User.username),
        )
    ).all()

    return [
        CompetitionResultRead(
            user_id=user.id,
            username=user.username,
            place=result.place,
            rating_points=get_rating_points(
                competition.level,
                result.place,
            ),
        )
        for result, user in rows
    ]


@app.put(
    "/api/competitions/{competition_id}/results/{user_id}",
    response_model=CompetitionParticipantRead,
)
def save_competition_result(
    competition_id: int,
    user_id: int,
    result_data: CompetitionResultUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_organizer),
):
    competition = db.get(Competition, competition_id)

    if competition is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Соревнование не найдено",
        )

    if get_competition_status(competition) != "past":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Результаты можно вносить после завершения соревнования",
        )

    registration = db.scalar(
        select(CompetitionRegistration).where(
            CompetitionRegistration.competition_id == competition_id,
            CompetitionRegistration.user_id == user_id,
        )
    )

    if registration is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Участник не зарегистрирован на это соревнование",
        )

    user = db.get(User, user_id)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пользователь не найден",
        )

    result = db.scalar(
        select(CompetitionResult).where(
            CompetitionResult.competition_id == competition_id,
            CompetitionResult.user_id == user_id,
        )
    )

    if result_data.place is None:
        if result is not None:
            db.delete(result)
            db.flush()
            recalculate_user_rating(db, user_id)
            db.commit()

        return CompetitionParticipantRead(
            user_id=user.id,
            username=user.username,
            email=user.email,
            team_status=user.team_status,
            team_name=user.team_name,
            registered_at=registration.registered_at,
            finished_at=registration.finished_at,
            place=None,
        )

    if result is None:
        result = CompetitionResult(
            competition_id=competition_id,
            user_id=user_id,
        )
        db.add(result)

    result.place = result_data.place

    db.flush()
    recalculate_user_rating(db, user_id)
    db.commit()
    db.refresh(result)

    return CompetitionParticipantRead(
        user_id=user.id,
        username=user.username,
        email=user.email,
        team_status=user.team_status,
        team_name=user.team_name,
        registered_at=registration.registered_at,
        finished_at=registration.finished_at,
        place=result.place,
    )


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


@app.post(
    "/api/competitions/{competition_id}/finish",
    response_model=CompetitionRead,
)
def finish_competition_participation(
    competition_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "participant":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Завершать участие может только участник",
        )

    competition = db.get(Competition, competition_id)

    if competition is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Соревнование не найдено",
        )

    if competition.conduct_mode != "platform":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Это соревнование проводится вне платформы",
        )

    if get_competition_status(competition) != "active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Завершить участие можно только во время соревнования",
        )

    registration = db.scalar(
        select(CompetitionRegistration).where(
            CompetitionRegistration.competition_id == competition_id,
            CompetitionRegistration.user_id == current_user.id,
        )
    )

    if registration is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Вы не зарегистрированы на это соревнование",
        )

    if registration.finished_at is None:
        registration.finished_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(registration)

    return build_competition_read(
        competition,
        db,
        current_user,
    )


def cleanup_expired_competition_submissions(
    db: Session,
) -> None:
    cutoff = datetime.now(timezone.utc) - timedelta(days=30)
    expired_competition_ids = select(Competition.id).where(
        Competition.end_at <= cutoff
    )

    db.execute(
        delete(Submission).where(
            Submission.competition_id.in_(expired_competition_ids)
        )
    )
    db.commit()


def get_task_examples(
    db: Session,
    task_id: int,
) -> list[TaskExampleData]:
    examples = db.scalars(
        select(TaskTest)
        .where(
            TaskTest.task_id == task_id,
            TaskTest.is_hidden.is_(False),
        )
        .order_by(TaskTest.id)
    ).all()

    return [
        TaskExampleData(
            input_data=example.input_data,
            expected_output=example.expected_output,
        )
        for example in examples
    ]


def get_hidden_task_tests(
    db: Session,
    task_id: int,
) -> list[TaskTestData]:
    tests = db.scalars(
        select(TaskTest)
        .where(
            TaskTest.task_id == task_id,
            TaskTest.is_hidden.is_(True),
        )
        .order_by(TaskTest.id)
    ).all()

    return [
        TaskTestData(
            input_data=test.input_data,
            expected_output=test.expected_output,
        )
        for test in tests
    ]


def build_task_read(
    task: Task,
    db: Session,
    solved: bool = False,
) -> TaskRead:
    return TaskRead(
        id=task.id,
        title=task.title,
        difficulty=task.difficulty,
        solved=solved,
        description=task.description,
        input=task.input,
        output=task.output,
        constraints=task.constraints,
        examples=get_task_examples(db, task.id),
    )


def build_task_organizer_read(
    task: Task,
    db: Session,
) -> TaskOrganizerRead:
    public_task = build_task_read(task, db)

    return TaskOrganizerRead(
        **public_task.model_dump(),
        tests=get_hidden_task_tests(db, task.id),
    )


def task_is_collection_visible(
    db: Session,
    task_id: int,
) -> bool:
    links = db.execute(
        select(CompetitionTask, Competition)
        .join(
            Competition,
            Competition.id == CompetitionTask.competition_id,
        )
        .where(CompetitionTask.task_id == task_id)
    ).all()

    if not links:
        return True

    return any(
        competition.publish_tasks_after_finish
        and get_competition_status(competition) == "past"
        for _, competition in links
    )


def get_competition_task_link(
    db: Session,
    competition_id: int,
    task_id: int,
) -> CompetitionTask | None:
    return db.scalar(
        select(CompetitionTask).where(
            CompetitionTask.competition_id == competition_id,
            CompetitionTask.task_id == task_id,
        )
    )


def require_competition_task_access(
    competition: Competition,
    current_user: User,
    db: Session,
) -> None:
    if current_user.role == "organizer":
        return

    if competition.conduct_mode != "platform":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="У соревнования нет задач на платформе",
        )

    competition_status = get_competition_status(competition)

    if competition_status == "future":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Задачи откроются после начала соревнования",
        )

    registration = db.scalar(
        select(CompetitionRegistration).where(
            CompetitionRegistration.competition_id == competition.id,
            CompetitionRegistration.user_id == current_user.id,
        )
    )

    if registration is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Задачи доступны только участникам соревнования",
        )


def replace_task_tests(
    db: Session,
    task: Task,
    task_data: TaskOrganizerCreate,
) -> None:
    existing_tests = db.scalars(
        select(TaskTest).where(TaskTest.task_id == task.id)
    ).all()

    for test in existing_tests:
        db.delete(test)

    for example in task_data.examples:
        db.add(
            TaskTest(
                task_id=task.id,
                input_data=example.input_data,
                expected_output=example.expected_output,
                is_hidden=False,
            )
        )

    for test in task_data.tests:
        db.add(
            TaskTest(
                task_id=task.id,
                input_data=test.input_data,
                expected_output=test.expected_output,
                is_hidden=True,
            )
        )


@app.get(
    "/api/competitions/{competition_id}/tasks",
    response_model=list[CompetitionTaskRead],
)
def get_competition_tasks(
    competition_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    competition = db.get(Competition, competition_id)

    if competition is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Соревнование не найдено",
        )

    require_competition_task_access(
        competition,
        current_user,
        db,
    )

    rows = db.execute(
        select(CompetitionTask, Task)
        .join(Task, Task.id == CompetitionTask.task_id)
        .where(CompetitionTask.competition_id == competition_id)
        .order_by(CompetitionTask.position)
    ).all()

    return [
        CompetitionTaskRead(
            task_id=task.id,
            position=link.position,
            title=task.title,
            difficulty=task.difficulty,
        )
        for link, task in rows
    ]


@app.get(
    "/api/competitions/{competition_id}/tasks/{task_id}",
    response_model=TaskRead,
)
def get_competition_task(
    competition_id: int,
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    competition = db.get(Competition, competition_id)

    if competition is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Соревнование не найдено",
        )

    require_competition_task_access(
        competition,
        current_user,
        db,
    )

    if get_competition_task_link(db, competition_id, task_id) is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Задача не найдена в этом соревновании",
        )

    task = db.get(Task, task_id)

    if task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Задача не найдена",
        )

    solved_task_ids = get_solved_task_ids(db, current_user)

    return build_task_read(
        task,
        db,
        solved=task.id in solved_task_ids,
    )


@app.get(
    "/api/competitions/{competition_id}/tasks/{task_id}/latest-submission",
    response_model=CompetitionSubmissionDraftRead | None,
)
def get_latest_competition_submission(
    competition_id: int,
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    cleanup_expired_competition_submissions(db)

    competition = db.get(Competition, competition_id)

    if competition is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Соревнование не найдено",
        )

    require_competition_task_access(
        competition,
        current_user,
        db,
    )

    if get_competition_task_link(db, competition_id, task_id) is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Задача не найдена в этом соревновании",
        )

    submission = db.scalar(
        select(Submission)
        .where(
            Submission.competition_id == competition_id,
            Submission.task_id == task_id,
            Submission.user_id == current_user.id,
        )
        .order_by(
            Submission.created_at.desc(),
            Submission.id.desc(),
        )
        .limit(1)
    )

    if submission is None:
        return None

    return CompetitionSubmissionDraftRead(
        code=submission.code,
        language=submission.language,
        status=submission.status,
        created_at=submission.created_at,
    )


@app.post(
    "/api/organizer/competitions/{competition_id}/tasks",
    response_model=TaskOrganizerRead,
    status_code=status.HTTP_201_CREATED,
)
def create_competition_task(
    competition_id: int,
    task_data: TaskOrganizerCreate,
    current_user: User = Depends(require_organizer),
    db: Session = Depends(get_db),
):
    competition = db.get(Competition, competition_id)

    if competition is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Соревнование не найдено",
        )

    if competition.conduct_mode != "platform":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Задачи можно добавлять только для соревнований на платформе",
        )

    task = Task(
        title=task_data.title.strip(),
        difficulty=task_data.difficulty,
        description=task_data.description.strip(),
        input=task_data.input.strip(),
        output=task_data.output.strip(),
        constraints=task_data.constraints.strip(),
    )
    db.add(task)
    db.flush()

    max_position = db.scalar(
        select(func.max(CompetitionTask.position)).where(
            CompetitionTask.competition_id == competition_id
        )
    ) or 0

    db.add(
        CompetitionTask(
            competition_id=competition_id,
            task_id=task.id,
            position=max_position + 1,
        )
    )

    replace_task_tests(db, task, task_data)

    db.commit()
    db.refresh(task)

    return build_task_organizer_read(task, db)


@app.get(
    "/api/organizer/competitions/{competition_id}/tasks/{task_id}",
    response_model=TaskOrganizerRead,
)
def get_competition_task_for_organizer(
    competition_id: int,
    task_id: int,
    current_user: User = Depends(require_organizer),
    db: Session = Depends(get_db),
):
    competition = db.get(Competition, competition_id)

    if competition is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Соревнование не найдено",
        )

    if get_competition_task_link(db, competition_id, task_id) is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Задача не найдена в этом соревновании",
        )

    task = db.get(Task, task_id)

    if task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Задача не найдена",
        )

    return build_task_organizer_read(task, db)


@app.patch(
    "/api/organizer/competitions/{competition_id}/tasks/{task_id}",
    response_model=TaskOrganizerRead,
)
def update_competition_task(
    competition_id: int,
    task_id: int,
    task_data: TaskOrganizerCreate,
    current_user: User = Depends(require_organizer),
    db: Session = Depends(get_db),
):
    competition = db.get(Competition, competition_id)

    if competition is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Соревнование не найдено",
        )

    if get_competition_task_link(db, competition_id, task_id) is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Задача не найдена в этом соревновании",
        )

    task = db.get(Task, task_id)

    if task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Задача не найдена",
        )

    task.title = task_data.title.strip()
    task.difficulty = task_data.difficulty
    task.description = task_data.description.strip()
    task.input = task_data.input.strip()
    task.output = task_data.output.strip()
    task.constraints = task_data.constraints.strip()

    replace_task_tests(db, task, task_data)

    db.commit()
    db.refresh(task)

    return build_task_organizer_read(task, db)


@app.delete(
    "/api/organizer/competitions/{competition_id}/tasks/{task_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_competition_task(
    competition_id: int,
    task_id: int,
    current_user: User = Depends(require_organizer),
    db: Session = Depends(get_db),
):
    link = get_competition_task_link(
        db,
        competition_id,
        task_id,
    )

    if link is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Задача не найдена в этом соревновании",
        )

    task = db.get(Task, task_id)

    if task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Задача не найдена",
        )

    db.delete(task)
    db.commit()


@app.get("/api/tasks", response_model=list[TaskRead])
def get_tasks(
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_current_user),
):
    tasks = db.scalars(select(Task).order_by(Task.id)).all()
    solved_task_ids = get_solved_task_ids(db, current_user)

    return [
        build_task_read(
            task,
            db,
            solved=task.id in solved_task_ids,
        )
        for task in tasks
        if task_is_collection_visible(db, task.id)
    ]


@app.get("/api/tasks/{task_id}", response_model=TaskRead)
def get_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_current_user),
):
    task = db.get(Task, task_id)

    if task is None or not task_is_collection_visible(db, task_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Задача не найдена",
        )

    solved_task_ids = get_solved_task_ids(db, current_user)

    return build_task_read(
        task,
        db,
        solved=task.id in solved_task_ids,
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
    cleanup_expired_competition_submissions(db)

    task = db.get(Task, submission_data.task_id)

    if task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Задача не найдена",
        )

    if submission_data.competition_id is not None:
        if current_user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Требуется авторизация",
            )

        competition = db.get(
            Competition,
            submission_data.competition_id,
        )

        if competition is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Соревнование не найдено",
            )

        if current_user.role != "organizer":
            if get_competition_status(competition) != "active":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Отправлять решения можно только во время соревнования",
                )

            require_competition_task_access(
                competition,
                current_user,
                db,
            )

            registration = db.scalar(
                select(CompetitionRegistration).where(
                    CompetitionRegistration.competition_id == competition.id,
                    CompetitionRegistration.user_id == current_user.id,
                )
            )

            if (
                registration is not None
                and registration.finished_at is not None
            ):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Вы уже завершили участие в соревновании",
                )

        if get_competition_task_link(
            db,
            competition.id,
            task.id,
        ) is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Задача не найдена в этом соревновании",
            )
    elif not task_is_collection_visible(db, task.id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Задача не найдена",
        )

    submission = Submission(
        task_id=submission_data.task_id,
        competition_id=submission_data.competition_id,
        user_id=current_user.id if current_user is not None else None,
        code=submission_data.code,
        language=submission_data.language,
        status="pending",
    )

    db.add(submission)
    db.commit()
    db.refresh(submission)

    return judge_submission(db, submission)
