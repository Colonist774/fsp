import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import SolvePage from "./pages/SolvePage";
import ContestsPage from "./pages/ContestsPage";
import AnnouncementsPage from "./pages/AnnouncementsPage";
import AnnouncementPage from "./pages/AnnouncementPage";
import AnnouncementFormPage from "./pages/AnnouncementFormPage";
import TaskPage from "./pages/TaskPage";
import TaskFormPage from "./pages/TaskFormPage";
import RegisterPage from "./pages/RegisterPage";
import LoginPage from "./pages/LoginPage";
import EditProfilePage from "./pages/EditProfilePage";
import StatisticsPage from "./pages/StatisticsPage";
import RatingPage from "./pages/RatingPage";
import RatingInfoPage from "./pages/RatingInfoPage";
import CompetitionPage from "./pages/CompetitionPage";
import CompetitionFormPage from "./pages/CompetitionFormPage";
import CompetitionSubmissionsPage from "./pages/CompetitionSubmissionsPage";
import AthletePage from "./pages/AthletePage";
import OrganizerAccessPage from "./pages/OrganizerAccessPage";
import PlatformSettingsPage from "./pages/PlatformSettingsPage";
import TeamPage from "./pages/TeamPage";

type AuthState = "loading" | "authenticated" | "unauthenticated";

type CompetitionStartNotification = {
  competition_id: number;
  title: string;
  start_at: string;
  end_at: string;
};

export default function App() {
  const navigate = useNavigate();
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [startNotifications, setStartNotifications] = useState<
    CompetitionStartNotification[]
  >([]);
  const [isDismissingNotification, setIsDismissingNotification] =
    useState(false);
  const [notificationError, setNotificationError] =
    useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function checkAuth() {
      const token = localStorage.getItem("token");

      if (!token) {
        if (!cancelled) {
          setAuthState("unauthenticated");
        }
        return;
      }

      try {
        const response = await fetch(
          "http://127.0.0.1:8000/api/me",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (!response.ok) {
          localStorage.removeItem("token");

          if (!cancelled) {
            setAuthState("unauthenticated");
          }
          return;
        }

        if (!cancelled) {
          setAuthState("authenticated");
        }
      } catch {
        if (!cancelled) {
          setAuthState("unauthenticated");
        }
      }
    }

    checkAuth();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (authState !== "authenticated") {
      setStartNotifications([]);
      setNotificationError(null);
      return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      return;
    }

    let cancelled = false;

    async function loadStartNotifications() {
      try {
        const response = await fetch(
          "http://127.0.0.1:8000/api/notifications/competition-start",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (!response.ok || cancelled) {
          return;
        }

        const data: CompetitionStartNotification[] =
          await response.json();

        if (!cancelled) {
          setStartNotifications(data);
        }
      } catch {
        return;
      }
    }

    loadStartNotifications();

    return () => {
      cancelled = true;
    };
  }, [authState]);

  async function dismissStartNotification(
    competitionId: number,
    openCompetition: boolean,
  ) {
    const token = localStorage.getItem("token");

    if (!token || isDismissingNotification) {
      return;
    }

    setIsDismissingNotification(true);
    setNotificationError(null);

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/notifications/competition-start/${competitionId}/seen`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        setNotificationError(
          "Не удалось закрыть уведомление. Попробуйте ещё раз.",
        );
        return;
      }

      setStartNotifications((current) =>
        current.filter(
          (notification) =>
            notification.competition_id !== competitionId,
        ),
      );

      if (openCompetition) {
        navigate(`/contests/${competitionId}`);
      }
    } catch {
      setNotificationError(
        "Не удалось закрыть уведомление. Попробуйте ещё раз.",
      );
    } finally {
      setIsDismissingNotification(false);
    }
  }

  const startNotification = startNotifications[0] ?? null;

  if (authState === "loading") {
    return null;
  }

  if (authState === "unauthenticated") {
    return (
      <Routes>
        <Route
          path="/login"
          element={
            <LoginPage
              onLogin={() => setAuthState("authenticated")}
            />
          }
        />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <>
      <Routes>
      <Route path="/" element={<ContestsPage />} />
      <Route path="/solve" element={<SolvePage />} />
      <Route path="/rating" element={<RatingPage />} />
      <Route
        path="/rating/how-it-works"
        element={<RatingInfoPage />}
      />
      <Route path="/athletes/:id" element={<AthletePage />} />
      <Route
        path="/organizer/access"
        element={<OrganizerAccessPage />}
      />
      <Route
        path="/organizer/platform-settings"
        element={<PlatformSettingsPage />}
      />
      <Route path="/contests/:id" element={<CompetitionPage />} />
      <Route
        path="/organizer/competitions/new"
        element={<CompetitionFormPage />}
      />
      <Route
        path="/organizer/competitions/:id/edit"
        element={<CompetitionFormPage />}
      />
      <Route
        path="/organizer/competitions/:id/submissions"
        element={<CompetitionSubmissionsPage />}
      />
      <Route path="/announcements" element={<AnnouncementsPage />} />
      <Route path="/announcements/:id" element={<AnnouncementPage />} />
      <Route
        path="/organizer/announcements/new"
        element={<AnnouncementFormPage />}
      />
      <Route
        path="/organizer/announcements/:id/edit"
        element={<AnnouncementFormPage />}
      />
      <Route path="/tasks/:id" element={<TaskPage />} />
      <Route
        path="/organizer/tasks/new"
        element={<TaskFormPage />}
      />
      <Route
        path="/contests/:competitionId/tasks/:id"
        element={<TaskPage />}
      />
      <Route
        path="/organizer/competitions/:competitionId/tasks/new"
        element={<TaskFormPage />}
      />
      <Route
        path="/organizer/competitions/:competitionId/tasks/:taskId/edit"
        element={<TaskFormPage />}
      />
      <Route path="/profile/edit" element={<EditProfilePage />} />
      <Route path="/team" element={<TeamPage />} />
      <Route path="/profile/stats" element={<StatisticsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {startNotification && (
        <div
          className="competition-start-notification-layer"
          role="presentation"
        >
          <section
            className="competition-start-notification"
            role="dialog"
            aria-modal="true"
            aria-labelledby="competition-start-notification-title"
          >
            <span className="competition-start-notification-label">
              Соревнование началось
            </span>

            <h2 id="competition-start-notification-title">
              Турнир «{startNotification.title}», на который вы
              зарегистрировались, открыт
            </h2>

            <p>
              Вы можете начать решать задания.
            </p>

            {notificationError && (
              <div className="competition-start-notification-error">
                {notificationError}
              </div>
            )}

            <div className="competition-start-notification-actions">
              <button
                type="button"
                disabled={isDismissingNotification}
                onClick={() =>
                  dismissStartNotification(
                    startNotification.competition_id,
                    false,
                  )
                }
              >
                Закрыть
              </button>

              <button
                className="competition-start-notification-primary"
                type="button"
                disabled={isDismissingNotification}
                onClick={() =>
                  dismissStartNotification(
                    startNotification.competition_id,
                    true,
                  )
                }
              >
                {isDismissingNotification
                  ? "Открытие..."
                  : "Перейти к турниру"}
              </button>
            </div>

            {startNotifications.length > 1 && (
              <span className="competition-start-notification-count">
                Ещё уведомлений: {startNotifications.length - 1}
              </span>
            )}
          </section>
        </div>
      )}
    </>
  );
}
