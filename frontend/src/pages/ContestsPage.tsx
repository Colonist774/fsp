import { useState } from "react";
import Navbar from "../components/Navbar";
import ContestCard from "../components/ContestCard";
import type { Contest, ContestStatus } from "../types/contest";

type SidebarButtons = "active" | "past" | "future";

export const contests: Contest[] = [
  {
    id: 1,
    title: "Чемпионат Дагестана по алгоритмическому программированию",
    startAt: "2026-09-20T12:00:00",
    endAt: "2026-09-20T20:00:00",
  },
  {
    id: 2,
    title: "Осенний кубок ФСП",
    startAt: "2026-09-19T10:00:00",
    endAt: "2026-09-19T14:00:00",
  },
  {
    id: 3,
    title: "Турнир первокурсников",
    startAt: "2026-09-18T15:00:00",
    endAt: "2026-09-18T18:00:00",
  },
  {
    id: 4,
    title: "Открытый алгоритмический турнир",
    startAt: "2026-09-25T16:00:00",
    endAt: "2026-09-25T20:00:00",
  },
  {
    id: 5,
    title: "Кубок по спортивному программированию",
    startAt: "2026-10-03T11:00:00",
    endAt: "2026-10-03T17:00:00",
  },
];

function getContestStatus(contest: Contest, now: Date): ContestStatus {
  const start = new Date(contest.startAt);
  const end = new Date(contest.endAt);

  if (now < start) {
    return "future";
  }

  if (now > end) {
    return "past";
  }

  return "active";
}

export default function ContestsPage() {
  const [selectedTab, setSelectedTab] = useState<SidebarButtons>("active");
  const now = new Date();

  const visibleContests = contests.filter(
    (contest) => getContestStatus(contest, now) === selectedTab,
  );

  return (
    <>
      <Navbar />

      <main className="page contests-layout">
        <aside className="contest-sidebar">
          <button
            className={selectedTab === "active" ? "is-active" : ""}
            onClick={() => setSelectedTab("active")}
          >
            Активные
          </button>

          <button
            className={selectedTab === "past" ? "is-active" : ""}
            onClick={() => setSelectedTab("past")}
          >
            Завершенные
          </button>

          <button
            className={selectedTab === "future" ? "is-active" : ""}
            onClick={() => setSelectedTab("future")}
          >
            Будущие
          </button>
        </aside>

        <section className="contest-content">
          <div className="problem-list">
            {visibleContests.map((contest) => (
              <ContestCard
                key={contest.id}
                contest={contest}
                status={getContestStatus(contest, now)}
              />
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
