import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import type { Task } from "../types/task";
import Navbar from "../components/Navbar";
import Editor from "@monaco-editor/react";

type Language = "python" | "javascript" | "cpp" | "java";
type SubmissionStatus =
    | "accepted"
    | "wrong_answer"
    | "runtime_error"
    | "time_limit_exceeded"
    | "compilation_error"
    | "compilation_timeout"
    | "runner_error"
    | "no_tests";

export default function TaskPage() {
    const { id } = useParams();
    const [code, setCode] = useState("");
    const [task, setTask] = useState<Task | null>(null);
    const [language, setLanguage] = useState<Language>("python");
    const [submissionStatus, setSubmissionStatus] = useState<SubmissionStatus | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const statusLabels: Record<SubmissionStatus, string> = {
        accepted: "Успешно",
        wrong_answer: "Неверный ответ",
        runtime_error: "Ошибка выполнения",
        time_limit_exceeded: "Превышено время",
        compilation_error: "Ошибка компиляции",
        compilation_timeout: "Превышено время компиляции",
        runner_error: "Ошибка системы проверки",
        no_tests: "Нет тестов",
    };

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
        setIsSubmitting(true);
        setSubmissionStatus(null);

        try {
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

            setSubmissionStatus(data.status);
            console.log(data);
        } finally {
            setIsSubmitting(false);
        }
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
                            disabled={isSubmitting || !code.trim()}
                        >
                            {isSubmitting ? "Проверка..." : "Отправить"}
                        </button>
                    </div>

                    {submissionStatus && (
                        <div
                            className="submission-status"
                            data-status={submissionStatus}
                        >
                            {statusLabels[submissionStatus]}
                        </div>
                    )}

                    <div className="code-editor-shell">
                        <Editor
                            height="100%"
                            language={language}
                            value={code}
                            onChange={(value) => setCode(value || "")}
                            beforeMount={(monaco) => {
                                monaco.editor.defineTheme("fsp-dark", {
                                    base: "vs-dark",
                                    inherit: true,
                                    rules: [],
                                    colors: {
                                        "editor.background": "#0d1117",
                                        "editorGutter.background": "#0d1117",
                                        "editorLineNumber.foreground": "#484f58",
                                        "editorLineNumber.activeForeground": "#c9d1d9",
                                        "editor.lineHighlightBackground": "#11161d",
                                        "editor.lineHighlightBorder": "#00000000",
                                        "editorCursor.foreground": "#c9d1d9",
                                        "editor.selectionBackground": "#264f78",
                                        "editorIndentGuide.background1": "#21262d",
                                        "editorIndentGuide.activeBackground1": "#30363d",
                                        "editorWidget.background": "#161b22",
                                        "editorWidget.border": "#30363d",
                                        "editorSuggestWidget.background": "#161b22",
                                        "editorSuggestWidget.border": "#30363d",
                                        "editorSuggestWidget.selectedBackground": "#21262d",
                                        "editorHoverWidget.background": "#161b22",
                                        "editorHoverWidget.border": "#30363d",
                                    },
                                });
                            }}
                            theme="fsp-dark"
                            options={{
                                minimap: { enabled: false },
                                fontSize: 14,
                                fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
                                fontLigatures: true,
                                lineHeight: 22,
                                lineNumbers: "on",
                                lineNumbersMinChars: 3,
                                roundedSelection: false,
                                scrollBeyondLastLine: false,
                                automaticLayout: true,
                                tabSize: 4,
                                renderLineHighlight: "all",
                                cursorBlinking: "smooth",
                                padding: { top: 14, bottom: 14 },
                                bracketPairColorization: { enabled: true },
                                guides: {
                                    indentation: true,
                                    bracketPairs: true,
                                },
                                overviewRulerBorder: false,
                                hideCursorInOverviewRuler: true,
                                scrollbar: {
                                    verticalScrollbarSize: 10,
                                    horizontalScrollbarSize: 10,
                                },
                            }}
                        />
                    </div>
                </section>
            </main>
        </>
    );
}
