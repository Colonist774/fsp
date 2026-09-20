import { useState } from "react";
import { useParams } from "react-router-dom";
import { tasks } from "../data/tasks";
import Navbar from "../components/Navbar";

export default function TaskPage() {
    const { id } = useParams();
    const [code, setCode] = useState("");

    const task = tasks.find((task) => task.id === Number(id));

    if (!task) {
        return <h1>Задача не найдена</h1>;
    }

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
                        <button
                            className="task-submit"
                            onClick={() => console.log(code)}
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
