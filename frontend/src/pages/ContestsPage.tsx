import Navbar from "../components/Navbar";
import ContestCard from "../components/ContestCard";
import type { Contest, ContestStatus } from "../types/contest";

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

export default function ContestsPage() {
return (
    <>
      <Navbar />
        <main className="page placeholder-page">
          <div className="problem-list">
              {contests.map((contest) => {
                const start = new Date(contest.startAt);
                const end = new Date(contest.endAt);
                const now = new Date();
                
                let status: ContestStatus;

                if (now < start) {
                  status = "future";
                } else if (now > end) {
                  status = "past";
                } else {
                  status = "active";
                }

                return (
                  <ContestCard 
                    key={contest.id} 
                    contest={contest} 
                    status={status}
                  />
                )
                })}
          </div>
        </main>
    </>
  );
}
