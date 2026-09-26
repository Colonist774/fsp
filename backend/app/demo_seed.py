from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from app.database import SessionLocal
from app.models import (
    Competition,
    CompetitionTask,
    Task,
    TaskTest,
    User,
)


TASKS = [
    {
        "title": "Сумма двух чисел",
        "difficulty": 1,
        "description": "Даны два целых числа a и b. Выведите их сумму.",
        "input": "В одной строке записаны два целых числа a и b.",
        "output": "Выведите одно число — a + b.",
        "constraints": "-10^9 ≤ a, b ≤ 10^9",
        "points": 100,
        "tests": [
            ("2 3\n", "5\n", False),
            ("-7 12\n", "5\n", True),
            ("0 0\n", "0\n", True),
            ("1000000000 -1000000000\n", "0\n", True),
        ],
    },
    {
        "title": "Количество чётных элементов",
        "difficulty": 1,
        "description": "Дан массив целых чисел. Посчитайте количество чётных элементов.",
        "input": "В первой строке дано n. Во второй строке — n целых чисел.",
        "output": "Выведите количество чётных элементов массива.",
        "constraints": "1 ≤ n ≤ 100000, |a_i| ≤ 10^9",
        "points": 100,
        "tests": [
            ("6\n1 2 3 4 5 6\n", "3\n", False),
            ("5\n-2 -4 7 9 10\n", "3\n", True),
            ("4\n1 3 5 7\n", "0\n", True),
            ("1\n0\n", "1\n", True),
        ],
    },
    {
        "title": "Максимум и его позиция",
        "difficulty": 2,
        "description": "Найдите максимальный элемент массива и номер его первого вхождения. Нумерация начинается с 1.",
        "input": "В первой строке дано n. Во второй строке — n целых чисел.",
        "output": "Выведите максимальный элемент и его позицию через пробел.",
        "constraints": "1 ≤ n ≤ 100000, |a_i| ≤ 10^9",
        "points": 150,
        "tests": [
            ("5\n4 9 1 9 2\n", "9 2\n", False),
            ("4\n-5 -2 -8 -2\n", "-2 2\n", True),
            ("1\n42\n", "42 1\n", True),
            ("5\n7 7 7 7 7\n", "7 1\n", True),
        ],
    },
    {
        "title": "Количество различных",
        "difficulty": 2,
        "description": "Определите, сколько различных значений встречается в массиве.",
        "input": "В первой строке дано n. Во второй строке — n целых чисел.",
        "output": "Выведите количество различных значений.",
        "constraints": "1 ≤ n ≤ 200000, |a_i| ≤ 10^9",
        "points": 150,
        "tests": [
            ("7\n1 2 2 3 1 4 4\n", "4\n", False),
            ("5\n1 1 1 1 1\n", "1\n", True),
            ("6\n-1 0 -1 2 2 3\n", "4\n", True),
            ("1\n99\n", "1\n", True),
        ],
    },
    {
        "title": "Самый длинный подъём",
        "difficulty": 3,
        "description": "Найдите длину самого длинного непрерывного строго возрастающего фрагмента массива.",
        "input": "В первой строке дано n. Во второй строке — n целых чисел.",
        "output": "Выведите длину максимального строго возрастающего непрерывного фрагмента.",
        "constraints": "1 ≤ n ≤ 200000, |a_i| ≤ 10^9",
        "points": 200,
        "tests": [
            ("8\n1 2 3 2 3 4 5 1\n", "4\n", False),
            ("5\n5 4 3 2 1\n", "1\n", True),
            ("6\n1 2 2 3 4 5\n", "4\n", True),
            ("1\n10\n", "1\n", True),
        ],
    },
    {
        "title": "Скобочная последовательность",
        "difficulty": 3,
        "description": "Проверьте, является ли строка из круглых скобок правильной скобочной последовательностью.",
        "input": "В единственной строке дана непустая строка из символов '(' и ')'.",
        "output": "Выведите YES, если последовательность правильная, иначе NO.",
        "constraints": "1 ≤ длина строки ≤ 200000",
        "points": 200,
        "tests": [
            ("(()())\n", "YES\n", False),
            ("(()\n", "NO\n", True),
            ("()()()\n", "YES\n", True),
            (")(\n", "NO\n", True),
        ],
    },
    {
        "title": "Самое частое число",
        "difficulty": 3,
        "description": "Найдите число, которое встречается в массиве чаще всего. Если таких чисел несколько, выведите наименьшее.",
        "input": "В первой строке дано n. Во второй строке — n целых чисел.",
        "output": "Выведите искомое число.",
        "constraints": "1 ≤ n ≤ 200000, |a_i| ≤ 10^9",
        "points": 200,
        "tests": [
            ("8\n1 3 3 2 2 3 1 2\n", "2\n", False),
            ("5\n7 7 7 7 7\n", "7\n", True),
            ("6\n-1 -1 2 2 3 3\n", "-1\n", True),
            ("4\n9 8 7 6\n", "6\n", True),
        ],
    },
    {
        "title": "Суммы на отрезках",
        "difficulty": 3,
        "description": "Для каждого запроса найдите сумму элементов массива на отрезке [l, r].",
        "input": "Первая строка: n и q. Вторая строка: n чисел. Далее q строк с l и r. Нумерация с 1.",
        "output": "Для каждого запроса выведите сумму на отдельной строке.",
        "constraints": "1 ≤ n, q ≤ 200000, |a_i| ≤ 10^9",
        "points": 250,
        "tests": [
            ("5 3\n1 2 3 4 5\n1 3\n2 5\n4 4\n", "6\n14\n4\n", False),
            ("4 2\n-1 2 -3 4\n1 4\n2 3\n", "2\n-1\n", True),
            ("3 3\n5 5 5\n1 1\n1 3\n3 3\n", "5\n15\n5\n", True),
        ],
    },
    {
        "title": "Первое вхождение",
        "difficulty": 3,
        "description": "В отсортированном массиве найдите позицию первого вхождения числа x.",
        "input": "Первая строка: n и x. Вторая строка: n целых чисел в неубывающем порядке.",
        "output": "Выведите позицию первого вхождения x (с 1) или -1, если x отсутствует.",
        "constraints": "1 ≤ n ≤ 200000, |a_i|, |x| ≤ 10^9",
        "points": 250,
        "tests": [
            ("7 4\n1 2 4 4 4 8 9\n", "3\n", False),
            ("5 6\n1 2 3 4 5\n", "-1\n", True),
            ("4 2\n2 2 2 2\n", "1\n", True),
            ("5 1\n1 3 5 7 9\n", "1\n", True),
        ],
    },
    {
        "title": "НОД массива",
        "difficulty": 2,
        "description": "Найдите наибольший общий делитель всех элементов массива.",
        "input": "В первой строке дано n. Во второй строке — n неотрицательных целых чисел.",
        "output": "Выведите НОД всех элементов.",
        "constraints": "1 ≤ n ≤ 100000, 0 ≤ a_i ≤ 10^9, хотя бы один элемент ненулевой",
        "points": 150,
        "tests": [
            ("4\n24 36 60 48\n", "12\n", False),
            ("3\n7 13 29\n", "1\n", True),
            ("1\n100\n", "100\n", True),
            ("5\n0 18 24 30 42\n", "6\n", True),
        ],
    },
    {
        "title": "Сколько простых чисел",
        "difficulty": 3,
        "description": "Посчитайте количество простых чисел, не превосходящих N.",
        "input": "Дано одно целое число N.",
        "output": "Выведите количество простых чисел от 2 до N включительно.",
        "constraints": "1 ≤ N ≤ 2000000",
        "points": 250,
        "tests": [
            ("10\n", "4\n", False),
            ("1\n", "0\n", True),
            ("2\n", "1\n", True),
            ("30\n", "10\n", True),
        ],
    },
    {
        "title": "Кратчайший путь",
        "difficulty": 4,
        "description": "Дан неориентированный невзвешенный граф. Найдите длину кратчайшего пути из вершины s в вершину t.",
        "input": "Первая строка: n, m, s, t. Далее m строк с рёбрами u v.",
        "output": "Выведите длину кратчайшего пути или -1, если пути нет.",
        "constraints": "1 ≤ n ≤ 200000, 0 ≤ m ≤ 300000",
        "points": 350,
        "tests": [
            ("5 5 1 5\n1 2\n2 3\n3 5\n1 4\n4 5\n", "2\n", False),
            ("4 2 1 4\n1 2\n2 3\n", "-1\n", True),
            ("3 3 2 3\n1 2\n2 3\n1 3\n", "1\n", True),
            ("4 1 2 2\n1 4\n", "0\n", True),
        ],
    },
    {
        "title": "Пересечение массивов",
        "difficulty": 2,
        "description": "Даны два отсортированных массива различных целых чисел. Выведите их пересечение в возрастающем порядке.",
        "input": "Первая строка: n и m. Вторая строка: первый массив. Третья строка: второй массив.",
        "output": "Выведите общие элементы через пробел. Если общих элементов нет, выведите пустую строку.",
        "constraints": "1 ≤ n, m ≤ 200000",
        "points": 150,
        "tests": [
            ("5 6\n1 2 3 5 8\n2 3 4 5 7 8\n", "2 3 5 8\n", False),
            ("3 3\n1 3 5\n2 4 6\n", "\n", True),
            ("4 5\n-3 -1 2 10\n-5 -1 0 1 2\n", "-1 2\n", True),
        ],
    },
    {
        "title": "Слияние интервалов",
        "difficulty": 4,
        "description": "Объедините все пересекающиеся или соприкасающиеся отрезки.",
        "input": "В первой строке дано n. Далее n строк: l r. Гарантируется l ≤ r.",
        "output": "Сначала выведите количество полученных отрезков, затем каждый отрезок l r на новой строке.",
        "constraints": "1 ≤ n ≤ 200000, |l|, |r| ≤ 10^9",
        "points": 350,
        "tests": [
            ("4\n1 3\n2 6\n8 10\n9 12\n", "2\n1 6\n8 12\n", False),
            ("3\n1 2\n4 5\n8 9\n", "3\n1 2\n4 5\n8 9\n", True),
            ("3\n1 10\n2 3\n4 7\n", "1\n1 10\n", True),
            ("3\n1 2\n2 3\n3 4\n", "1\n1 4\n", True),
        ],
    },
    {
        "title": "Компоненты связности",
        "difficulty": 4,
        "description": "Определите количество компонент связности в неориентированном графе.",
        "input": "В первой строке даны n и m. Далее m строк содержат рёбра u v.",
        "output": "Выведите количество компонент связности.",
        "constraints": "1 ≤ n ≤ 200000, 0 ≤ m ≤ 300000",
        "points": 350,
        "tests": [
            ("6 3\n1 2\n2 3\n4 5\n", "3\n", False),
            ("4 0\n", "4\n", True),
            ("5 4\n1 2\n2 3\n3 4\n4 5\n", "1\n", True),
            ("7 4\n1 2\n2 3\n4 5\n6 7\n", "3\n", True),
        ],
    },
]


