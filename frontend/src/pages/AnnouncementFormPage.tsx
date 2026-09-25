import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "../components/Navbar";

type Announcement = {
  id: number;
  title: string;
  content: string;
  image_url: string | null;
};

export default function AnnouncementFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(isEditing);
  const [isSaving, setIsSaving] = useState(false);
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

        const response = await fetch(
          `http://127.0.0.1:8000/api/announcements/${id}`,
        );

        if (!response.ok) {
          setError("Не удалось загрузить анонс");
          return;
        }

        const announcement: Announcement = await response.json();
        setTitle(announcement.title);
        setContent(announcement.content);
        setImageUrl(announcement.image_url ?? "");
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
          ? `http://127.0.0.1:8000/api/announcements/${id}`
          : "http://127.0.0.1:8000/api/announcements",
        {
          method: isEditing ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: title.trim(),
            content: content.trim(),
            image_url: imageUrl.trim() || null,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          typeof data.detail === "string"
            ? data.detail
            : "Не удалось сохранить анонс",
        );
        return;
      }

      navigate(`/announcements/${data.id}`);
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
        <main className="page announcement-form-page">
          <div className="auth-error">Недостаточно прав</div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />

      <main className="page announcement-form-page">
        <h1>
          {isEditing ? "Редактировать анонс" : "Создать анонс"}
        </h1>

        {!isLoading && allowed && (
          <form
            className="announcement-form"
            onSubmit={handleSubmit}
          >
            <label>
              <span>Название</span>
              <input
                type="text"
                value={title}
                minLength={3}
                maxLength={220}
                required
                disabled={isSaving}
                onChange={(event) => setTitle(event.target.value)}
              />
            </label>

            <label>
              <span>Изображение</span>
              <input
                type="url"
                value={imageUrl}
                maxLength={1000}
                placeholder="Ссылка на изображение"
                disabled={isSaving}
                onChange={(event) => setImageUrl(event.target.value)}
              />
            </label>

            <label>
              <span>Текст</span>
              <textarea
                value={content}
                maxLength={20000}
                rows={16}
                required
                disabled={isSaving}
                onChange={(event) => setContent(event.target.value)}
              />
            </label>

            {error && <div className="auth-error">{error}</div>}

            <button
              className="auth-submit announcement-form-submit"
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
