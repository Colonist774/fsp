import type { Contest, ContestStatus } from "../types/contest";

type ContestCardProps = {
  contest: Contest;
  status: ContestStatus;
};

export default function ContestCard({ contest, status }: ContestCardProps) {
  if (status === "active") {
    return (
      <div className="contest-card contest-card--active">
        <div className="contest-card__content">
          <span className="contest-status contest-status--active">Активно</span>
          <span className="contest-title">{contest.title}</span>
          <span className="contest-date">До {contest.endAt}</span>
        </div>

        <button className="contest-button">Перейти</button>
      </div>
    );
  }

  if (status === "future") {
    return (
      <div className="contest-card contest-card--future">
        <div className="contest-card__content">
          <span className="contest-status contest-status--future">Скоро</span>
          <span className="contest-title">{contest.title}</span>
          <span className="contest-date">Начало {contest.startAt}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="contest-card contest-card--past">
      <div className="contest-card__content">
        <span className="contest-status contest-status--past">Завершено</span>
        <span className="contest-title">{contest.title}</span>
        <span className="contest-date">{contest.endAt}</span>
      </div>

      <button className="contest-button contest-button--secondary">
        Результаты
      </button>
    </div>
  );
}