ONLINE_COMPETITIONS = [
    {
        "title": "Осенний старт: алгоритмы",
        "description": "Короткий онлайн-турнир для разминки перед основной серией. Три задачи базового уровня на аккуратную реализацию и работу с массивами.",
        "level": "regional",
        "discipline": "Алгоритмическое программирование",
        "days": 2,
        "hour": 15,
        "duration_hours": 2,
        "task_indexes": [0, 1, 2],
    },
    {
        "title": "Кубок региона — онлайн-спринт",
        "description": "Соревнование на скорость и стабильность. В наборе задачи на множества, линейный проход и работу со скобочными последовательностями.",
        "level": "regional_championship",
        "discipline": "Алгоритмическое программирование",
        "days": 7,
        "hour": 13,
        "duration_hours": 2,
        "task_indexes": [3, 4, 5],
    },
    {
        "title": "Код Кавказа Online",
        "description": "Межрегиональный онлайн-раунд. Задачи требуют уверенной работы со словарями, префиксными суммами и двоичным поиском.",
        "level": "interregional",
        "discipline": "Алгоритмическое программирование",
        "days": 12,
        "hour": 14,
        "duration_hours": 3,
        "task_indexes": [6, 7, 8],
    },
    {
        "title": "Всероссийский квалификационный раунд",
        "description": "Онлайн-квалификация с задачами на теорию чисел, решето и поиск кратчайшего пути в графе.",
        "level": "all_russian",
        "discipline": "Алгоритмическое программирование",
        "days": 19,
        "hour": 12,
        "duration_hours": 3,
        "task_indexes": [9, 10, 11],
    },
    {
        "title": "Финальный онлайн-кубок ФСП",
        "description": "Сложный завершающий раунд месяца. Участникам понадобятся два указателя, сортировка событий и обход графа.",
        "level": "russia",
        "discipline": "Алгоритмическое программирование",
        "days": 27,
        "hour": 11,
        "duration_hours": 4,
        "task_indexes": [12, 13, 14],
    },
]


