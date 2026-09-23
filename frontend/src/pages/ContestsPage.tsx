import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import ContestCard from "../components/ContestCard";
import type { Contest, ContestStatus } from "../types/contest";

type SidebarButtons = ContestStatus;

type CurrentUser = {
  role: "participant" | "organizer";
};

export default function ContestsPage() {
  const navigate = useNavigate();
  const [selectedTab, setSelectedTab] = useState<SidebarButtons>("active");
  const [contests, setContests] = useState<Contest[]>([]);
  const [role, setRole] = useState<CurrentUser["role"]>("participant");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const token = localStorage.getItem("token");
      const headers = token
        ? { Authorization: `Bearer ${token}` }
        : undefined;

      try {
        const [competitionsResponse, meResponse] = await Promise.all([
          fetch("http://127.0.0.1:8000/api/competitions", { headers }),
          fetch("http://127.0.0.1:8000/api/me", { headers }),
        ]);

        if (!competitionsResponse.ok) {
          setError("Не удалось загрузить соревнования");
          return;
        }

        const competitions: Contest[] =
          await competitionsResponse.json();
        setContests(competitions);

        if (meResponse.ok) {
          const user: CurrentUser = await meResponse.json();
          setRole(user.role);
        }
      } catch {
        setError("Не удалось подключиться к серверу");
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  const visibleContests = useMemo(() => {
    const filtered = contests.filter(
      (contest) => contest.status === selectedTab,
    );

    return [...filtered].sort((a, b) => {
      const aTime = new Date(a.start_at).getTime();
      const bTime = new Date(b.start_at).getTime();

      return selectedTab === "past"
        ? bTime - aTime
        : aTime - bTime;
    });
  }, [contests, selectedTab]);

  const emptyText =
    selectedTab === "active"
      ? "Сейчас нет активных соревнований"
      : selectedTab === "future"
        ? "Пока нет будущих соревнований"
        : "Пока нет завершённых соревнований";

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
          {role === "organizer" && (
            <div className="contest-organizer-actions">
              <button
                type="button"
                onClick={() => navigate("/organizer/competitions/new")}
              >
                Создать соревнование
              </button>
            </div>
          )}

          {error && <div className="auth-error">{error}</div>}

          {!error && !isLoading && visibleContests.length === 0 && (
            <p className="contest-empty">{emptyText}</p>
          )}

          <div className="problem-list">
            {visibleContests.map((contest) => (
              <ContestCard
                key={contest.id}
                contest={contest}
                status={contest.status}
              />
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
