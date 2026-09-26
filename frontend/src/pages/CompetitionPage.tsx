import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import type { Contest } from "../types/contest";

type CurrentUser = {
  role: "participant" | "organizer";
};

type CompetitionParticipant = {
  user_id: number;
  username: string;
  email: string | null;
  team_status: "member" | "looking" | "solo";
  team_name: string | null;
  registered_at: string;
  finished_at: string | null;
  score: number | null;
  place: number | null;
};

type CompetitionResult = {
  user_id: number;
  username: string;
  score: number | null;
  place: number | null;
  rating_points: number;
};

type CompetitionTask = {
  task_id: number;
  position: number;
  title: string;
  difficulty: number;
  points: number;
};

const levelLabels = {
  russia: "Чемпионат / Кубок России",
  all_russian: "Всероссийское",
  interregional: "Межрегиональное",
  regional_championship: "Чемпионат / Кубок региона",
  regional: "Региональное",
};

const formatLabels = {
  online: "Онлайн",
  offline: "Очно",
  hybrid: "Смешанный",
};

function formatDateTime(dateString: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateString));
}

function getTeamLabel(participant: CompetitionParticipant) {
  if (participant.team_status === "member") {
    return participant.team_name || "—";
  }

  if (participant.team_status === "looking") {
    return "В поиске";
  }

  return "—";
}