OFFLINE_COMPETITIONS = [
    {
        "title": "Чемпионат Дагестана по алгоритмическому программированию",
        "description": "Очный региональный чемпионат для студентов и молодых специалистов. Индивидуальный зачёт, классический формат алгоритмического тура.",
        "level": "regional_championship",
        "discipline": "Алгоритмическое программирование",
        "days": 4,
        "hour": 7,
        "duration_hours": 5,
        "venue": "Махачкала, Дагестанский государственный технический университет",
    },
    {
        "title": "Студенческий турнир «Код Кавказа»",
        "description": "Очный межвузовский турнир Северного Кавказа с командным зачётом и серией практических алгоритмических задач.",
        "level": "interregional",
        "discipline": "Алгоритмическое программирование",
        "days": 9,
        "hour": 7,
        "duration_hours": 5,
        "venue": "Грозный, Грозненский государственный нефтяной технический университет",
    },
    {
        "title": "Южный кубок продуктовой разработки",
        "description": "Командное соревнование по созданию работающего программного продукта по заданному кейсу. Оценка архитектуры, интерфейса и презентации решения.",
        "level": "interregional",
        "discipline": "Продуктовое программирование",
        "days": 14,
        "hour": 6,
        "duration_hours": 8,
        "venue": "Ростов-на-Дону, конгресс-холл ДГТУ",
    },
    {
        "title": "Всероссийский турнир по информационной безопасности",
        "description": "Очный турнир по анализу защищённости, поиску уязвимостей и решению практических задач в изолированной инфраструктуре.",
        "level": "all_russian",
        "discipline": "Системы информационной безопасности",
        "days": 17,
        "hour": 7,
        "duration_hours": 6,
        "venue": "Москва, технологический кампус",
    },
    {
        "title": "Региональный чемпионат по программированию робототехники",
        "description": "Соревнование команд разработчиков автономных робототехнических систем. Участники проходят серию очных испытаний на полигоне.",
        "level": "regional_championship",
        "discipline": "Программирование робототехники",
        "days": 22,
        "hour": 7,
        "duration_hours": 7,
        "venue": "Махачкала, молодёжный инновационный центр",
    },
    {
        "title": "Кубок России по продуктовой разработке",
        "description": "Финальный очный турнир месяца. Команды получают общий кейс и за ограниченное время проектируют, реализуют и защищают программный продукт.",
        "level": "russia",
        "discipline": "Продуктовое программирование",
        "days": 29,
        "hour": 6,
        "duration_hours": 9,
        "venue": "Казань, ИТ-парк им. Башира Рамеева",
    },
]


