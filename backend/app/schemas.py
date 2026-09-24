from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


Language = Literal["python", "javascript", "cpp", "java"]
UserRole = Literal["participant", "organizer"]
TeamStatus = Literal["member", "looking", "solo"]
CompetitionLevel = Literal[
    "russia",
    "all_russian",
    "interregional",
    "regional_championship",
    "regional",
]
CompetitionFormat = Literal["online", "offline", "hybrid"]
CompetitionConductMode = Literal["platform", "external"]
CompetitionStatus = Literal["future", "active", "past"]


class CompetitionBase(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    description: str = Field(min_length=1, max_length=5000)
    level: CompetitionLevel
    discipline: str = Field(min_length=2, max_length=100)
    format: CompetitionFormat
    conduct_mode: CompetitionConductMode
    venue: str | None = Field(default=None, max_length=255)
    start_at: datetime
    end_at: datetime
    registration_deadline: datetime
    publish_tasks_after_finish: bool = False


class CompetitionCreate(CompetitionBase):
    pass


class CompetitionRead(CompetitionBase):
    id: int
    status: CompetitionStatus
    registration_open: bool
    is_registered: bool = False
    registered_count: int = 0
    created_by_user_id: int | None
    created_at: datetime


class CompetitionParticipantRead(BaseModel):
    user_id: int
    username: str
    email: str | None
    team_status: TeamStatus
    team_name: str | None
    registered_at: datetime
    place: int | None = None


class CompetitionResultUpdate(BaseModel):
    place: int | None = Field(default=None, ge=1)


class CompetitionResultRead(BaseModel):
    user_id: int
    username: str
    place: int | None
    rating_points: int


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
    user_id: int | None
    code: str
    language: Language
    status: str
    created_at: datetime


class UserRegister(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    email: str = Field(
        min_length=5,
        max_length=254,
        pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$",
    )
    password: str = Field(min_length=8, max_length=128)


class UserLogin(BaseModel):
    username: str
    password: str


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    role: UserRole
    rating: int
    created_at: datetime


class UserMe(UserRead):
    email: str | None
    bio: str | None
    full_name: str | None
    hide_full_name: bool
    locality: str | None
    education_org: str | None
    sports_disciplines: str | None
    sports_qualification: str | None
    team_status: TeamStatus
    team_name: str | None
    solved_tasks: int
    submissions: int


class UserProfileUpdate(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    email: str = Field(
        min_length=5,
        max_length=254,
        pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$",
    )
    bio: str | None = Field(default=None, max_length=1000)
    full_name: str | None = Field(default=None, max_length=200)
    hide_full_name: bool = False
    locality: str | None = Field(default=None, max_length=120)
    education_org: str | None = Field(default=None, max_length=200)
    sports_disciplines: str | None = Field(default=None, max_length=255)
    sports_qualification: str | None = Field(default=None, max_length=120)
    team_status: TeamStatus
    team_name: str | None = Field(default=None, max_length=100)


class CompetitionResultSummary(BaseModel):
    title: str
    place: int
    rating_points: int


class UserStatistics(BaseModel):
    rating: int
    rank: int
    competitions: int
    wins: int
    podiums: int
    recent_results: list[CompetitionResultSummary]


class AthleteResultRead(BaseModel):
    competition_id: int
    title: str
    place: int
    rating_points: int
    ended_at: datetime


class AthleteProfileRead(BaseModel):
    id: int
    username: str
    full_name: str | None
    hide_full_name: bool
    locality: str | None
    education_org: str | None
    sports_disciplines: str | None
    sports_qualification: str | None
    bio: str | None
    team_status: TeamStatus
    team_name: str | None
    rating: int
    rank: int
    competitions: int
    wins: int
    podiums: int
    results: list[AthleteResultRead]


class RankingEntry(BaseModel):
    rank: int
    user_id: int
    username: str
    team_status: TeamStatus
    team_name: str | None
    rating: int


class TokenRead(BaseModel):
    access_token: str
    token_type: str = "bearer"
