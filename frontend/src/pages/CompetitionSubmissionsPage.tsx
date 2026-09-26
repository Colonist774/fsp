import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import type { Contest } from "../types/contest";

type ReviewSubmission = {
  id: number;
  user_id: number;
  username: string;
  full_name: string | null;
  task_id: number;
  task_title: string;
  max_points: number;
  code: string;
  language: "python" | "javascript" | "cpp" | "java";
  status: string;
  manual_score: number | null;
  created_at: string;
  reviewed_at: string | null;
};

const statusLabels: Record<string, string> = {
  accepted: "Accepted",
  wrong_answer: "Wrong Answer",
  runtime_error: "Runtime Error",
  time_limit_exceeded: "Time Limit",
  output_limit_exceeded: "Output Limit",
  compile_error: "Compile Error",
  pending: "В очереди",
  running: "Проверяется",
  pending_review: "Ожидает ручной проверки",
  reviewed: "Проверено",
};

const languageLabels = {
  python: "Python",
  javascript: "JavaScript",
  cpp: "C++",
  java: "Java",
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function CompetitionSubmissionsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [competition, setCompetition] = useState<Contest | null>(null);
  const [submissions, setSubmissions] = useState<ReviewSubmission[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [score, setScore] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(
    () =>
      submissions.find((submission) => submission.id === selectedId) ??
      null,
    [submissions, selectedId],
  );

  useEffect(() => {
    async function loadPage() {
      const token = localStorage.getItem("token");

      if (!token) {
        setError("Требуется авторизация");
        setIsLoading(false);
        return;
      }

      try {
        const headers = {
          Authorization: `Bearer ${token}`,
        };

        const [competitionResponse, submissionsResponse] =
          await Promise.all([
            fetch(
              `http://127.0.0.1:8000/api/competitions/${id}`,
              { headers },
            ),
            fetch(
              `http://127.0.0.1:8000/api/competitions/${id}/submissions`,
              { headers },
            ),
          ]);

        if (!competitionResponse.ok || !submissionsResponse.ok) {
          const data = await submissionsResponse.json().catch(() => null);
          setError(
            typeof data?.detail === "string"
              ? data.detail
              : "Не удалось загрузить решения",
          );
          return;
        }

        const competitionData: Contest =
          await competitionResponse.json();
        const submissionsData: ReviewSubmission[] =
          await submissionsResponse.json();

        setCompetition(competitionData);
        setSubmissions(submissionsData);

        if (submissionsData.length > 0) {
          setSelectedId(submissionsData[0].id);
          setScore(
            submissionsData[0].manual_score === null
              ? ""
              : String(submissionsData[0].manual_score),
          );
        }
      } catch {
        setError("Не удалось подключиться к серверу");
      } finally {
        setIsLoading(false);
      }
    }

    loadPage();
  }, [id]);

  function selectSubmission(submission: ReviewSubmission) {
    setSelectedId(submission.id);
    setScore(
      submission.manual_score === null
        ? ""
        : String(submission.manual_score),
    );
    setError(null);
  }

  async function saveScore() {
    if (!selected) {
      return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      return;
    }

    const parsedScore = score === "" ? null : Number(score);

    if (
      parsedScore !== null &&
      (!Number.isInteger(parsedScore) ||
        parsedScore < 0 ||
        parsedScore > selected.max_points)
    ) {
      setError(
        `Оценка должна быть от 0 до ${selected.max_points}`,
      );
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/competitions/${id}/submissions/${selected.id}/score`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            score: parsedScore,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          typeof data.detail === "string"
            ? data.detail
            : "Не удалось сохранить оценку",
        );
        return;
      }

      const updated = data as ReviewSubmission;
      setSubmissions((previous) =>
        previous.map((submission) =>
          submission.id === updated.id ? updated : submission,
        ),
      );
      setScore(
        updated.manual_score === null
          ? ""
          : String(updated.manual_score),
      );
    } catch {
      setError("Не удалось подключиться к серверу");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return null;
  }

  return (
    <>
      <Navbar />

      <main className="page review-page">
        <button
          className="page-back"
          type="button"
          onClick={() => navigate(`/contests/${id}`)}
        >
          ← К соревнованию
        </button>

        <div className="review-heading">
          <div>
            <h1>Решения</h1>
            {competition && <p>{competition.title}</p>}
          </div>
          <span>{submissions.length}</span>
        </div>

        {error && <div className="auth-error">{error}</div>}

        {!error && submissions.length === 0 && (
          <div className="review-empty">
            Пока нет отправленных решений.
          </div>
        )}

        {submissions.length > 0 && (
          <div className="review-layout">
            <section className="review-list">
              <div className="review-list-header">
                <span>Участник</span>
                <span>Задача</span>
                <span>Вердикт</span>
                <span>Баллы</span>
              </div>

              {submissions.map((submission) => {
                const displayedScore =
                  competition?.evaluation_mode === "manual"
                    ? submission.manual_score
                    : competition?.evaluation_mode === "automatic"
                      ? submission.status === "accepted"
                        ? submission.max_points
                        : null
                      : submission.manual_score ??
                        (submission.status === "accepted"
                          ? submission.max_points
                          : null);

                return (
                  <button
                    className={
                      submission.id === selectedId
                        ? "review-row is-selected"
                        : "review-row"
                    }
                    type="button"
                    key={submission.id}
                    onClick={() => selectSubmission(submission)}
                  >
                    <span>
                      <strong>
                        {submission.full_name || submission.username}
                      </strong>
                      {submission.full_name && (
                        <small>@{submission.username}</small>
                      )}
                    </span>
                    <span>{submission.task_title}</span>
                    <span data-status={submission.status}>
                      {statusLabels[submission.status] ??
                        submission.status}
                    </span>
                    <strong>
                      {displayedScore === null
                        ? "—"
                        : `${displayedScore}/${submission.max_points}`}
                    </strong>
                  </button>
                );
              })}
            </section>

            {selected && (
              <section className="review-detail">
                <div className="review-detail-heading">
                  <div>
                    <span>Решение #{selected.id}</span>
                    <h2>{selected.task_title}</h2>
                  </div>
                  <strong>
                    {languageLabels[selected.language]}
                  </strong>
                </div>

                <div className="review-meta">
                  <span>
                    {selected.full_name || selected.username}
                  </span>
                  <span>{formatDateTime(selected.created_at)}</span>
                  <span>
                    {statusLabels[selected.status] ?? selected.status}
                  </span>
                </div>

                <pre className="review-code">
                  <code>
                    {selected.code ||
                      "Исходный код уже удалён по сроку хранения."}
                  </code>
                </pre>

                {competition?.evaluation_mode === "automatic" ? (
                  <p className="review-score-note">
                    Оценка выставляется автоматически по результатам
                    скрытых тестов. Ручное изменение баллов отключено.
                  </p>
                ) : (
                  <>
                <div className="review-score">
                  <label>
                    <span>Оценка организатора</span>
                    <div>
                      <input
                        type="number"
                        min={0}
                        max={selected.max_points}
                        value={score}
                        onChange={(event) =>
                          setScore(event.target.value)
                        }
                        placeholder={
                          competition?.evaluation_mode === "manual"
                            ? "0"
                            : selected.status === "accepted"
                              ? String(selected.max_points)
                              : "0"
                        }
                      />
                      <span>из {selected.max_points}</span>
                    </div>
                  </label>

                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={saveScore}
                  >
                    {isSaving ? "Сохранение..." : "Сохранить оценку"}
                  </button>
                </div>
                    <p className="review-score-note">
                      {competition?.evaluation_mode === "manual"
                        ? "Баллы появятся в результате после оценки организатором."
                        : "Если ручная оценка не указана, Accepted получает полный балл автоматически. Для остальных решений учитывается 0 баллов."}
                    </p>
                  </>
                )}
              </section>
            )}
          </div>
        )}
      </main>
    </>
  );
}
