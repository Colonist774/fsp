import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";

type CurrentUser = {
  id: number;
  role: "participant" | "organizer";
  organizer_probation_until: string | null;
};

type Organizer = {
  id: number;
  username: string;
  full_name: string | null;
  organizer_probation_until: string | null;
  on_probation: boolean;
};

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(dateString));
}

export default function OrganizerAccessPage() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [organizers, setOrganizers] = useState<Organizer[]>([]);
  const [revokingId, setRevokingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      const token = localStorage.getItem("token");

      if (!token) {
        setError("Требуется авторизация");
        return;
      }

      const headers = {
        Authorization: `Bearer ${token}`,
      };

      try {
        const [meResponse, organizersResponse] = await Promise.all([
          fetch("http://127.0.0.1:8000/api/me", { headers }),
          fetch("http://127.0.0.1:8000/api/organizers", { headers }),
        ]);

        if (!meResponse.ok || !organizersResponse.ok) {
          setError("Не удалось загрузить список организаторов");
          return;
        }

        const me: CurrentUser = await meResponse.json();

        if (me.role !== "organizer") {
          setError("Недостаточно прав");
          return;
        }

        const data: Organizer[] = await organizersResponse.json();
        setCurrentUser(me);
        setOrganizers(data);
      } catch {
        setError("Не удалось подключиться к серверу");
      }
    }

    loadData();
  }, []);

  const canManageOrganizerAccess =
    currentUser?.role === "organizer" &&
    (
      currentUser.organizer_probation_until === null ||
      new Date(currentUser.organizer_probation_until).getTime() <= Date.now()
    );

  async function revokeOrganizer(organizer: Organizer) {
    if (
      !canManageOrganizerAccess ||
      !organizer.on_probation ||
      organizer.id === currentUser?.id
    ) {
      return;
    }

    if (
      !window.confirm(
        `Отозвать права организатора у ${organizer.username}? Пользователь снова станет обычным участником.`,
      )
    ) {
      return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      return;
    }

    setError(null);
    setRevokingId(organizer.id);

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/users/${organizer.id}/organizer-rights`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        const data = await response.json();
        setError(
          typeof data.detail === "string"
            ? data.detail
            : "Не удалось отозвать права организатора",
        );
        return;
      }

      setOrganizers((current) =>
        current.filter((item) => item.id !== organizer.id),
      );
    } catch {
      setError("Не удалось подключиться к серверу");
    } finally {
      setRevokingId(null);
    }
  }

  return (
    <>
      <Navbar />

      <main className="page organizer-access-page">
        <button
          className="page-back"
          type="button"
          onClick={() => navigate(-1)}
        >
          ← Назад
        </button>

        <h1>Организаторы</h1>

        {error && <div className="auth-error">{error}</div>}

        {currentUser?.organizer_probation_until &&
          new Date(currentUser.organizer_probation_until).getTime() > Date.now() && (
            <div className="organizer-probation-note">
              Вы на испытательном сроке до{" "}
              {formatDate(currentUser.organizer_probation_until)}. В этот период
              нельзя назначать и отзывать права организаторов.
            </div>
          )}

        <div className="organizer-access-table">
          <div className="organizer-access-header">
            <span>Пользователь</span>
            <span>Статус</span>
            <span />
          </div>

          {organizers.map((organizer) => (
            <div className="organizer-access-row" key={organizer.id}>
              <div>
                <strong>{organizer.username}</strong>
                {organizer.full_name && <span>{organizer.full_name}</span>}
              </div>

              <span>
                {organizer.on_probation &&
                organizer.organizer_probation_until
                  ? `Испытательный срок до ${formatDate(
                      organizer.organizer_probation_until,
                    )}`
                  : "Организатор"}
              </span>

              <div className="organizer-access-action">
                {canManageOrganizerAccess &&
                  organizer.on_probation &&
                  organizer.id !== currentUser?.id && (
                    <button
                      type="button"
                      disabled={revokingId === organizer.id}
                      onClick={() => revokeOrganizer(organizer)}
                    >
                      {revokingId === organizer.id
                        ? "Отзыв..."
                        : "Отозвать права"}
                    </button>
                  )}
              </div>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
