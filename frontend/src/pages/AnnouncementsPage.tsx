import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";

const API_ORIGIN = "http://127.0.0.1:8000";

function resolveImageUrl(imageUrl: string) {
  return imageUrl.startsWith("/")
    ? `${API_ORIGIN}${imageUrl}`
    : imageUrl;
}

type Announcement = {
  id: number;
  title: string;
  content: string;
  image_url: string | null;
  created_at: string;
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

function getPreview(content: string) {
  const normalized = content.replace(/\s+/g, " ").trim();

  if (normalized.length <= 180) {
    return normalized;
  }

  return `${normalized.slice(0, 177)}...`;
}

export default function AnnouncementsPage() {
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [role, setRole] = useState<CurrentUser["role"]>("participant");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAnnouncements() {
      const token = localStorage.getItem("token");
      const headers = token
        ? { Authorization: `Bearer ${token}` }
        : undefined;

      try {
        const [announcementsResponse, meResponse] = await Promise.all([
          fetch("http://127.0.0.1:8000/api/announcements"),
          fetch("http://127.0.0.1:8000/api/me", { headers }),
        ]);

        if (!announcementsResponse.ok) {
          setError("Не удалось загрузить анонсы");
          return;
        }

        const data: Announcement[] = await announcementsResponse.json();
        setAnnouncements(data);

        if (meResponse.ok) {
          const me: CurrentUser = await meResponse.json();
          setRole(me.role);
        }
      } catch {
        setError("Не удалось подключиться к серверу");
      }
    }

    loadAnnouncements();
  }, []);

  return (
    <>
      <Navbar />

      <main className="page announcements-page">
        <div className="announcements-heading">
          <h1>Анонсы</h1>

          {role === "organizer" && (
            <button
              type="button"
              onClick={() => navigate("/organizer/announcements/new")}
            >
              Создать анонс
            </button>
          )}
        </div>

        {error && <div className="auth-error">{error}</div>}

        {!error && announcements.length === 0 && (
          <p className="announcements-empty">Анонсов пока нет</p>
        )}

        <div className="announcements-list">
          {announcements.map((announcement) => (
            <Link
              className="announcement-card"
              to={`/announcements/${announcement.id}`}
              key={announcement.id}
            >
              {announcement.image_url && (
                <img
                  src={resolveImageUrl(announcement.image_url)}
                  alt=""
                  className="announcement-card-image"
                />
              )}

              <div className="announcement-card-content">
                <time>{formatDate(announcement.created_at)}</time>
                <h2>{announcement.title}</h2>
                <p>{getPreview(announcement.content)}</p>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
