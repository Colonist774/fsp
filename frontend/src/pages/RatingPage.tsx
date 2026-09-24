import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";

type TeamStatus = "member" | "looking" | "solo";

type RankingEntry = {
  rank: number;
  user_id: number;
  username: string;
  team_status: TeamStatus;
  team_name: string | null;
  rating: number;
};

function getTeamLabel(entry: RankingEntry) {
  if (entry.team_status === "member") {
    return entry.team_name || "—";
  }

  if (entry.team_status === "looking") {
    return "В поиске";
  }

  return "—";
}

function rankClass(rank: number) {
  if (rank === 1) return "rank-first";
  if (rank === 2) return "rank-second";
  if (rank === 3) return "rank-third";
  return "";
}

export default function RatingPage() {
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadRanking() {
      const token = localStorage.getItem("token");

      if (!token) {
        setError("Требуется авторизация");
        return;
      }

      try {
        const response = await fetch(
          "http://127.0.0.1:8000/api/rankings",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (!response.ok) {
          setError("Не удалось загрузить рейтинг");
          return;
        }

        const data: RankingEntry[] = await response.json();
        setRanking(data);
      } catch {
        setError("Не удалось подключиться к серверу");
      }
    }

    loadRanking();
  }, []);

  const first = ranking.find((entry) => entry.rank === 1);
  const second = ranking.find((entry) => entry.rank === 2);
  const third = ranking.find((entry) => entry.rank === 3);
  const rest = ranking.filter((entry) => entry.rank > 3);

  function renderPodiumCard(
    entry: RankingEntry | undefined,
    position: "first" | "second" | "third",
  ) {
    if (!entry) {
      return null;
    }

    return (
      <Link
        className={`rating-podium-card podium-${position}`}
        to={`/athletes/${entry.user_id}`}
      >
        <div className={`rating-podium-rank ${rankClass(entry.rank)}`}>
          {entry.rank}
        </div>
        <div className="rating-podium-name">{entry.username}</div>
        <div className="rating-podium-team">{getTeamLabel(entry)}</div>
        <div className="rating-podium-score">{entry.rating}</div>
      </Link>
    );
  }

  return (
    <>
      <Navbar />

      <main className="page rating-page">
        <h1>Рейтинг</h1>

        {error && <div className="auth-error">{error}</div>}

        {!error && ranking.length === 0 && (
          <p className="rating-empty">В рейтинге пока нет участников</p>
        )}

        {ranking.length > 0 && (
          <>
            <section className="rating-podium">
              {renderPodiumCard(second, "second")}
              {renderPodiumCard(first, "first")}
              {renderPodiumCard(third, "third")}
            </section>

            {rest.length > 0 && (
              <section className="rating-table">
                <div className="rating-table-header">
                  <span>Место</span>
                  <span>Участник</span>
                  <span>Команда</span>
                  <span>Рейтинг</span>
                </div>

                {rest.map((entry) => (
                  <div className="rating-table-row" key={entry.user_id}>
                    <span className="rating-place">{entry.rank}</span>
                    <Link
                      className="rating-username"
                      to={`/athletes/${entry.user_id}`}
                    >
                      {entry.username}
                    </Link>
                    <span className="rating-team">{getTeamLabel(entry)}</span>
                    <strong>{entry.rating}</strong>
                  </div>
                ))}
              </section>
            )}
          </>
        )}
      </main>
    </>
  );
}
