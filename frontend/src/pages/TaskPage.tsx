import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { Task } from "../types/task";
import type { Contest } from "../types/contest";
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
  | "output_limit_exceeded"
  | "runner_error"
  | "no_tests"
  | "pending_review"
  | "reviewed";

type CompetitionTask = {
  task_id: number;
  position: number;
  title: string;
  difficulty: number;
};

type CurrentUser = {
  role: "participant" | "organizer";
};

const MAX_CODE_LENGTH = 100_000;

type SavedSubmission = {
  code: string;
  language: Language;
  status: SubmissionStatus;
  created_at: string;
};

const statusLabels: Record<SubmissionStatus, string> = {
  accepted: "Успешно",
  wrong_answer: "Неверный ответ",
  runtime_error: "Ошибка выполнения",
  time_limit_exceeded: "Превышено время",
  compilation_error: "Ошибка компиляции",
  compilation_timeout: "Превышено время компиляции",
  output_limit_exceeded: "Превышен лимит вывода",
  runner_error: "Ошибка системы проверки",
  no_tests: "Нет тестов",
  pending_review: "Ожидает ручной проверки",
  reviewed: "Проверено",
};

export default function TaskPage() {
  const { id, competitionId } = useParams();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [task, setTask] = useState<Task | null>(null);
  const [competition, setCompetition] = useState<Contest | null>(null);
  const [competitionTasks, setCompetitionTasks] = useState<CompetitionTask[]>([]);
  const [role, setRole] = useState<CurrentUser["role"]>("participant");
  const [language, setLanguage] = useState<Language>("python");
  const [submissionStatus, setSubmissionStatus] =
    useState<SubmissionStatus | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [isFinishConfirmOpen, setIsFinishConfirmOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadTask() {
      const token = localStorage.getItem("token");
      const headers = token
        ? { Authorization: `Bearer ${token}` }
        : undefined;

      setIsLoading(true);
      setError(null);
      setTask(null);
      setCode("");
      setSubmissionStatus(null);

      try {
        const endpoint = competitionId
          ? `http://127.0.0.1:8000/api/competitions/${competitionId}/tasks/${id}`
          : `http://127.0.0.1:8000/api/tasks/${id}`;

        const taskResponse = await fetch(endpoint, { headers });

        if (!taskResponse.ok) {
          const data = await taskResponse.json().catch(() => null);
          setError(
            typeof data?.detail === "string"
              ? data.detail
              : "Не удалось загрузить задачу",
          );
          return;
        }

        const taskData: Task = await taskResponse.json();
        setTask(taskData);

        if (!competitionId || !token) {
          return;
        }

        const [
          competitionResponse,
          tasksResponse,
          savedResponse,
          meResponse,
        ] = await Promise.all([
          fetch(
            `http://127.0.0.1:8000/api/competitions/${competitionId}`,
            { headers },
          ),
          fetch(
            `http://127.0.0.1:8000/api/competitions/${competitionId}/tasks`,
            { headers },
          ),
          fetch(
            `http://127.0.0.1:8000/api/competitions/${competitionId}/tasks/${id}/latest-submission`,
            { headers },
          ),
          fetch("http://127.0.0.1:8000/api/me", { headers }),
        ]);

        if (competitionResponse.ok) {
          const competitionData: Contest =
            await competitionResponse.json();
          setCompetition(competitionData);
        }

        if (tasksResponse.ok) {
          const tasksData: CompetitionTask[] =
            await tasksResponse.json();
          setCompetitionTasks(tasksData);
        }

        if (meResponse.ok) {
          const me: CurrentUser = await meResponse.json();
          setRole(me.role);
        }

        if (savedResponse.ok) {
          const saved: SavedSubmission | null =
            await savedResponse.json();

          if (saved) {
            setCode(saved.code);
            setLanguage(saved.language);
            setSubmissionStatus(saved.status);
          }
        }
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

    if (code.length > MAX_CODE_LENGTH) {
      setError("Исходный код должен быть не больше 100 000 символов");
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

  async function finishParticipation() {
    if (!competitionId || role !== "participant") {
      return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      return;
    }

    setIsFinishing(true);
    setError(null);

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/competitions/${competitionId}/finish`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          typeof data.detail === "string"
            ? data.detail
            : "Не удалось завершить участие",
        );
        return;
      }

      setCompetition(data);
      setIsFinishConfirmOpen(false);
      navigate(`/contests/${competitionId}`);
    } catch {
      setError("Не удалось подключиться к серверу");
    } finally {
      setIsFinishing(false);
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
          {competitionId ? (
            <>
              <Link
                className="task-contest-back"
                to={`/contests/${competitionId}`}
              >
                ← К соревнованию
              </Link>

              {competitionTasks.length > 0 && (
                <div className="task-contest-tabs">
                  {competitionTasks.map((competitionTask) => (
                    <Link
                      className={
                        competitionTask.task_id === task.id
                          ? "is-active"
                          : undefined
                      }
                      to={`/contests/${competitionId}/tasks/${competitionTask.task_id}`}
                      key={competitionTask.task_id}
                    >
                      {competitionTask.position}
                    </Link>
                  ))}
                </div>
              )}
            </>
          ) : (
            <Link className="task-contest-back" to="/solve">
              ← К сборнику задач
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
              disabled={competition?.participation_finished}
            >
              <option value="python">Python</option>
              <option value="javascript">JavaScript</option>
              <option value="cpp">C++</option>
              <option value="java">Java</option>
            </select>

            <div className="task-editor-primary-actions">
              {competitionId &&
                role === "participant" &&
                competition?.status === "active" &&
                !competition.participation_finished && (
                  <button
                    className="task-finish"
                    type="button"
                    disabled={isFinishing || isSubmitting}
                    onClick={() => setIsFinishConfirmOpen(true)}
                  >
                    Завершить
                  </button>
                )}

              <button
                className="task-submit"
                onClick={handleSubmit}
                disabled={
                  isSubmitting ||
                  !code.trim() ||
                  competition?.participation_finished
                }
              >
                {competition?.participation_finished
                  ? "Участие завершено"
                  : isSubmitting
                    ? "Проверка..."
                    : "Отправить"}
              </button>
            </div>
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
                readOnly: Boolean(
                  competition?.participation_finished,
                ),
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
        {isFinishConfirmOpen && (
          <div
            className="task-finish-confirm-overlay"
            role="presentation"
            onMouseDown={(event) => {
              if (
                event.target === event.currentTarget &&
                !isFinishing
              ) {
                setIsFinishConfirmOpen(false);
              }
            }}
          >
            <div
              className="task-finish-confirm-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="task-finish-confirm-title"
            >
              <div className="task-finish-confirm-header">
                <div>
                  <span>Соревнование</span>
                  <h2 id="task-finish-confirm-title">
                    Завершить участие?
                  </h2>
                </div>

                <button
                  className="task-finish-confirm-close"
                  type="button"
                  aria-label="Закрыть"
                  disabled={isFinishing}
                  onClick={() => setIsFinishConfirmOpen(false)}
                >
                  ×
                </button>
              </div>

              <div className="task-finish-confirm-body">
                <p>
                  После завершения участия вы больше не сможете
                  отправлять решения в этом соревновании.
                </p>

                <div className="task-finish-confirm-note">
                  Уже отправленные решения и сохранённый код останутся
                  доступны после завершения.
                </div>
              </div>

              <div className="task-finish-confirm-actions">
                <button
                  type="button"
                  disabled={isFinishing}
                  onClick={() => setIsFinishConfirmOpen(false)}
                >
                  Отмена
                </button>

                <button
                  className="task-finish-confirm-submit"
                  type="button"
                  disabled={isFinishing}
                  onClick={finishParticipation}
                >
                  {isFinishing
                    ? "Завершение..."
                    : "Завершить участие"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
