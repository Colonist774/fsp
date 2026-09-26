from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from app.auth import hash_password
from app.database import SessionLocal
from app.demo_seed import seed_demo_data
from app.models import (
    Competition,
    CompetitionRegistration,
    CompetitionResult,
    CompetitionTask,
    Submission,
    Task,
    User,
)


DEMO_PASSWORD = "FspDemo2026!"

DEMO_USERS = [
    {
        "username": "demo_organizer",
        "email": "organizer@fsp.demo",
        "full_name": "Организатор ФСП",
        "role": "organizer",
    },
    {
        "username": "demo_ivan",
        "email": "ivan@fsp.demo",
        "full_name": "Иван Петров",
        "role": "participant",
    },
    {
        "username": "demo_sofia",
        "email": "sofia@fsp.demo",
        "full_name": "София Магомедова",
        "role": "participant",
    },
    {
        "username": "demo_timur",
        "email": "timur@fsp.demo",
        "full_name": "Тимур Алиев",
        "role": "participant",
    },
]

TASK_TITLES = [
    "Сумма двух чисел",
    "Максимум и его позиция",
    "Суммы на отрезках",
]


def ensure_demo_users() -> None:
    with SessionLocal() as db:
        for data in DEMO_USERS:
            user = db.scalar(
                select(User).where(
                    User.username == data["username"]
                )
            )

            if user is None:
                user = User(
                    username=data["username"],
                    email=data["email"],
                    password_hash=hash_password(DEMO_PASSWORD),
                    role=data["role"],
                    rating=0,
                )
                db.add(user)

            user.email = data["email"]
            user.full_name = data["full_name"]
            user.hide_full_name = False
            user.locality = "Махачкала"
            user.hide_locality = False
            user.education_org = "Демонстрационный профиль"
            user.sports_disciplines = "Алгоритмическое программирование"
            user.sports_qualification = None
            user.team_status = "solo"
            user.team_name = None
            user.role = data["role"]
            user.organizer_probation_until = None
            user.password_hash = hash_password(DEMO_PASSWORD)

        db.commit()


