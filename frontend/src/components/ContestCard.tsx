import type { Contest } from "../types/contest";
import type { ContestStatus } from "../types/contest";

type ContestCardProps = {
    contest: Contest,
    status: ContestStatus,
}

function formatDate(dateString: string) {
    const date = new Date(dateString);

    return [
        String(date.getDate()).padStart(2, "0"),
        String(date.getMonth() + 1).padStart(2, "0"),
        date.getFullYear(),
    ].join(".");
}

export default function ContestCard({ contest, status }: ContestCardProps) {
    if (status === "active") {
        return (
            <div className="contest-card">
                <span className="contest-title">{contest.title}</span>
                <span>Активно до: {formatDate(contest.endAt)}</span>
                <button>Перейти</button>
            </div>
        )
    } else if (status === "future") {
        return (
            <div className="contest-card">
                <span className="contest-title">{contest.title}</span>
                <span>Старт: {formatDate(contest.startAt)}</span>
            </div>
        )
    } else {
        return (
            <div className="contest-card">
                <span className="contest-title">{contest.title}</span>
                <span>Завершено: {formatDate(contest.endAt)}</span>
                <button>Результаты</button>
            </div>
        )
    }


}