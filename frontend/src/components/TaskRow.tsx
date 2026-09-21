import { Link } from "react-router-dom";
import type { Task } from "../types/task";

type TaskRowProps = {
  task: Task;
};

export default function TaskRow({ task }: TaskRowProps) {
  const difficulty = Math.max(0, Math.min(task.difficulty, 5));

  return (
    <Link to={`/tasks/${task.id}`}>
      <div className="task-row">
        <span className="task-title">{task.title}</span>

        <span
          className="task-difficulty"
          aria-label={`Сложность: ${difficulty} из 5`}
        >
          {Array.from({ length: 5 }, (_, index) => {
            const filled = index < difficulty;

            return (
              <svg
                key={index}
                className={`difficulty-star ${filled ? "is-filled" : "is-empty"}`}
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M12 2.75 14.86 8.55 21.26 9.48 16.63 13.99 17.72 20.36 12 17.35 6.28 20.36 7.37 13.99 2.74 9.48 9.14 8.55 12 2.75Z" />
              </svg>
            );
          })}
        </span>

        <span className="task-solved">{task.solved ? "✓" : ""}</span>
      </div>
    </Link>
  );
}
