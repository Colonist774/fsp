import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";

type CompetitionResult = {
  title: string;
  place: number;
};

type Statistics = {
  rating: number;
  rank: number;
  competitions: number;
  wins: number;
  podiums: number;
  recent_results: CompetitionResult[];
};

export default function StatisticsPage() {
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
                Место в рейтинге: #{statistics.rank}
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
                          <strong>{result.place} место</strong>
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
