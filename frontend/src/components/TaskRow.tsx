import { Link } from "react-router-dom";
import type { Task } from "../types/task";

type TaskRowProps = {
  task: Task;
};

export default function TaskRow({ task }: TaskRowProps) {
  return (
    <Link to={`/tasks/${task.id}`}>
      <div className="task-row">
        <span className="task-title">{task.title}</span>

        <span className="task-difficulty">
          {"⭐️".repeat(task.difficulty)}
        </span>

        <span className="task-solved">{task.solved ? "✓" : ""}</span>
      </div>
    </Link>
  );
}