def competition_times(
    base: datetime,
    days: int,
    hour: int,
    duration_hours: int,
) -> tuple[datetime, datetime, datetime]:
    start = (base + timedelta(days=days)).replace(
        hour=hour,
        minute=0,
        second=0,
        microsecond=0,
    )
    end = start + timedelta(hours=duration_hours)
    registration_deadline = start - timedelta(days=1)

    return start, end, registration_deadline


def get_or_create_task(db, data: dict) -> tuple[Task, bool]:
    task = db.scalar(
        select(Task).where(Task.title == data["title"])
    )

    if task is not None:
        return task, False

    task = Task(
        title=data["title"],
        difficulty=data["difficulty"],
        description=data["description"],
        input=data["input"],
        output=data["output"],
        constraints=data["constraints"],
    )
    db.add(task)
    db.flush()

    for input_data, expected_output, is_hidden in data["tests"]:
        db.add(
            TaskTest(
                task_id=task.id,
                input_data=input_data,
                expected_output=expected_output,
                is_hidden=is_hidden,
            )
        )

    return task, True


def get_or_create_competition(
    db,
    data: dict,
    *,
    base: datetime,
    created_by_user_id: int | None,
    conduct_mode: str,
    format_: str,
    venue: str | None = None,
) -> tuple[Competition, bool]:
    competition = db.scalar(
        select(Competition).where(
            Competition.title == data["title"]
        )
    )

    if competition is not None:
        return competition, False

    start_at, end_at, registration_deadline = competition_times(
        base,
        data["days"],
        data["hour"],
        data["duration_hours"],
    )

    competition = Competition(
        title=data["title"],
        description=data["description"],
        level=data["level"],
        discipline=data["discipline"],
        format=format_,
        conduct_mode=conduct_mode,
        venue=venue,
        start_at=start_at,
        end_at=end_at,
        registration_deadline=registration_deadline,
        published_at=base,
        publish_tasks_after_finish=(conduct_mode == "platform"),
        created_by_user_id=created_by_user_id,
    )
    db.add(competition)
    db.flush()

    return competition, True


