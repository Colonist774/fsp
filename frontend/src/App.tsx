import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
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

type AuthState = "loading" | "authenticated" | "unauthenticated";

export default function App() {
  const [authState, setAuthState] = useState<AuthState>("loading");

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
      <Route path="/profile/stats" element={<StatisticsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
