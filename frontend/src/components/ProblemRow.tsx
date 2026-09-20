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
        <div key={task.id}>
            <span>{task.title}</span>

            <span>
            {"⭐️".repeat(task.difficulty)}
            </span>

            {task.solved && <span>✓</span>}
        </div>
    )
}