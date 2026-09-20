"""seed maximum array task and tests

Revision ID: 0004_max_array_task
Revises: 0003_task_tests
Create Date: 2026-09-20
"""

from typing import Sequence, Union

from alembic import op


revision: str = "0004_max_array_task"
down_revision: Union[str, None] = "0003_task_tests"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        INSERT INTO tasks (
            id,
            title,
            difficulty,
            description,
            input,
            output
        )
        VALUES (
            3,
            'Поиск максимального элемента массива',
            1,
            'Дан массив целых чисел. Выведите его максимальный элемент.

Пример:
Ввод: -1 21 37 4 -8
Вывод: 37',
            'В одной строке даны целые числа через пробел.',
            'Выведите наибольшее число массива.'
        )
        ON CONFLICT (id) DO UPDATE
        SET
            title = EXCLUDED.title,
            difficulty = EXCLUDED.difficulty,
            description = EXCLUDED.description,
            input = EXCLUDED.input,
            output = EXCLUDED.output
        """
    )

    op.execute("DELETE FROM task_tests WHERE task_id = 3")

    op.execute(
        """
        INSERT INTO task_tests (
            task_id,
            input_data,
            expected_output,
            is_hidden
        )
        VALUES
            (3, '-1 21 37 4 -8 12\n', '37\n', false),
            (3, '-5 -12 -1 -19\n', '-1\n', true),
            (3, '42\n', '42\n', true),
            (3, '3 3 3 3\n', '3\n', true),
            (3, '1000000 -1000000 999999 0\n', '1000000\n', true),
            (3, '0 -1 0 -2\n', '0\n', true),
            (3, '8 21 21 5\n', '21\n', true)
        """
    )


def downgrade() -> None:
    op.execute("DELETE FROM task_tests WHERE task_id = 3")

    op.execute(
        """
        UPDATE tasks
        SET
            title = 'Работа с числами',
            difficulty = 1,
            description = 'Объедините две исходные строки в одну',
            input = '',
            output = ''
        WHERE id = 3
        """
    )
