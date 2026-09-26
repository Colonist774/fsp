import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import ContestCard from "../components/ContestCard";
import type { Contest, ContestStatus } from "../types/contest";

type SidebarButtons = ContestStatus;

type CurrentUser = {
  role: "participant" | "organizer";
};

type SportDiscipline = {
  id: number;
  name: string;
};

export default function ContestsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const selectedDiscipline = searchParams.get("discipline") ?? "";
  const selectedTab: SidebarButtons =
    tabParam === "draft" ||
    tabParam === "future" ||
    tabParam === "past" ||
    tabParam === "active"
      ? tabParam
      : "active";
  const [contests, setContests] = useState<Contest[]>([]);
  const [disciplines, setDisciplines] = useState<SportDiscipline[]>([]);
  const [role, setRole] = useState<CurrentUser["role"]>("participant");
  const [isDisciplineOpen, setIsDisciplineOpen] = useState(false);
  const disciplineFilterRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const token = localStorage.getItem("token");
      const headers = token
        ? { Authorization: `Bearer ${token}` }
        : undefined;

      try {
        const [
          competitionsResponse,
          meResponse,
          disciplinesResponse,
        ] = await Promise.all([
          fetch("http://127.0.0.1:8000/api/competitions", { headers }),
          fetch("http://127.0.0.1:8000/api/me", { headers }),
          fetch("http://127.0.0.1:8000/api/disciplines", { headers }),
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

        if (disciplinesResponse.ok) {
          const data: SportDiscipline[] =
            await disciplinesResponse.json();
          setDisciplines(data);
        }
      } catch {
        setError("Не удалось подключиться к серверу");
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (
        disciplineFilterRef.current &&
        !disciplineFilterRef.current.contains(event.target as Node)
      ) {
        setIsDisciplineOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, []);

  const visibleContests = useMemo(() => {
    const filtered = contests.filter(
      (contest) =>
        contest.status === selectedTab &&
        (
          !selectedDiscipline ||
          contest.discipline === selectedDiscipline
        ),
    );

    return [...filtered].sort((a, b) => {
      const aTime = new Date(a.start_at).getTime();
      const bTime = new Date(b.start_at).getTime();

      return selectedTab === "past"
        ? bTime - aTime
        : aTime - bTime;
    });
  }, [contests, selectedTab, selectedDiscipline]);

  function selectTab(tab: SidebarButtons) {
    const nextParams = new URLSearchParams(searchParams);

    if (tab === "active") {
      nextParams.delete("tab");
    } else {
      nextParams.set("tab", tab);
    }

    setSearchParams(nextParams);
  }

  function selectDiscipline(discipline: string) {
    const nextParams = new URLSearchParams(searchParams);

    if (discipline) {
      nextParams.set("discipline", discipline);
    } else {
      nextParams.delete("discipline");
    }

    setSearchParams(nextParams);
    setIsDisciplineOpen(false);
  }

  const emptyText = selectedDiscipline
    ? "В этой дисциплине соревнований пока нет"
    : selectedTab === "draft"
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

          <div className="contest-sidebar-divider" />

          <div
            className="contest-discipline-filter"
            ref={disciplineFilterRef}
          >
            <button
              className={
                selectedDiscipline
                  ? "contest-discipline-button has-filter"
                  : "contest-discipline-button"
              }
              type="button"
              aria-expanded={isDisciplineOpen}
              onClick={() =>
                setIsDisciplineOpen((current) => !current)
              }
            >
              <span>Дисциплина</span>
              <span className="contest-discipline-chevron">⌄</span>
            </button>

            {selectedDiscipline && (
              <div className="contest-discipline-current">
                {selectedDiscipline}
              </div>
            )}

            {isDisciplineOpen && (
              <div className="contest-discipline-menu">
                <button
                  className={
                    !selectedDiscipline ? "is-selected" : ""
                  }
                  type="button"
                  onClick={() => selectDiscipline("")}
                >
                  Все дисциплины
                </button>

                {disciplines.map((discipline) => (
                  <button
                    className={
                      selectedDiscipline === discipline.name
                        ? "is-selected"
                        : ""
                    }
                    type="button"
                    key={discipline.id}
                    onClick={() =>
                      selectDiscipline(discipline.name)
                    }
                  >
                    {discipline.name}
                  </button>
                ))}
              </div>
            )}
          </div>
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
