type Task = {
  id: number;
  title: string;
  difficulty: number;
  solved: boolean;
};

type TaskRowProps = {
  task: Task;
};

export default function ProblemRow({ task }: TaskRowProps) {
  return (
    <div className="problem-row">
      <span className="problem-title">{task.title}</span>

      <span className="problem-difficulty">
        {"⭐️".repeat(task.difficulty)}
      </span>

      <span className="problem-solved">{task.solved ? "✓" : ""}</span>
    </div>
  );
}
