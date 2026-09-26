import { useEffect, useRef, useState } from "react";
import {
    Link,
    useSearchParams,
} from "react-router-dom";
import Navbar from "../components/Navbar";
import TaskRow from "../components/TaskRow";
import type { Task } from "../types/task";

type CurrentUser = {
    role: "participant" | "organizer";
};

type SportDiscipline = {
    id: number;
    name: string;
};

export default function SolvePage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const selectedDiscipline =
        searchParams.get("discipline") ?? "";

    const [tasks, setTasks] = useState<Task[]>([]);
    const [disciplines, setDisciplines] =
        useState<SportDiscipline[]>([]);
    const [role, setRole] =
        useState<CurrentUser["role"]>("participant");
    const [isDisciplineOpen, setIsDisciplineOpen] =
        useState(false);
    const disciplineFilterRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        async function loadData() {
            const token = localStorage.getItem("token");
            const headers = token
                ? { Authorization: `Bearer ${token}` }
                : undefined;

            const [
                tasksResponse,
                meResponse,
                disciplinesResponse,
            ] = await Promise.all([
                fetch("http://127.0.0.1:8000/api/tasks", {
                    headers,
                }),
                fetch("http://127.0.0.1:8000/api/me", {
                    headers,
                }),
                fetch("http://127.0.0.1:8000/api/disciplines", {
                    headers,
                }),
            ]);

            if (!tasksResponse.ok) {
                throw new Error("Не удалось загрузить задачи");
            }

            const tasksData: Task[] = await tasksResponse.json();
            setTasks(tasksData);

            if (meResponse.ok) {
                const me: CurrentUser = await meResponse.json();
                setRole(me.role);
            }

            if (disciplinesResponse.ok) {
                const data: SportDiscipline[] =
                    await disciplinesResponse.json();
                setDisciplines(data);
            }
        }

        loadData();
    }, []);

    useEffect(() => {
        function handlePointerDown(event: MouseEvent) {
            if (
                disciplineFilterRef.current &&
                !disciplineFilterRef.current.contains(
                    event.target as Node,
                )
            ) {
                setIsDisciplineOpen(false);
            }
        }

        document.addEventListener("mousedown", handlePointerDown);

        return () => {
            document.removeEventListener(
                "mousedown",
                handlePointerDown,
            );
        };
    }, []);

    function selectDiscipline(discipline: string) {
        const nextParams = new URLSearchParams(searchParams);

        if (discipline) {
            nextParams.set("discipline", discipline);
        } else {
            nextParams.delete("discipline");
        }

        setSearchParams(nextParams);
        setIsDisciplineOpen(false);
    }

    const visibleTasks = selectedDiscipline
        ? tasks.filter(
              (task) => task.discipline === selectedDiscipline,
          )
        : tasks;

    return (
        <>
            <Navbar />

            <main className="page solve-page">
                <div className="solve-heading">
                    <h1>Задачи</h1>
                </div>

                <div className="solve-toolbar">
                    <div
                        className="solve-discipline-filter"
                        ref={disciplineFilterRef}
                    >
                        <button
                            className={
                                selectedDiscipline
                                    ? "solve-discipline-button has-filter"
                                    : "solve-discipline-button"
                            }
                            type="button"
                            aria-expanded={isDisciplineOpen}
                            onClick={() =>
                                setIsDisciplineOpen(
                                    (current) => !current,
                                )
                            }
                        >
                            <span>Дисциплина</span>
                            <span className="solve-discipline-chevron">
                                ⌄
                            </span>
                        </button>

                        {selectedDiscipline && (
                            <span className="solve-discipline-current">
                                {selectedDiscipline}
                            </span>
                        )}

                        {isDisciplineOpen && (
                            <div className="solve-discipline-menu">
                                <button
                                    className={
                                        !selectedDiscipline
                                            ? "is-selected"
                                            : ""
                                    }
                                    type="button"
                                    onClick={() =>
                                        selectDiscipline("")
                                    }
                                >
                                    Все дисциплины
                                </button>

                                {disciplines.map((discipline) => (
                                    <button
                                        className={
                                            selectedDiscipline ===
                                            discipline.name
                                                ? "is-selected"
                                                : ""
                                        }
                                        type="button"
                                        key={discipline.id}
                                        onClick={() =>
                                            selectDiscipline(
                                                discipline.name,
                                            )
                                        }
                                    >
                                        {discipline.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {role === "organizer" && (
                        <Link
                            className="solve-create-task"
                            to="/organizer/tasks/new"
                        >
                            Создать задачу
                        </Link>
                    )}
                </div>

                {visibleTasks.length === 0 ? (
                    <p className="contest-empty">
                        В этой дисциплине задач пока нет
                    </p>
                ) : (
                    <div className="problem-list">
                        {visibleTasks.map((task) => (
                            <TaskRow key={task.id} task={task} />
                        ))}
                    </div>
                )}
            </main>
        </>
    );
}
