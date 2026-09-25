import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Navbar from "../components/Navbar";

type TeamStatus = "member" | "looking" | "solo";
type UserRole = "participant" | "organizer";

const QUALIFICATIONS = [
  {
    group: "Спортивные звания",
    items: [
      ["Заслуженный мастер спорта России (ЗМС)", 5000],
      [
        "Мастер спорта России международного класса (МСМК): Гроссмейстер России",
        4000,
      ],
      ["Мастер спорта России (МС)", 3000],
    ],
  },
  {
    group: "Спортивные разряды",
    items: [
      ["Кандидат в мастера спорта России (КМС)", 2000],
      ["1-й спортивный разряд", 1500],
      ["2-й спортивный разряд", 1000],
      ["3-й спортивный разряд", 800],
      ["1-й юношеский разряд", 500],
      ["2-й юношеский разряд", 400],
      ["3-й юношеский разряд", 300],
    ],
  },
] as const;

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
  locality: string | null;
  hide_locality: boolean;
  education_org: string | null;
  sports_disciplines: string | null;
  sports_qualification: string | null;
  bio: string | null;
  team_status: TeamStatus;
  team_name: string | null;
  rating: number;
  rank: number | null;
  competitions: number;
  wins: number;
  podiums: number;
  results: AthleteResult[];
};

type CurrentUser = {
  id: number;
  role: UserRole;
  organizer_probation_until: string | null;
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
  const navigate = useNavigate();
  const [athlete, setAthlete] = useState<AthleteProfile | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [qualification, setQualification] = useState("");
  const [isSavingQualification, setIsSavingQualification] = useState(false);
  const [qualificationSaved, setQualificationSaved] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isPromotionModalOpen, setIsPromotionModalOpen] = useState(false);
  const [promotionConfirmation, setPromotionConfirmation] = useState("");
  const [isPromoting, setIsPromoting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setIsUserMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, []);

  const canManageOrganizerAccess =
    currentUser?.role === "organizer" &&
    (
      currentUser.organizer_probation_until === null ||
      new Date(currentUser.organizer_probation_until).getTime() <= Date.now()
    );

  async function grantOrganizerRights() {
    const token = localStorage.getItem("token");

    if (
      !token ||
      !athlete ||
      !canManageOrganizerAccess ||
      promotionConfirmation !== "ПОДТВЕРДИТЬ"
    ) {
      return;
    }

    setError(null);
    setIsPromoting(true);

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/users/${athlete.id}/grant-organizer`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        const data = await response.json();
        setError(
          typeof data.detail === "string"
            ? data.detail
            : "Не удалось присвоить права организатора",
        );
        return;
      }

      setIsPromotionModalOpen(false);
      setPromotionConfirmation("");
      navigate("/organizer/access");
    } catch {
      setError("Не удалось подключиться к серверу");
    } finally {
      setIsPromoting(false);
    }
  }

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
            sports_qualification: qualification || null,
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
              rating: data.rating,
              rank: data.rank,
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

  const canSeeLocality =
    athlete &&
    (!athlete.hide_locality ||
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

              <div className="athlete-header-actions">
                <div className="athlete-rating">
                  <strong>{athlete.rating}</strong>
                  <span>
                    Рейтинг · {athlete.rank === null ? "—" : `#${athlete.rank}`}
                  </span>
                </div>

                {canManageOrganizerAccess && (
                  <div className="athlete-user-menu" ref={userMenuRef}>
                    <button
                      className="athlete-user-menu-trigger"
                      type="button"
                      aria-label="Действия с пользователем"
                      aria-expanded={isUserMenuOpen}
                      onClick={() =>
                        setIsUserMenuOpen((current) => !current)
                      }
                    >
                      ⋯
                    </button>

                    {isUserMenuOpen && (
                      <div className="athlete-user-menu-dropdown">
                        <button
                          type="button"
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            setPromotionConfirmation("");
                            setIsPromotionModalOpen(true);
                          }}
                        >
                          Присвоить права организатора
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>

            <section className="athlete-info">
              {canSeeLocality && (
                <div>
                  <span>Населённый пункт</span>
                  <strong>{athlete.locality || "Не указано"}</strong>
                </div>
              )}
              <div>
                <span>Образовательная организация</span>
                <strong>{athlete.education_org || "Не указано"}</strong>
              </div>
              <div>
                <span>Спортивные дисциплины</span>
                <strong>
                  {athlete.sports_disciplines || "Не указано"}
                </strong>
              </div>
              <div>
                <span>Спортивное звание / разряд</span>
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
                <h2>Спортивное звание / разряд</h2>

                <div className="athlete-qualification-form">
                  <select
                    value={qualification}
                    disabled={isSavingQualification}
                    onChange={(event) => {
                      setQualification(event.target.value);
                      setQualificationSaved(false);
                    }}
                  >
                    <option value="">Отсутствует — 0 баллов</option>
                    {QUALIFICATIONS.map((group) => (
                      <optgroup label={group.group} key={group.group}>
                        {group.items.map(([label, points]) => (
                          <option value={label} key={label}>
                            {label} — {points} баллов
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
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
                    Звание / разряд обновлены
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
                    <span className="athlete-result-points-example">Рейтинг</span>
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
        {isPromotionModalOpen && athlete && (
          <div
            className="organizer-confirm-overlay"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget && !isPromoting) {
                setIsPromotionModalOpen(false);
                setPromotionConfirmation("");
              }
            }}
          >
            <div
              className="organizer-confirm-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="organizer-confirm-title"
            >
              <h2 id="organizer-confirm-title">
                Присвоить права организатора
              </h2>

              <p>
                Вы уверены, что хотите присвоить{" "}
                <strong>{athlete.username}</strong> права администратора?
                Пользователь получит права организатора с испытательным
                сроком 7 дней. Для завершения введите "ПОДТВЕРДИТЬ"
              </p>

              <input
                type="text"
                value={promotionConfirmation}
                autoFocus
                disabled={isPromoting}
                placeholder="ПОДТВЕРДИТЬ"
                onChange={(event) =>
                  setPromotionConfirmation(event.target.value)
                }
              />

              <div className="organizer-confirm-actions">
                <button
                  className="organizer-confirm-submit"
                  type="button"
                  disabled={
                    isPromoting ||
                    promotionConfirmation !== "ПОДТВЕРДИТЬ"
                  }
                  onClick={grantOrganizerRights}
                >
                  {isPromoting ? "Присвоение..." : "Присвоить"}
                </button>

                <button
                  type="button"
                  disabled={isPromoting}
                  onClick={() => {
                    setIsPromotionModalOpen(false);
                    setPromotionConfirmation("");
                  }}
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