def seed_demo_data() -> None:
    base = datetime.now(timezone.utc)

    with SessionLocal() as db:
        organizer_id = db.scalar(
            select(User.id)
            .where(User.role == "organizer")
            .order_by(User.id)
            .limit(1)
        )

        tasks: list[Task] = []
        created_tasks = 0

        for task_data in TASKS:
            task, created = get_or_create_task(
                db,
                task_data,
            )
            tasks.append(task)
            created_tasks += int(created)

        created_competitions = 0
        created_links = 0

        for competition_data in ONLINE_COMPETITIONS:
            competition, created = get_or_create_competition(
                db,
                competition_data,
                base=base,
                created_by_user_id=organizer_id,
                conduct_mode="platform",
                format_="online",
            )
            created_competitions += int(created)

            for position, task_index in enumerate(
                competition_data["task_indexes"],
                start=1,
            ):
                task = tasks[task_index]
                existing_link = db.scalar(
                    select(CompetitionTask).where(
                        CompetitionTask.competition_id == competition.id,
                        CompetitionTask.task_id == task.id,
                    )
                )

                if existing_link is not None:
                    continue

                db.add(
                    CompetitionTask(
                        competition_id=competition.id,
                        task_id=task.id,
                        position=position,
                        points=TASKS[task_index]["points"],
                    )
                )
                created_links += 1

        for competition_data in OFFLINE_COMPETITIONS:
            _, created = get_or_create_competition(
                db,
                competition_data,
                base=base,
                created_by_user_id=organizer_id,
                conduct_mode="external",
                format_="offline",
                venue=competition_data["venue"],
            )
            created_competitions += int(created)

        db.commit()

        print(
            "Готово: "
            f"создано задач — {created_tasks}, "
            f"соревнований — {created_competitions}, "
            f"связей соревнование-задача — {created_links}."
        )
        print(
            "Всего в наборе: "
            f"{len(TASKS)} задач, "
            f"{len(ONLINE_COMPETITIONS)} онлайн и "
            f"{len(OFFLINE_COMPETITIONS)} офлайн соревнований."
        )


if __name__ == "__main__":
    seed_demo_data()
