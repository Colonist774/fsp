import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Contest, ContestStatus } from "../types/contest";

type ContestCardProps = {
  contest: Contest;
  status: ContestStatus;
  onPublished?: (contest: Contest) => void;
  onError?: (message: string) => void;
};

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(dateString));
}

export default function ContestCard({
  contest,
  status,
  onPublished,
  onError,
}: ContestCardProps) {
  const navigate = useNavigate();
  const [isPublishing, setIsPublishing] = useState(false);

  function openCompetition() {
    navigate(`/contests/${contest.id}`);
  }

  async function publishCompetition() {
    const token = localStorage.getItem("token");

    if (!token || isPublishing) {
      return;
    }

    setIsPublishing(true);
    onError?.("");

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/competitions/${contest.id}/publish`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        onError?.(
          typeof data.detail === "string"
            ? data.detail
            : "Не удалось опубликовать соревнование",
        );
        return;
      }

      onPublished?.(data as Contest);
    } catch {
      onError?.("Не удалось подключиться к серверу");
    } finally {
      setIsPublishing(false);
    }
  }

  if (status === "draft") {
    return (
      <div className="contest-card">
        <span className="contest-title">{contest.title}</span>
        <button
          type="button"
          disabled={isPublishing}
          onClick={publishCompetition}
        >
          {isPublishing ? "Публикация..." : "Опубликовать"}
        </button>
        <button type="button" onClick={openCompetition}>
          Настроить
        </button>
      </div>
    );
  }

  if (status === "active") {
    return (
      <div className="contest-card">
        <span className="contest-title">{contest.title}</span>
        <span>Активно до: {formatDate(contest.end_at)}</span>
        <button type="button" onClick={openCompetition}>
          Перейти
        </button>
      </div>
    );
  }

  if (status === "future") {
    return (
      <div className="contest-card">
        <span className="contest-title">{contest.title}</span>
        <span>Старт: {formatDate(contest.start_at)}</span>
        <button type="button" onClick={openCompetition}>
          Подробнее
        </button>
      </div>
    );
  }

  return (
    <div className="contest-card">
      <span className="contest-title">{contest.title}</span>
      <span>Завершено: {formatDate(contest.end_at)}</span>
      <button type="button" onClick={openCompetition}>
        Результаты
      </button>
    </div>
  );
}
