import type { Contest } from "../types/contest";
import type { ContestStatus } from "../types/contest";

type ContestCardProps = {
    contest: Contest,
    status: ContestStatus,
}

export default function ContestCard({ contest, status }: ContestCardProps) {
    if (status === "active") {
        return (
            <div className="contest-card">
                <span className="contest-title">{contest.title}</span>
                <span>Активно до: {contest.endAt}</span>
                <button>Перейти</button>
            </div>
        )
    } else if (status === "future") {
        return (
            <div className="contest-card">
                <span className="contest-title">{contest.title}</span>
                <span>Старт: {contest.startAt}</span>
            </div>
        )
    } else {
        return (
            <div className="contest-card">
                <span className="contest-title">{contest.title}</span>
                <span>Завершено: {contest.endAt}</span>
                <button>Результаты</button>
            </div>
        )
    }


}