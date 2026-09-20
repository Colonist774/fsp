import Navbar from "../components/Navbar";
import TaskRow from "../components/TaskRow";
import { tasks } from "../data/tasks";
export default function SolvePage() {
    return (
        <>
            <Navbar />
            <main className="page solve-page">
                <h1>Задачи</h1>

                <div className="problem-list">
                    {tasks.map((task) => (
                    <TaskRow key={task.id} task={task} />
                    ))}
                </div>
            </main>
        </>
    );
}