export default function CompetitionPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [competition, setCompetition] = useState<Contest | null>(null);
  const [role, setRole] = useState<CurrentUser["role"]>("participant");
  const [participants, setParticipants] = useState<CompetitionParticipant[]>([]);
  const [results, setResults] = useState<CompetitionResult[]>([]);
  const [tasks, setTasks] = useState<CompetitionTask[]>([]);
  const [deletingTaskId, setDeletingTaskId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [savingUserId, setSavingUserId] = useState<number | null>(null);

  async function loadCompetition() {
    const token = localStorage.getItem("token");
    const headers = token
      ? { Authorization: `Bearer ${token}` }
      : undefined;

    try {
      const [competitionResponse, meResponse] = await Promise.all([
        fetch(`http://127.0.0.1:8000/api/competitions/${id}`, {
          headers,
        }),
        fetch("http://127.0.0.1:8000/api/me", { headers }),
      ]);

      if (!competitionResponse.ok) {
        setError(
          competitionResponse.status === 404
            ? "Соревнование не найдено"
            : "Не удалось загрузить соревнование",
        );
        return;
      }

      const competitionData: Contest =
        await competitionResponse.json();
      setCompetition(competitionData);

      if (meResponse.ok) {
        const user: CurrentUser = await meResponse.json();
        setRole(user.role);
      }
    } catch {
      setError("Не удалось подключиться к серверу");
    }
  }

  async function loadParticipants() {
    const token = localStorage.getItem("token");

    if (!token || role !== "organizer") {
      return;
    }

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/competitions/${id}/participants`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        return;
      }

      const data: CompetitionParticipant[] = await response.json();
      setParticipants(data);
    } catch {
      return;
    }
  }

  async function loadResults() {
    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/competitions/${id}/results`,
      );

      if (!response.ok) {
        return;
      }

      const data: CompetitionResult[] = await response.json();
      setResults(data);
    } catch {
      return;
    }
  }

  async function loadTasks() {
    const token = localStorage.getItem("token");

    if (!token || !competition || competition.conduct_mode !== "platform") {
      setTasks([]);
      return;
    }

    const participantCanSee =
      role === "participant" &&
      competition.is_registered &&
      (competition.status === "active" ||
        competition.status === "past");

    if (role !== "organizer" && !participantCanSee) {
      setTasks([]);
      return;
    }

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/competitions/${id}/tasks`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        return;
      }

      const data: CompetitionTask[] = await response.json();
      setTasks(data);
    } catch {
      return;
    }
  }

  useEffect(() => {
    loadCompetition();
  }, [id]);

  useEffect(() => {
    if (role === "organizer") {
      loadParticipants();
    }
  }, [id, role]);

  useEffect(() => {
    if (competition?.status === "past") {
      loadResults();
    }
  }, [id, competition?.status]);

  useEffect(() => {
    loadTasks();
  }, [
    id,
    role,
    competition?.conduct_mode,
    competition?.status,
    competition?.is_registered,
  ]);

  async function registerForCompetition() {
    const token = localStorage.getItem("token");

    if (!token) {
      return;
    }

    setIsRegistering(true);
    setError(null);

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/competitions/${id}/register`,
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
            : "Не удалось зарегистрироваться",
        );
        return;
      }

      setCompetition(data);
    } catch {
      setError("Не удалось подключиться к серверу");
    } finally {
      setIsRegistering(false);
    }
  }

  function updateParticipant(
    userId: number,
    patch: Partial<CompetitionParticipant>,
  ) {
    setParticipants((current) =>
      current.map((participant) =>
        participant.user_id === userId
          ? { ...participant, ...patch }
          : participant,
      ),
    );
  }

  async function deleteTask(task: CompetitionTask) {
    const token = localStorage.getItem("token");

    if (!token || role !== "organizer") {
      return;
    }

    if (!window.confirm(`Удалить задачу «${task.title}»?`)) {
      return;
    }

    setDeletingTaskId(task.task_id);
    setError(null);

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/organizer/competitions/${id}/tasks/${task.task_id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setError(
          typeof data?.detail === "string"
            ? data.detail
            : "Не удалось удалить задачу",
        );
        return;
      }

      await loadTasks();
    } catch {
      setError("Не удалось подключиться к серверу");
    } finally {
      setDeletingTaskId(null);
    }
  }

  async function publishCompetition() {
    const token = localStorage.getItem("token");

    if (!token || !competition || role !== "organizer") {
      return;
    }

    setIsPublishing(true);
    setError(null);

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/competitions/${competition.id}/publish`,
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
            : "Не удалось опубликовать соревнование",
        );
        return;
      }

      setCompetition(data);
    } catch {
      setError("Не удалось подключиться к серверу");
    } finally {
      setIsPublishing(false);
    }
  }

  async function saveResult(participant: CompetitionParticipant) {
    const token = localStorage.getItem("token");

    if (!token) {
      return;
    }

    setSavingUserId(participant.user_id);
    setError(null);

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/competitions/${id}/results/${participant.user_id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            place: participant.place,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          typeof data.detail === "string"
            ? data.detail
            : "Не удалось сохранить результат",
        );
        return;
      }

      updateParticipant(participant.user_id, data);
      await loadResults();
    } catch {
      setError("Не удалось подключиться к серверу");
    } finally {
      setSavingUserId(null);
    }
  }

  if (!competition) {
    return (
      <>
        <Navbar />
        <main className="page competition-page">
          {error && <div className="auth-error">{error}</div>}
        </main>
      </>
    );
  }

  const statusLabel =
    competition.status === "draft"
      ? "Черновик"
      : competition.status === "future"
        ? "Опубликовано"
        : competition.status === "active"
          ? "Идёт сейчас"
          : "Завершено";

  return (
    <>
      <Navbar />

      <main className="page competition-page">
        <button
          className="competition-back"
          type="button"
          onClick={() =>
            navigate(
              competition.status === "active"
                ? "/"
                : `/?tab=${competition.status}`,
            )
          }
        >
          ← К соревнованиям
        </button>

        <div className="competition-heading">
          <div>
            <span className="competition-status">{statusLabel}</span>
            <h1>{competition.title}</h1>
          </div>

          {role === "organizer" &&
            competition.status !== "past" && (
              <div className="competition-heading-actions">
                {competition.status === "draft" && (
                  <button
                    className="competition-publish"
                    type="button"
                    disabled={isPublishing}
                    onClick={publishCompetition}
                  >
                    {isPublishing ? "Публикация..." : "Опубликовать"}
                  </button>
                )}

                <button
                  className="competition-edit"
                  type="button"
                  onClick={() =>
                    navigate(
                      `/organizer/competitions/${competition.id}/edit`,
                    )
                  }
                >
                  Редактировать
                </button>
              </div>
            )}
        </div>

        <section className="competition-details">
          <div>
            <span>Уровень</span>
            <strong>{levelLabels[competition.level]}</strong>
          </div>
          <div>
            <span>Дисциплина</span>
            <strong>{competition.discipline}</strong>
          </div>
          <div>
            <span>Формат</span>
            <strong>{formatLabels[competition.format]}</strong>
          </div>
          <div>
            <span>Начало</span>
            <strong>{formatDateTime(competition.start_at)}</strong>
          </div>
          <div>
            <span>Завершение</span>
            <strong>{formatDateTime(competition.end_at)}</strong>
          </div>
          <div>
            <span>Регистрация до</span>
            <strong>
              {formatDateTime(competition.registration_deadline)}
            </strong>
          </div>
          {competition.venue && (
            <div>
              <span>Место проведения</span>
              <strong>{competition.venue}</strong>
            </div>
          )}
          <div>
            <span>Участников</span>
            <strong>{competition.registered_count}</strong>
          </div>
        </section>

        <section className="competition-description">
          <h2>О соревновании</h2>
          <p>{competition.description}</p>
        </section>

        {competition.rules && (
          <section className="competition-description">
            <h2>Правила</h2>
            <p>{competition.rules}</p>
          </section>
        )}

        {error && <div className="competition-inline-error auth-error">{error}</div>}

        {role === "participant" &&
          competition.status === "future" &&
          competition.registration_open && (
            <button
              className="competition-primary-action"
              type="button"
              disabled={competition.is_registered || isRegistering}
              onClick={registerForCompetition}
            >
              {competition.is_registered
                ? "Вы участвуете"
                : isRegistering
                  ? "Регистрация..."
                  : "Буду участвовать"}
            </button>
          )}

        {role === "participant" &&
          competition.status === "active" &&
          competition.conduct_mode === "platform" && (
            <button
              className="competition-primary-action"
              type="button"
              disabled={
                !competition.is_registered ||
                competition.participation_finished ||
                tasks.length === 0
              }
              onClick={() => {
                if (tasks.length > 0) {
                  navigate(
                    `/contests/${competition.id}/tasks/${tasks[0].task_id}`,
                  );
                }
              }}
            >
              {!competition.is_registered
                ? "Вы не зарегистрированы"
                : competition.participation_finished
                  ? "Участие завершено"
                  : tasks.length === 0
                    ? "Задачи пока не добавлены"
                    : "Начать"}
            </button>
          )}

        {competition.conduct_mode === "platform" &&
          (role === "organizer" ||
            (competition.is_registered &&
              (competition.status === "active" ||
                competition.status === "past"))) && (
            <section className="competition-tasks-section">
              <div className="competition-section-heading competition-tasks-heading">
                <div>
                  <h2>Задачи</h2>
                  <span>{tasks.length}</span>
                </div>

                {role === "organizer" &&
                  (competition.status === "draft" ||
                    competition.status === "future") && (
                    <button
                      type="button"
                      onClick={() =>
                        navigate(
                          `/organizer/competitions/${competition.id}/tasks/new`,
                        )
                      }
                    >
                      + Добавить задачу
                    </button>
                  )}
              </div>

              {tasks.length === 0 ? (
                <p className="competition-section-empty">
                  Задачи пока не добавлены
                </p>
              ) : (
                <div className="competition-task-list">
                  {tasks.map((task) => (
                    <div
                      className="competition-task-row"
                      key={task.task_id}
                    >
                      <Link
                        className="competition-task-main"
                        to={`/contests/${competition.id}/tasks/${task.task_id}`}
                      >
                        <span className="competition-task-position">
                          {task.position}
                        </span>
                        <strong>{task.title}</strong>
                        <span className="competition-task-difficulty">
                          {"★".repeat(task.difficulty)}
                          {"☆".repeat(5 - task.difficulty)}
                          {" · "}
                          {task.points} баллов
                        </span>
                      </Link>

                      {role === "organizer" && (
                        <div className="competition-task-actions">
                          <button
                            type="button"
                            onClick={() =>
                              navigate(
                                `/organizer/competitions/${competition.id}/tasks/${task.task_id}/edit`,
                              )
                            }
                          >
                            Редактировать
                          </button>
                          {(competition.status === "draft" ||
                            competition.status === "future") && (
                            <button
                              className="competition-task-delete"
                              type="button"
                              disabled={deletingTaskId === task.task_id}
                              onClick={() => deleteTask(task)}
                            >
                              {deletingTaskId === task.task_id
                                ? "Удаление..."
                                : "Удалить"}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

        {competition.status === "past" && results.length > 0 && (
          <section className="competition-results-section">
            <h2>Результаты</h2>

            <div
              className={
                competition.conduct_mode === "platform"
                  ? "competition-results-table is-platform"
                  : "competition-results-table"
              }
            >
              <div className="competition-results-header">
                <span>Место</span>
                <span>Участник</span>
                {competition.conduct_mode === "platform" && (
                  <span>Баллы</span>
                )}
                <span className="competition-rating-points-exampl">
                  Рейтинг
                </span>
              </div>

              {results.map((result) => (
                <div
                  className="competition-results-row"
                  key={result.user_id}
                >
                  <strong>{result.place ?? "—"}</strong>
                  <Link
                    className="competition-athlete-link"
                    to={`/athletes/${result.user_id}`}
                  >
                    {result.username}
                  </Link>
                  {competition.conduct_mode === "platform" && (
                    <strong className="competition-score">
                      {result.score ?? 0}
                    </strong>
                  )}
                  <span className="competition-rating-points">
                    +{result.rating_points}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {role === "organizer" && (
          <section className="competition-participants-section">
            <div className="competition-section-heading">
              <h2>Участники</h2>
              <span>{participants.length}</span>
            </div>

            {participants.length === 0 ? (
              <p className="competition-section-empty">
                Пока никто не зарегистрировался
              </p>
            ) : (
              <div
                className={
                  competition.conduct_mode === "platform"
                    ? "competition-participants-table is-platform"
                    : "competition-participants-table"
                }
              >
                <div className="competition-participants-header">
                  <span>Участник</span>
                  <span>Команда</span>
                  <span>Email</span>
                  <span>Регистрация</span>
                  {competition.conduct_mode === "platform" ? (
                    <>
                      <span>Баллы</span>
                      <span>Место</span>
                    </>
                  ) : (
                    <>
                      <span>Место</span>
                      <span></span>
                    </>
                  )}
                </div>

                {participants.map((participant) => (
                  <div
                    className="competition-participant-row"
                    key={participant.user_id}
                  >
                    <strong>
                      <Link
                        className="competition-athlete-link"
                        to={`/athletes/${participant.user_id}`}
                      >
                        {participant.username}
                      </Link>
                    </strong>
                    <span>{getTeamLabel(participant)}</span>
                    <span>{participant.email || "—"}</span>
                    <span>{formatDateTime(participant.registered_at)}</span>

                    {competition.conduct_mode === "platform" ? (
                      <>
                        <strong className="competition-score">
                          {participant.score ?? 0}
                        </strong>
                        <strong className="competition-place">
                          {participant.place ?? "—"}
                        </strong>
                      </>
                    ) : (
                      <>
                        <input
                          className="competition-result-place"
                          type="number"
                          min={1}
                          value={participant.place ?? ""}
                          disabled={competition.status !== "past"}
                          onChange={(event) =>
                            updateParticipant(participant.user_id, {
                              place: event.target.value
                                ? Number(event.target.value)
                                : null,
                            })
                          }
                        />

                        <button
                          type="button"
                          disabled={
                            competition.status !== "past" ||
                            savingUserId === participant.user_id
                          }
                          onClick={() => saveResult(participant)}
                        >
                          {savingUserId === participant.user_id
                            ? "..."
                            : "Сохранить"}
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

            {competition.conduct_mode === "platform" &&
              participants.length > 0 && (
                <p className="competition-results-note">
                  Баллы и места рассчитываются автоматически по принятым
                  решениям.
                </p>
              )}

            {competition.conduct_mode !== "platform" &&
              competition.status !== "past" &&
              participants.length > 0 && (
                <p className="competition-results-note">
                  Внести результаты можно после завершения соревнования.
                </p>
              )}
          </section>
        )}
      </main>
    </>
  );
}
