import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "../components/Navbar";

const API_ORIGIN = "http://127.0.0.1:8000";
const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

type Announcement = {
  id: number;
  title: string;
  content: string;
  image_url: string | null;
};

type UploadResponse = {
  image_url?: string;
  detail?: string;
};

function resolveImageUrl(imageUrl: string) {
  return imageUrl.startsWith("/")
    ? `${API_ORIGIN}${imageUrl}`
    : imageUrl;
}

export default function AnnouncementFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
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
          `${API_ORIGIN}/api/me`,
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
          `${API_ORIGIN}/api/announcements/${id}`,
        );

        if (!response.ok) {
          setError("Не удалось загрузить анонс");
          return;
        }

        const announcement: Announcement = await response.json();
        setTitle(announcement.title);
        setContent(announcement.content);
        setImageUrl(announcement.image_url ?? "");
        setImagePreview(
          announcement.image_url
            ? resolveImageUrl(announcement.image_url)
            : null,
        );
      } catch {
        setError("Не удалось подключиться к серверу");
      } finally {
        setIsLoading(false);
      }
    }

    loadPage();
  }, [id, isEditing]);

  useEffect(() => {
    return () => {
      if (imagePreview?.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  function handleImageChange(file: File | undefined) {
    if (!file) {
      return;
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setError("Поддерживаются JPEG, PNG, WEBP и GIF");
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setError("Изображение должно быть не больше 8 МБ");
      return;
    }

    if (imagePreview?.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }

    setError(null);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function removeImage() {
    if (imagePreview?.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }

    setImageFile(null);
    setImageUrl("");
    setImagePreview(null);
  }

  async function uploadImage(file: File, token: string) {
    const response = await fetch(
      `${API_ORIGIN}/api/announcements/upload-image`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": file.type,
        },
        body: file,
      },
    );

    const data: UploadResponse = await response.json();

    if (!response.ok || !data.image_url) {
      throw new Error(
        typeof data.detail === "string"
          ? data.detail
          : "Не удалось загрузить изображение",
      );
    }

    return data.image_url;
  }

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
      let nextImageUrl = imageUrl;

      if (imageFile) {
        nextImageUrl = await uploadImage(imageFile, token);
      }

      const response = await fetch(
        isEditing
          ? `${API_ORIGIN}/api/announcements/${id}`
          : `${API_ORIGIN}/api/announcements`,
        {
          method: isEditing ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: title.trim(),
            content: content.trim(),
            image_url: nextImageUrl || null,
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
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Не удалось подключиться к серверу",
      );
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
                className="announcement-file-input"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                disabled={isSaving}
                onChange={(event) =>
                  handleImageChange(event.target.files?.[0])
                }
              />
              <small className="announcement-image-help">
                JPEG, PNG, WEBP или GIF, до 8 МБ
              </small>
            </label>

            {imagePreview && (
              <div className="announcement-image-preview">
                <img src={imagePreview} alt="" />
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={removeImage}
                >
                  Убрать изображение
                </button>
              </div>
            )}

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
