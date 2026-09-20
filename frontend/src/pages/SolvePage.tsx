import Navbar from "../components/Navbar";
import ProblemRow from "../components/TaskRow";
import { tasks } from "../data/tasks";
export default function SolvePage() {
    return (
        <>
            <Navbar />
            <main className="page solve-page">
                <h1>Задачи</h1>

                <div className="problem-list">
                    {tasks.map((task) => (
                    <ProblemRow key={task.id} task={task} />
                    ))}
                </div>
            </main>
        </>
    );
}
