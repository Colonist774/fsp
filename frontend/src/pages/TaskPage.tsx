import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import type { Task } from "../types/task";
import Navbar from "../components/Navbar";
import Editor from "@monaco-editor/react";

type Language = "python" | "javascript" | "cpp" | "java";

export default function TaskPage() {
    const { id } = useParams();
    const [code, setCode] = useState("");
    const [task, setTask] = useState<Task | null>(null);
    const [language, setLanguage] = useState<Language>("python");
    const [submissionStatus, setSubmissionStatus] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

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
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? "Проверка..." : "Отправить"}
                        </button>
                    </div>

                    {submissionStatus && (
                        <div
                            className="submission-status"
                            data-status={submissionStatus}
                        >
                            {submissionStatus}
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
                                        "editor.background": "#0b0f15",
                                        "editorGutter.background": "#0b0f15",
                                        "editorLineNumber.foreground": "#475266",
                                        "editorLineNumber.activeForeground": "#b9c3d4",
                                        "editor.lineHighlightBackground": "#111824",
                                        "editor.lineHighlightBorder": "#00000000",
                                        "editorCursor.foreground": "#7f9fff",
                                        "editor.selectionBackground": "#29406f88",
                                        "editor.inactiveSelectionBackground": "#22365b66",
                                        "editorIndentGuide.background1": "#1e2735",
                                        "editorIndentGuide.activeBackground1": "#3a4b65",
                                        "editorWhitespace.foreground": "#283346",
                                        "editorWidget.background": "#111722",
                                        "editorWidget.border": "#2a3342",
                                        "editorSuggestWidget.background": "#111722",
                                        "editorSuggestWidget.border": "#2a3342",
                                        "editorSuggestWidget.selectedBackground": "#1d2b45",
                                        "editorHoverWidget.background": "#111722",
                                        "editorHoverWidget.border": "#2a3342",
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
                                smoothScrolling: true,
                                cursorBlinking: "smooth",
                                cursorSmoothCaretAnimation: "on",
                                padding: { top: 16, bottom: 16 },
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
