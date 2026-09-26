import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";

type CurrentUser = {
  role: "participant" | "organizer";
};

type SportDiscipline = {
  id: number;
  name: string;
};

export default function PlatformSettingsPage() {
  const navigate = useNavigate();
  const [disciplines, setDisciplines] = useState<SportDiscipline[]>([]);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadDisciplines() {
    const token = localStorage.getItem("token");

    if (!token) {
      setError("Требуется авторизация");
      setIsLoading(false);
      return;
    }

    const headers = {
      Authorization: `Bearer ${token}`,
    };

    try {
      const [meResponse, disciplinesResponse] = await Promise.all([
        fetch("http://127.0.0.1:8000/api/me", { headers }),
        fetch("http://127.0.0.1:8000/api/disciplines", { headers }),
      ]);

      if (!meResponse.ok || !disciplinesResponse.ok) {
        setError("Не удалось загрузить настройки платформы");
        return;
      }

      const me: CurrentUser = await meResponse.json();

      if (me.role !== "organizer") {
        setError("Недостаточно прав");
        return;
      }

      const data: SportDiscipline[] =
        await disciplinesResponse.json();
      setDisciplines(data);
    } catch {
      setError("Не удалось подключиться к серверу");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadDisciplines();
  }, []);

  async function addDiscipline(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const token = localStorage.getItem("token");
    const name = newName.trim();

    if (!token || !name) {
      return;
    }

    setIsAdding(true);
    setError(null);

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/api/platform/disciplines",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ name }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          typeof data.detail === "string"
            ? data.detail
            : "Не удалось добавить дисциплину",
        );
        return;
      }

      setNewName("");
      await loadDisciplines();
    } catch {
      setError("Не удалось подключиться к серверу");
    } finally {
      setIsAdding(false);
    }
  }

  async function saveDiscipline(discipline: SportDiscipline) {
    const token = localStorage.getItem("token");
    const name = editingName.trim();

    if (!token || !name) {
      return;
    }

    setSavingId(discipline.id);
    setError(null);

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/platform/disciplines/${discipline.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ name }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          typeof data.detail === "string"
            ? data.detail
            : "Не удалось сохранить дисциплину",
        );
        return;
      }

      setEditingId(null);
      setEditingName("");
      await loadDisciplines();
    } catch {
      setError("Не удалось подключиться к серверу");
    } finally {
      setSavingId(null);
    }
  }

  async function deleteDiscipline(discipline: SportDiscipline) {
    const token = localStorage.getItem("token");

    if (!token) {
      return;
    }

    if (
      !window.confirm(
        `Удалить дисциплину «${discipline.name}» из списка платформы?`,
      )
    ) {
      return;
    }

    setSavingId(discipline.id);
    setError(null);

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/platform/disciplines/${discipline.id}`,
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
            : "Не удалось удалить дисциплину",
        );
        return;
      }

      if (editingId === discipline.id) {
        setEditingId(null);
        setEditingName("");
      }

      await loadDisciplines();
    } catch {
      setError("Не удалось подключиться к серверу");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <>
      <Navbar />

      <main className="page platform-settings-page">
        <button
          className="page-back"
          type="button"
          onClick={() => navigate(-1)}
        >
          ← Назад
        </button>

        <div className="platform-settings-heading">
          <h1>Настройки платформы</h1>
          <p>
            Управление справочниками, используемыми на ФСП.
          </p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        {!isLoading && (
          <section className="platform-settings-section">
            <div className="platform-settings-section-heading">
              <h2>Спортивные дисциплины</h2>
              <p>
                Список используется при создании соревнований
                и в профилях участников.
              </p>
            </div>

            <form
              className="platform-discipline-add"
              onSubmit={addDiscipline}
            >
              <input
                value={newName}
                minLength={2}
                maxLength={100}
                placeholder="Название новой дисциплины"
                disabled={isAdding}
                onChange={(event) => setNewName(event.target.value)}
              />
              <button
                type="submit"
                disabled={isAdding || !newName.trim()}
              >
                {isAdding ? "Добавление..." : "Добавить"}
              </button>
            </form>

            <div className="platform-discipline-list">
              {disciplines.map((discipline) => {
                const isEditing = editingId === discipline.id;

                return (
                  <div
                    className="platform-discipline-row"
                    key={discipline.id}
                  >
                    {isEditing ? (
                      <input
                        value={editingName}
                        minLength={2}
                        maxLength={100}
                        autoFocus
                        disabled={savingId === discipline.id}
                        onChange={(event) =>
                          setEditingName(event.target.value)
                        }
                      />
                    ) : (
                      <strong>{discipline.name}</strong>
                    )}

                    <div className="platform-discipline-actions">
                      {isEditing ? (
                        <>
                          <button
                            type="button"
                            disabled={
                              savingId === discipline.id ||
                              !editingName.trim()
                            }
                            onClick={() =>
                              saveDiscipline(discipline)
                            }
                          >
                            Сохранить
                          </button>
                          <button
                            type="button"
                            disabled={savingId === discipline.id}
                            onClick={() => {
                              setEditingId(null);
                              setEditingName("");
                            }}
                          >
                            Отмена
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            disabled={savingId === discipline.id}
                            onClick={() => {
                              setEditingId(discipline.id);
                              setEditingName(discipline.name);
                            }}
                          >
                            Изменить
                          </button>
                          <button
                            className="platform-discipline-delete"
                            type="button"
                            disabled={savingId === discipline.id}
                            onClick={() =>
                              deleteDiscipline(discipline)
                            }
                          >
                            Удалить
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </>
  );
}
