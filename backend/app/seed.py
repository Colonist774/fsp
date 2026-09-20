from sqlalchemy import select

from app.database import SessionLocal
from app.models import Task


SEED_TASKS = [
    {
        "title": "Быстрая сортировка",
        "difficulty": 3,
        "description": "Напишите алгоритм быстрой сортировки данных",
        "input": "",
        "output": "",
    },
    {
        "title": "Работа со строками",
        "difficulty": 1,
        "description": "Объедините две исходные строки в одну",
        "input": "",
        "output": "",
    },
    {
        "title": "Поиск максимального элемента массива",
        "difficulty": 1,
        "description": (
            "Дан массив целых чисел. Выведите его максимальный элемент.\n\n"
            "Пример:\n"
            "Ввод: -1 21 37 4 -8\n"
            "Вывод: 37"
        ),
        "input": "В одной строке даны целые числа через пробел.",
        "output": "Выведите наибольшее число массива.",
    },
]


def seed_tasks() -> None:
    with SessionLocal() as db:
        existing_task_id = db.scalar(select(Task.id).limit(1))

        if existing_task_id is not None:
            return

        db.add_all(Task(**task_data) for task_data in SEED_TASKS)
        db.commit()


if __name__ == "__main__":
    seed_tasks()
