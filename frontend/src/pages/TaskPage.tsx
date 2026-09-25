import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
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

export default function TaskPage() {
  const { id, competitionId } = useParams();
  const [code, setCode] = useState("");
  const [task, setTask] = useState<Task | null>(null);
  const [language, setLanguage] = useState<Language>("python");
  const [submissionStatus, setSubmissionStatus] =
    useState<SubmissionStatus | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadTask() {
      const token = localStorage.getItem("token");

      try {
        const endpoint = competitionId
          ? `http://127.0.0.1:8000/api/competitions/${competitionId}/tasks/${id}`
          : `http://127.0.0.1:8000/api/tasks/${id}`;

        const response = await fetch(endpoint, {
          headers: token
            ? { Authorization: `Bearer ${token}` }
            : undefined,
        });

        if (!response.ok) {
          const data = await response.json().catch(() => null);
          setError(
            typeof data?.detail === "string"
              ? data.detail
              : "Не удалось загрузить задачу",
          );
          return;
        }

        const taskData: Task = await response.json();
        setTask(taskData);
      } catch {
        setError("Не удалось подключиться к серверу");
      } finally {
        setIsLoading(false);
      }
    }

    loadTask();
  }, [id, competitionId]);

  async function handleSubmit() {
    if (!task) {
      return;
    }

    setIsSubmitting(true);
    setSubmissionStatus(null);
    setError(null);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        "http://127.0.0.1:8000/api/submissions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token
              ? { Authorization: `Bearer ${token}` }
              : {}),
          },
          body: JSON.stringify({
            task_id: task.id,
            competition_id: competitionId
              ? Number(competitionId)
              : null,
            code,
            language,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          typeof data.detail === "string"
            ? data.detail
            : "Не удалось отправить решение",
        );
        return;
      }

      setSubmissionStatus(data.status as SubmissionStatus);
    } catch {
      setError("Не удалось подключиться к серверу");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return null;
  }

  if (!task) {
    return (
      <>
        <Navbar />
        <main className="page">
          <div className="auth-error">
            {error || "Задача не найдена"}
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />

      <main className="task-workspace">
        <section className="task-statement">
          {competitionId && (
            <Link
              className="task-contest-back"
              to={`/contests/${competitionId}`}
            >
              ← К соревнованию
            </Link>
          )}

          <h1>{task.title}</h1>

          <div className="task-statement-text">
            {task.description}
          </div>

          {task.input && (
            <>
              <h2>Входные данные</h2>
              <div className="task-statement-text">{task.input}</div>
            </>
          )}

          {task.output && (
            <>
              <h2>Выходные данные</h2>
              <div className="task-statement-text">{task.output}</div>
            </>
          )}

          {task.constraints && (
            <>
              <h2>Ограничения</h2>
              <div className="task-statement-text">
                {task.constraints}
              </div>
            </>
          )}

          {task.examples.length > 0 && (
            <>
              <h2>Примеры</h2>

              <div className="task-examples">
                {task.examples.map((example, index) => (
                  <div className="task-example" key={index}>
                    <strong>Пример {index + 1}</strong>

                    <div className="task-example-grid">
                      <div>
                        <span>Ввод</span>
                        <pre>{example.input_data}</pre>
                      </div>

                      <div>
                        <span>Вывод</span>
                        <pre>{example.expected_output}</pre>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
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
                fontFamily:
                  '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
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

          {error && (
            <div className="task-submit-error">{error}</div>
          )}

          <div
            className="submission-status"
            data-status={submissionStatus ?? undefined}
          >
            Результат:{" "}
            {submissionStatus
              ? statusLabels[submissionStatus]
              : ""}
          </div>
        </section>
      </main>
    </>
  );
}
