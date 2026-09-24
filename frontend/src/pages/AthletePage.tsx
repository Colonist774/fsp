import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Navbar from "../components/Navbar";

type TeamStatus = "member" | "looking" | "solo";
type UserRole = "participant" | "organizer";

type AthleteResult = {
  competition_id: number;
  title: string;
  place: number;
  rating_points: number;
  ended_at: string;
};

type AthleteProfile = {
  id: number;
  username: string;
  full_name: string | null;
  hide_full_name: boolean;
  sports_disciplines: string | null;
  sports_qualification: string | null;
  bio: string | null;
  team_status: TeamStatus;
  team_name: string | null;
  rating: number;
  rank: number;
  competitions: number;
  wins: number;
  podiums: number;
  results: AthleteResult[];
};

type CurrentUser = {
  id: number;
  role: UserRole;
};

function getTeamLabel(athlete: AthleteProfile) {
  if (athlete.team_status === "member") {
    return athlete.team_name || "—";
  }

  if (athlete.team_status === "looking") {
    return "В поиске";
  }

  return "Не заинтересован";
}

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(dateString));
}

export default function AthletePage() {
  const { id } = useParams();
  const [athlete, setAthlete] = useState<AthleteProfile | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [qualification, setQualification] = useState("");
  const [isSavingQualification, setIsSavingQualification] = useState(false);
  const [qualificationSaved, setQualificationSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAthlete() {
      const token = localStorage.getItem("token");

      if (!token) {
        setError("Требуется авторизация");
        return;
      }

      const headers = {
        Authorization: `Bearer ${token}`,
      };

      try {
        const [athleteResponse, meResponse] = await Promise.all([
          fetch(`http://127.0.0.1:8000/api/athletes/${id}`, {
            headers,
          }),
          fetch("http://127.0.0.1:8000/api/me", { headers }),
        ]);

        if (!athleteResponse.ok) {
          setError(
            athleteResponse.status === 404
              ? "Спортсмен не найден"
              : "Не удалось загрузить профиль",
          );
          return;
        }

        const athleteData: AthleteProfile =
          await athleteResponse.json();
        setAthlete(athleteData);
        setQualification(athleteData.sports_qualification ?? "");

        if (meResponse.ok) {
          const me: CurrentUser = await meResponse.json();
          setCurrentUser(me);
        }
      } catch {
        setError("Не удалось подключиться к серверу");
      }
    }

    loadAthlete();
  }, [id]);

  async function saveQualification() {
    const token = localStorage.getItem("token");

    if (!token || !athlete || currentUser?.role !== "organizer") {
      return;
    }

    setError(null);
    setQualificationSaved(false);
    setIsSavingQualification(true);

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/athletes/${athlete.id}/qualification`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            sports_qualification: qualification.trim() || null,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          typeof data.detail === "string"
            ? data.detail
            : "Не удалось сохранить разряд",
        );
        return;
      }

      setAthlete((current) =>
        current
          ? {
              ...current,
              sports_qualification: data.sports_qualification,
            }
          : current,
      );
      setQualification(data.sports_qualification ?? "");
      setQualificationSaved(true);
    } catch {
      setError("Не удалось подключиться к серверу");
    } finally {
      setIsSavingQualification(false);
    }
  }

  const canSeeFullName =
    athlete &&
    (!athlete.hide_full_name ||
      currentUser?.role === "organizer" ||
      currentUser?.id === athlete.id);

  return (
    <>
      <Navbar />

      <main className="page athlete-page">
        {error && <div className="auth-error">{error}</div>}

        {athlete && (
          <>
            <section className="athlete-header">
              <div>
                <h1>{athlete.username}</h1>
                {canSeeFullName && athlete.full_name && (
                  <p className="athlete-full-name">{athlete.full_name}</p>
                )}
              </div>

              <div className="athlete-rating">
                <strong>{athlete.rating}</strong>
                <span>Рейтинг · #{athlete.rank}</span>
              </div>
            </section>

            <section className="athlete-info">
              <div>
                <span>Спортивные дисциплины</span>
                <strong>
                  {athlete.sports_disciplines || "Не указано"}
                </strong>
              </div>
              <div>
                <span>Спортивный разряд / звание</span>
                <strong>
                  {athlete.sports_qualification || "Отсутствует"}
                </strong>
              </div>
              <div>
                <span>Команда</span>
                <strong>{getTeamLabel(athlete)}</strong>
              </div>
            </section>

            {currentUser?.role === "organizer" && (
              <section className="athlete-section athlete-admin-section">
                <h2>Спортивный разряд</h2>

                <div className="athlete-qualification-form">
                  <input
                    type="text"
                    value={qualification}
                    maxLength={120}
                    placeholder="Оставьте пустым, если разряд отсутствует"
                    disabled={isSavingQualification}
                    onChange={(event) => {
                      setQualification(event.target.value);
                      setQualificationSaved(false);
                    }}
                  />
                  <button
                    type="button"
                    disabled={isSavingQualification}
                    onClick={saveQualification}
                  >
                    {isSavingQualification ? "Сохранение..." : "Сохранить"}
                  </button>
                </div>

                {qualificationSaved && (
                  <div className="profile-save-success">
                    Разряд обновлён
                  </div>
                )}
              </section>
            )}

            {athlete.bio && (
              <section className="athlete-section">
                <h2>О спортсмене</h2>
                <p className="athlete-bio">{athlete.bio}</p>
              </section>
            )}

            <section className="athlete-section">
              <h2>Статистика соревнований</h2>

              <div className="athlete-metrics">
                <div>
                  <strong>{athlete.competitions}</strong>
                  <span>Участий</span>
                </div>
                <div>
                  <strong>{athlete.wins}</strong>
                  <span>Побед</span>
                </div>
                <div>
                  <strong>{athlete.podiums}</strong>
                  <span>Призовых мест</span>
                </div>
              </div>
            </section>

            <section className="athlete-section">
              <h2>История соревнований</h2>

              {athlete.results.length === 0 ? (
                <p className="athlete-empty">
                  Пока нет результатов соревнований
                </p>
              ) : (
                <div className="athlete-results">
                  <div className="athlete-results-header">
                    <span>Соревнование</span>
                    <span>Дата</span>
                    <span>Место</span>
                    <span>Рейтинг</span>
                  </div>

                  {athlete.results.map((result) => (
                    <Link
                      className="athlete-result-row"
                      to={`/contests/${result.competition_id}`}
                      key={result.competition_id}
                    >
                      <strong>{result.title}</strong>
                      <span>{formatDate(result.ended_at)}</span>
                      <span>{result.place}</span>
                      <span className="athlete-result-points">
                        +{result.rating_points}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </>
  );
}
