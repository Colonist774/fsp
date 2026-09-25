import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";

type CompetitionResult = {
  title: string;
  place: number;
  rating_points: number;
};

type MyCompetition = {
  competition_id: number;
  title: string;
  discipline: string;
  format: "online" | "offline" | "hybrid";
  conduct_mode: "platform" | "external";
  status: "future" | "active" | "past";
  start_at: string;
  end_at: string;
  registered_at: string;
  finished_at: string | null;
  place: number | null;
};

type Statistics = {
  rating: number;
  rank: number | null;
  competitions: number;
  wins: number;
  podiums: number;
  my_competitions: MyCompetition[];
  recent_results: CompetitionResult[];
};

const statusLabels: Record<MyCompetition["status"], string> = {
  future: "Предстоящее",
  active: "Идёт сейчас",
  past: "Завершено",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

export default function StatisticsPage() {
  const navigate = useNavigate();
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [visibleResults, setVisibleResults] = useState(5);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStatistics() {
      const token = localStorage.getItem("token");

      if (!token) {
        setError("Требуется авторизация");
        return;
      }

      try {
        const response = await fetch(
          "http://127.0.0.1:8000/api/me/statistics",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (!response.ok) {
          setError("Не удалось загрузить статистику");
          return;
        }

        const data: Statistics = await response.json();
        setStatistics(data);
      } catch {
        setError("Не удалось подключиться к серверу");
      }
    }

    loadStatistics();
  }, []);

  return (
    <>
      <Navbar />

      <main className="page statistics-page">
        <button
          className="page-back"
          type="button"
          onClick={() => navigate(-1)}
        >
          ← Назад
        </button>

        <h1>Моя статистика</h1>

        {error && <div className="auth-error">{error}</div>}

        {statistics && (
          <div className="statistics-content">
            <section className="statistics-section statistics-rating">
              <h2>Рейтинг</h2>
              <div className="statistics-rating-value">
                {statistics.rating}
              </div>
              <div className="statistics-rank">
                Место в рейтинге: {statistics.rank === null
                  ? "—"
                  : `#${statistics.rank}`}
              </div>
            </section>

            <section className="statistics-section">
              <h2>Соревнования</h2>

              <div className="statistics-metrics">
                <div>
                  <strong>{statistics.competitions}</strong>
                  <span>Участий</span>
                </div>
                <div>
                  <strong>{statistics.wins}</strong>
                  <span>Побед</span>
                </div>
                <div>
                  <strong>{statistics.podiums}</strong>
                  <span>Призовых мест</span>
                </div>
              </div>
            </section>

            <section className="statistics-section">
              <h2>Мои соревнования</h2>

              {statistics.my_competitions.length === 0 ? (
                <p className="statistics-empty">
                  Вы пока не зарегистрированы ни на одно соревнование
                </p>
              ) : (
                <div className="statistics-competitions-table">
                  <div className="statistics-competitions-header">
                    <span>Соревнование</span>
                    <span>Статус</span>
                    <span>Дата</span>
                    <span>Результат</span>
                  </div>

                  {statistics.my_competitions.map((competition) => (
                    <Link
                      className="statistics-competition-row"
                      to={`/contests/${competition.competition_id}`}
                      key={competition.competition_id}
                    >
                      <div>
                        <strong>{competition.title}</strong>
                        <span>{competition.discipline}</span>
                      </div>

                      <span
                        className="statistics-competition-status"
                        data-status={competition.status}
                      >
                        {statusLabels[competition.status]}
                      </span>

                      <span>{formatDate(competition.start_at)}</span>

                      <strong>
                        {competition.place === null
                          ? "—"
                          : `${competition.place} место`}
                      </strong>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            <section className="statistics-section">
              <h2>Последние результаты</h2>

              {statistics.recent_results.length === 0 ? (
                <p className="statistics-empty">
                  Пока нет результатов соревнований
                </p>
              ) : (
                <>
                  <div className="statistics-results">
                    {statistics.recent_results
                      .slice(0, visibleResults)
                      .map((result, index) => (
                        <div
                          className="statistics-result-row"
                          key={`${result.title}-${index}`}
                        >
                          <span>{result.title}</span>
                          <strong>
                            {result.place} место · +{result.rating_points}
                          </strong>
                        </div>
                      ))}
                  </div>

                  {visibleResults < statistics.recent_results.length && (
                    <button
                      className="statistics-more"
                      type="button"
                      onClick={() =>
                        setVisibleResults((current) => current + 5)
                      }
                    >
                      Ещё
                    </button>
                  )}
                </>
              )}
            </section>
          </div>
        )}
      </main>
    </>
  );
}
