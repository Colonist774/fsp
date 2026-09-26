import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import ContestCard from "../components/ContestCard";
import type { Contest, ContestStatus } from "../types/contest";

type SidebarButtons = ContestStatus;

type CurrentUser = {
  role: "participant" | "organizer";
};

export default function ContestsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const selectedTab: SidebarButtons =
    tabParam === "draft" ||
    tabParam === "future" ||
    tabParam === "past" ||
    tabParam === "active"
      ? tabParam
      : "active";
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

  function selectTab(tab: SidebarButtons) {
    if (tab === "active") {
      setSearchParams({});
      return;
    }

    setSearchParams({ tab });
  }

  const emptyText =
    selectedTab === "draft"
      ? "Черновиков пока нет"
      : selectedTab === "active"
        ? "Сейчас нет активных соревнований"
        : selectedTab === "future"
          ? "Пока нет будущих соревнований"
          : "Пока нет завершённых соревнований";

  return (
    <>
      <Navbar />

      <main className="page contests-layout">
        <aside className="contest-sidebar">
          {role === "organizer" && (
            <button
              className={selectedTab === "draft" ? "is-active" : ""}
              onClick={() => selectTab("draft")}
            >
              Черновики
            </button>
          )}

          <button
            className={selectedTab === "active" ? "is-active" : ""}
            onClick={() => selectTab("active")}
          >
            Активные
          </button>

          <button
            className={selectedTab === "future" ? "is-active" : ""}
            onClick={() => selectTab("future")}
          >
            Предстоящие
          </button>

          <button
            className={selectedTab === "past" ? "is-active" : ""}
            onClick={() => selectTab("past")}
          >
            Завершенные
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
                onPublished={(publishedContest) => {
                  setContests((current) =>
                    current.map((item) =>
                      item.id === publishedContest.id
                        ? publishedContest
                        : item,
                    ),
                  );
                  setError(null);
                }}
                onError={(message) =>
                  setError(message || null)
                }
              />
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
