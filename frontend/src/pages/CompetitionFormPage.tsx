import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import type {
  CompetitionConductMode,
  CompetitionFormat,
  CompetitionLevel,
  Contest,
} from "../types/contest";

function toDateTimeLocal(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);

  return local.toISOString().slice(0, 16);
}

export default function CompetitionFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [rules, setRules] = useState("");
  const [level, setLevel] =
    useState<CompetitionLevel>("regional");
  const [discipline, setDiscipline] = useState(
    "Алгоритмическое программирование",
  );
  const [format, setFormat] =
    useState<CompetitionFormat>("online");
  const [conductMode, setConductMode] =
    useState<CompetitionConductMode>("platform");
  const [venue, setVenue] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [registrationDeadline, setRegistrationDeadline] =
    useState("");
  const [publishTasks, setPublishTasks] = useState(false);
  const [isLoading, setIsLoading] = useState(isEditing);
  const [isSaving, setIsSaving] = useState(false);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPage() {
      const token = localStorage.getItem("token");

      if (!token) {
        setAllowed(false);
        setIsLoading(false);
        return;
      }

      try {
        const meResponse = await fetch(
          "http://127.0.0.1:8000/api/me",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (!meResponse.ok) {
          setAllowed(false);
          return;
        }

        const user = await meResponse.json();

        if (user.role !== "organizer") {
          setAllowed(false);
          return;
        }

        setAllowed(true);

        if (!isEditing) {
          return;
        }

        const competitionResponse = await fetch(
          `http://127.0.0.1:8000/api/competitions/${id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (!competitionResponse.ok) {
          setError("Не удалось загрузить соревнование");
          return;
        }

        const competition: Contest =
          await competitionResponse.json();

        setTitle(competition.title);
        setDescription(competition.description);
        setRules(competition.rules);
        setLevel(competition.level);
        setDiscipline(competition.discipline);
        setFormat(competition.format);
        setConductMode(competition.conduct_mode);
        setVenue(competition.venue ?? "");
        setStartAt(toDateTimeLocal(competition.start_at));
        setEndAt(toDateTimeLocal(competition.end_at));
        setRegistrationDeadline(
          toDateTimeLocal(competition.registration_deadline),
        );
        setPublishTasks(
          competition.publish_tasks_after_finish,
        );
      } catch {
        setError("Не удалось подключиться к серверу");
      } finally {
        setIsLoading(false);
      }
    }

    loadPage();
  }, [id, isEditing]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const token = localStorage.getItem("token");

    if (!token) {
      setError("Требуется авторизация");
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      const response = await fetch(
        isEditing
          ? `http://127.0.0.1:8000/api/competitions/${id}`
          : "http://127.0.0.1:8000/api/competitions",
        {
          method: isEditing ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim(),
            rules: rules.trim(),
            level,
            discipline: discipline.trim(),
            format,
            conduct_mode: conductMode,
            venue:
              conductMode === "platform" && format === "online"
                ? null
                : venue.trim() || null,
            start_at: new Date(startAt).toISOString(),
            end_at: new Date(endAt).toISOString(),
            registration_deadline:
              new Date(registrationDeadline).toISOString(),
            publish_tasks_after_finish:
              conductMode === "platform" && publishTasks,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          typeof data.detail === "string"
            ? data.detail
            : "Не удалось сохранить соревнование",
        );
        return;
      }

      navigate(`/contests/${data.id}`);
    } catch {
      setError("Не удалось подключиться к серверу");
    } finally {
      setIsSaving(false);
    }
  }

  if (allowed === false) {
    return (
      <>
        <Navbar />
        <main className="page competition-form-page">
          <button
            className="page-back"
            type="button"
            onClick={() =>
              navigate(
                isEditing && id
                  ? `/contests/${id}`
                  : "/",
              )
            }
          >
            {isEditing ? "← К соревнованию" : "← К соревнованиям"}
          </button>
          <div className="auth-error">Недостаточно прав</div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />

      <main className="page competition-form-page">
        <button
          className="page-back"
          type="button"
          onClick={() =>
            navigate(
              isEditing && id
                ? `/contests/${id}`
                : "/",
            )
          }
        >
          {isEditing ? "← К соревнованию" : "← К соревнованиям"}
        </button>
        <h1>
          {isEditing
            ? "Редактировать соревнование"
            : "Создать соревнование"}
        </h1>

        {!isLoading && allowed && (
          <form
            className="competition-form"
            onSubmit={handleSubmit}
          >
            <label>
              <span>Название</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                minLength={3}
                maxLength={200}
                required
              />
            </label>

            <label>
              <span>Описание</span>
              <textarea
                value={description}
                onChange={(event) =>
                  setDescription(event.target.value)
                }
                rows={7}
                maxLength={5000}
                required
              />
            </label>

            <label>
              <span>Правила / инструкция</span>
              <textarea
                value={rules}
                onChange={(event) =>
                  setRules(event.target.value)
                }
                rows={6}
                maxLength={10000}
                placeholder="Порядок участия, ограничения, критерии оценки и другая важная информация"
              />
            </label>

            <div className="competition-form-grid">
              <label>
                <span>Уровень</span>
                <select
                  value={level}
                  onChange={(event) =>
                    setLevel(
                      event.target.value as CompetitionLevel,
                    )
                  }
                >
                  <option value="russia">
                    Чемпионат / Кубок России
                  </option>
                  <option value="all_russian">
                    Всероссийское
                  </option>
                  <option value="interregional">
                    Межрегиональное
                  </option>
                  <option value="regional_championship">
                    Чемпионат / Кубок региона
                  </option>
                  <option value="regional">
                    Региональное
                  </option>
                </select>
              </label>

              <label>
                <span>Дисциплина</span>
                <input
                  value={discipline}
                  onChange={(event) =>
                    setDiscipline(event.target.value)
                  }
                  maxLength={100}
                  required
                />
              </label>

              <label>
                <span>Формат</span>
                <select
                  value={format}
                  onChange={(event) =>
                    setFormat(
                      event.target.value as CompetitionFormat,
                    )
                  }
                >
                  <option value="online">Онлайн</option>
                  <option value="offline">Очно</option>
                  <option value="hybrid">Смешанный</option>
                </select>
              </label>

              <label>
                <span>Проведение</span>
                <select
                  value={conductMode}
                  onChange={(event) => {
                    const value =
                      event.target.value as CompetitionConductMode;
                    setConductMode(value);

                    if (value === "external") {
                      setPublishTasks(false);
                    }
                  }}
                >
                  <option value="platform">
                    На платформе
                  </option>
                  <option value="external">
                    Вне платформы
                  </option>
                </select>
              </label>

              <label>
                <span>Начало</span>
                <input
                  type="datetime-local"
                  value={startAt}
                  onChange={(event) =>
                    setStartAt(event.target.value)
                  }
                  required
                />
              </label>

              <label>
                <span>Завершение</span>
                <input
                  type="datetime-local"
                  value={endAt}
                  onChange={(event) =>
                    setEndAt(event.target.value)
                  }
                  required
                />
              </label>

              <label>
                <span>Регистрация до</span>
                <input
                  type="datetime-local"
                  value={registrationDeadline}
                  onChange={(event) =>
                    setRegistrationDeadline(event.target.value)
                  }
                  required
                />
              </label>

              {!(conductMode === "platform" && format === "online") && (
                <label>
                  <span>Место проведения</span>
                  <input
                    value={venue}
                    onChange={(event) =>
                      setVenue(event.target.value)
                    }
                    maxLength={255}
                  />
                </label>
              )}
            </div>

            {conductMode === "platform" && (
              <>
                <label className="competition-form-checkbox">
                  <input
                    type="checkbox"
                    checked={publishTasks}
                    onChange={(event) =>
                      setPublishTasks(event.target.checked)
                    }
                  />
                  <span>
                    Добавить задачи в сборник задач после завершения
                    турнира
                  </span>
                </label>

                <p className="competition-form-help">
                  Задачи добавляются на странице соревнования после его сохранения.
                </p>
              </>
            )}

            {error && <div className="auth-error">{error}</div>}

            <button
              className="auth-submit competition-form-submit"
              type="submit"
              disabled={isSaving}
            >
              {isSaving ? "Сохранение..." : "Сохранить"}
            </button>
          </form>
        )}
      </main>
    </>
  );
}
