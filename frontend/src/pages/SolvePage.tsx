import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import TaskRow from "../components/TaskRow";
import type { Task } from "../types/task";

type CurrentUser = {
    role: "participant" | "organizer";
};

export default function SolvePage() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [role, setRole] =
        useState<CurrentUser["role"]>("participant");

    useEffect(() => {
        async function loadTasks() {
            const token = localStorage.getItem("token");
            const headers = token
                ? { Authorization: `Bearer ${token}` }
                : undefined;

            const response = await fetch(
                "http://127.0.0.1:8000/api/tasks",
                { headers }
            );

            if (!response.ok) {
                throw new Error("Не удалось загрузить задачи");
            }

            const tasks: Task[] = await response.json();
            setTasks(tasks);

            if (!token) {
                return;
            }

            const meResponse = await fetch(
                "http://127.0.0.1:8000/api/me",
                { headers }
            );

            if (meResponse.ok) {
                const me: CurrentUser = await meResponse.json();
                setRole(me.role);
            }
        }

        loadTasks();
    }, []);

    return (
        <>
            <Navbar />
            <main className="page solve-page">
                <div className="solve-heading">
                    <h1>Задачи</h1>

                    {role === "organizer" && (
                        <Link
                            className="solve-create-task"
                            to="/organizer/tasks/new"
                        >
                            Создать задачу
                        </Link>
                    )}
                </div>

                <div className="problem-list">
                    {tasks.map((task) => (
                        <TaskRow key={task.id} task={task} />
                    ))}
                </div>
            </main>
        </>
    );
}
