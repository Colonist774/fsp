import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "../components/Navbar";

type Announcement = {
  id: number;
  title: string;
  content: string;
  image_url: string | null;
  created_at: string;
  updated_at: string;
};

type CurrentUser = {
  role: "participant" | "organizer";
};

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(dateString));
}

export default function AnnouncementPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [role, setRole] = useState<CurrentUser["role"]>("participant");
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    async function loadAnnouncement() {
      const token = localStorage.getItem("token");
      const headers = token
        ? { Authorization: `Bearer ${token}` }
        : undefined;

      try {
        const [announcementResponse, meResponse] = await Promise.all([
          fetch(`http://127.0.0.1:8000/api/announcements/${id}`),
          fetch("http://127.0.0.1:8000/api/me", { headers }),
        ]);

        if (!announcementResponse.ok) {
          setError(
            announcementResponse.status === 404
              ? "Анонс не найден"
              : "Не удалось загрузить анонс",
          );
          return;
        }

        const data: Announcement = await announcementResponse.json();
        setAnnouncement(data);

        if (meResponse.ok) {
          const me: CurrentUser = await meResponse.json();
          setRole(me.role);
        }
      } catch {
        setError("Не удалось подключиться к серверу");
      }
    }

    loadAnnouncement();
  }, [id]);

  async function deleteAnnouncement() {
    if (
      !announcement ||
      !window.confirm("Удалить этот анонс?")
    ) {
      return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/announcements/${announcement.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        setError("Не удалось удалить анонс");
        return;
      }

      navigate("/announcements");
    } catch {
      setError("Не удалось подключиться к серверу");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <Navbar />

      <main className="page announcement-page">
        <button
          className="announcement-back"
          type="button"
          onClick={() => navigate("/announcements")}
        >
          ← К анонсам
        </button>

        {error && <div className="auth-error">{error}</div>}

        {announcement && (
          <article>
            <div className="announcement-detail-heading">
              <div>
                <time>{formatDate(announcement.created_at)}</time>
                <h1>{announcement.title}</h1>
              </div>

              {role === "organizer" && (
                <div className="announcement-admin-actions">
                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        `/organizer/announcements/${announcement.id}/edit`,
                      )
                    }
                  >
                    Редактировать
                  </button>
                  <button
                    type="button"
                    className="announcement-delete"
                    disabled={isDeleting}
                    onClick={deleteAnnouncement}
                  >
                    {isDeleting ? "Удаление..." : "Удалить"}
                  </button>
                </div>
              )}
            </div>

            {announcement.image_url && (
              <img
                className="announcement-hero"
                src={announcement.image_url}
                alt=""
              />
            )}

            <div className="announcement-body">
              {announcement.content}
            </div>
          </article>
        )}
      </main>
    </>
  );
}