def seed_case_demo() -> None:
    ensure_demo_users()

    # Reuse the realistic future competitions and task bank.
    seed_demo_data()

    now = datetime.now(timezone.utc)

    with SessionLocal() as db:
        organizer = db.scalar(
            select(User).where(
                User.username == "demo_organizer"
            )
        )
        participants = {
            user.username: user
            for user in db.scalars(
                select(User).where(
                    User.username.in_(
                        ["demo_ivan", "demo_sofia", "demo_timur"]
                    )
                )
            ).all()
        }

        existing = db.scalar(
            select(Competition).where(
                Competition.title == "Демо-контест: финальный раунд"
            )
        )

        if existing is not None:
            print("Демонстрационный контест уже существует.")
            print_credentials()
            return

        tasks = {
            task.title: task
            for task in db.scalars(
                select(Task).where(
                    Task.title.in_(TASK_TITLES)
                )
            ).all()
        }

        if organizer is None or len(tasks) != len(TASK_TITLES):
            raise RuntimeError(
                "Не удалось подготовить демонстрационные данные"
            )

        start_at = now - timedelta(hours=3)
        end_at = now - timedelta(hours=1)

        competition = Competition(
            title="Демо-контест: финальный раунд",
            description=(
                "Завершённое демонстрационное соревнование для показа "
                "полного сценария: регистрация, решения, проверка, "
                "итоговая таблица и пересчёт рейтинга."
            ),
            rules=(
                "Участнику доступны три задачи. Можно отправлять несколько "
                "решений. Лучший результат по каждой задаче учитывается в "
                "итоговой сумме. Организатор может выставить ручную оценку."
            ),
            level="regional",
            discipline="Алгоритмическое программирование",
            format="online",
            conduct_mode="platform",
            venue=None,
            start_at=start_at,
            end_at=end_at,
            registration_deadline=start_at - timedelta(hours=1),
            published_at=start_at - timedelta(days=1),
            results_finalized_at=now,
            publish_tasks_after_finish=True,
            created_by_user_id=organizer.id,
        )
        db.add(competition)
        db.flush()

        task_points = {
            "Сумма двух чисел": 100,
            "Максимум и его позиция": 150,
            "Суммы на отрезках": 250,
        }

        for position, title in enumerate(TASK_TITLES, start=1):
            db.add(
                CompetitionTask(
                    competition_id=competition.id,
                    task_id=tasks[title].id,
                    position=position,
                    points=task_points[title],
                )
            )

        for user in participants.values():
            db.add(
                CompetitionRegistration(
                    competition_id=competition.id,
                    user_id=user.id,
                    registered_at=start_at - timedelta(hours=2),
                    finished_at=end_at - timedelta(minutes=10),
                )
            )

        submissions = [
            # Иван: 500 баллов, все задачи приняты автоматически.
            (
                "demo_ivan",
                "Сумма двух чисел",
                "python",
                "a, b = map(int, input().split())\nprint(a + b)\n",
                "accepted",
                None,
            ),
            (
                "demo_ivan",
                "Максимум и его позиция",
                "python",
                (
                    "n = int(input())\n"
                    "a = list(map(int, input().split()))\n"
                    "m = max(a)\n"
                    "print(m, a.index(m) + 1)\n"
                ),
                "accepted",
                None,
            ),
            (
                "demo_ivan",
                "Суммы на отрезках",
                "python",
                (
                    "n, q = map(int, input().split())\n"
                    "a = list(map(int, input().split()))\n"
                    "p = [0]\n"
                    "for x in a: p.append(p[-1] + x)\n"
                    "for _ in range(q):\n"
                    "    l, r = map(int, input().split())\n"
                    "    print(p[r] - p[l - 1])\n"
                ),
                "accepted",
                None,
            ),
            # София: одна принятая задача и две частичные ручные оценки.
            (
                "demo_sofia",
                "Сумма двух чисел",
                "cpp",
                (
                    "#include <iostream>\n"
                    "using namespace std;\n"
                    "int main(){long long a,b; cin>>a>>b; cout<<a+b;}\n"
                ),
                "accepted",
                None,
            ),
            (
                "demo_sofia",
                "Максимум и его позиция",
                "cpp",
                (
                    "#include <iostream>\n"
                    "#include <vector>\n"
                    "using namespace std;\n"
                    "int main(){int n; cin>>n; vector<int>a(n); "
                    "for(int&x:a)cin>>x; cout<<a[0]<<\" 1\";}\n"
                ),
                "wrong_answer",
                120,
            ),
            (
                "demo_sofia",
                "Суммы на отрезках",
                "cpp",
                (
                    "#include <iostream>\n"
                    "int main(){ return 0; }\n"
                ),
                "wrong_answer",
                80,
            ),
            # Тимур: одна задача на 150 баллов.
            (
                "demo_timur",
                "Максимум и его позиция",
                "java",
                (
                    "import java.util.*;\n"
                    "class Main { public static void main(String[] a) {\n"
                    "Scanner s=new Scanner(System.in); int n=s.nextInt();\n"
                    "int best=s.nextInt(), pos=1;\n"
                    "for(int i=2;i<=n;i++){int x=s.nextInt();"
                    "if(x>best){best=x;pos=i;}}\n"
                    "System.out.println(best+\" \"+pos); }}\n"
                ),
                "accepted",
                None,
            ),
        ]

        for index, (
            username,
            task_title,
            language,
            code,
            verdict,
            manual_score,
        ) in enumerate(submissions):
            task = tasks[task_title]
            db.add(
                Submission(
                    task_id=task.id,
                    competition_id=competition.id,
                    user_id=participants[username].id,
                    code=code,
                    language=language,
                    status=verdict,
                    judged_test_revision=(
                        task.test_revision
                        if verdict == "accepted"
                        else task.test_revision
                    ),
                    manual_score=manual_score,
                    reviewed_by_user_id=(
                        organizer.id
                        if manual_score is not None
                        else None
                    ),
                    reviewed_at=(
                        end_at
                        if manual_score is not None
                        else None
                    ),
                    created_at=start_at + timedelta(minutes=10 + index * 8),
                )
            )

        final_places = {
            "demo_ivan": (1, 100),
            "demo_sofia": (2, 75),
            "demo_timur": (3, 60),
        }

        for username, (place, rating) in final_places.items():
            user = participants[username]
            db.add(
                CompetitionResult(
                    competition_id=competition.id,
                    user_id=user.id,
                    place=place,
                )
            )
            user.rating = rating

        db.commit()

    print("Демонстрационные данные готовы.")
    print_credentials()


def print_credentials() -> None:
    print()
    print("Организатор: demo_organizer / " + DEMO_PASSWORD)
    print("Спортсмен:  demo_ivan / " + DEMO_PASSWORD)
    print("Спортсмен:  demo_sofia / " + DEMO_PASSWORD)
    print("Спортсмен:  demo_timur / " + DEMO_PASSWORD)


if __name__ == "__main__":
    seed_case_demo()
