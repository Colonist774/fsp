import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import TaskRow from "../components/TaskRow";
import type { Task } from "../types/task";

export default function SolvePage() {
    const [tasks, setTasks] = useState<Task[]>([])

    useEffect(() => {
        async function loadTasks() {
            const token = localStorage.getItem("token");

            const response = await fetch(
                "http://127.0.0.1:8000/api/tasks",
                {
                    headers: token
                        ? { Authorization: `Bearer ${token}` }
                        : undefined,
                }
            )
            
            if (!response.ok) {
                throw new Error("Не удалось загрузить задачи");
            }

            const tasks: Task[] = await response.json();

            setTasks(tasks);
        }

        loadTasks();
    }, [])

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
