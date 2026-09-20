import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import type { Task } from "../types/task";
import Navbar from "../components/Navbar";

type Language = "python" | "javascript" | "cpp" | "java";

export default function TaskPage() {
    const { id } = useParams();
    const [code, setCode] = useState("");
    const [task, setTask] = useState<Task | null>(null);
    const [language, setLanguage] = useState<Language>("python");

    useEffect(() => {
        async function loadTask() {
            const response = await fetch(
                `http://127.0.0.1:8000/api/tasks/${id}`
            );

            if (!response.ok) {
                throw new Error("Не удалось загрузить задачу");
            };

            const task = await response.json();

            setTask(task);
        }

        loadTask()
    }, [id])

    async function handleSubmit() {
        const response = await fetch(
            "http://127.0.0.1:8000/api/submissions",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                },

                body: JSON.stringify({
                    task_id: taskId,
                    code: code,
                    language: language
                }),
            }
        );

        const data = await response.json();

        console.log(data);
    }

    if (!task) {
        return <h1>Задача не найдена</h1>;
    }
    
    const taskId = task.id;

    return (
        <>
            <Navbar />

            <main className="task-workspace">
                <section className="task-statement">
                    <h1>{task.title}</h1>

                    <p>{task.description}</p>

                    <h2>Входные данные</h2>
                    <p>{task.input}</p>

                    <h2>Выходные данные</h2>
                    <p>{task.output}</p>
                </section>

                <section className="task-editor">
                    <div className="task-editor-actions">
                        <select
                        value={language}
                        onChange={(event) =>
                            setLanguage(event.target.value as Language)
                        }
                        >
                        <option value="python">Python</option>
                        <option value="javascript">JavaScript</option>
                        <option value="cpp">C++</option>
                        <option value="java">Java</option>
                        </select>

                        <button
                            className="task-submit"
                            onClick={handleSubmit}
                        >
                            Отправить
                        </button>
                    </div>

                    <textarea
                        className="task-code-editor"
                        value={code}
                        onChange={(event) => setCode(event.target.value)}
                    />
                </section>
            </main>
        </>
    );
}
