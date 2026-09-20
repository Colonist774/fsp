import Navbar from "../components/Navbar";
import ProblemRow from "../components/TaskRow";

import type { Task } from "../types/task";

const tasks: Task[] = [
  {
    id: 1,
    title: "Быстрая сортировка",
    difficulty: 3,
    solved: true,
  },
  {
    id: 2,
    title: "Работа со строками",
    difficulty: 1,
    solved: false,
  },
  {
    id: 3,
    title: "Бинарный поиск",
    difficulty: 2,
    solved: false,
  },
];

export default function SolvePage() {
    return (
        <>
            <Navbar />
            <main className="page solve-page">
                <h1>Решать</h1>

                <div className="problem-list">
                    {tasks.map((task) => (
                    <ProblemRow key={task.id} task={task} />
                    ))}
                </div>
            </main>
        </>
    );
}
