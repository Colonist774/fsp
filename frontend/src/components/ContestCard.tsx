import { useNavigate } from "react-router-dom";
import type { Contest, ContestStatus } from "../types/contest";

type ContestCardProps = {
  contest: Contest;
  status: ContestStatus;
};

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(dateString));
}

export default function ContestCard({ contest, status }: ContestCardProps) {
  const navigate = useNavigate();

  function openCompetition() {
    navigate(`/contests/${contest.id}`);
  }

  if (status === "draft") {
    return (
      <div className="contest-card">
        <span className="contest-title">{contest.title}</span>
        <span>Не опубликовано</span>
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
