import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import SolvePage from "./pages/SolvePage";
import ContestsPage from "./pages/ContestsPage";
import AnnouncementsPage from "./pages/AnnouncementsPage";
import TaskPage from "./pages/TaskPage";
import RegisterPage from "./pages/RegisterPage";
import LoginPage from "./pages/LoginPage";
import EditProfilePage from "./pages/EditProfilePage";
import StatisticsPage from "./pages/StatisticsPage";
import RatingPage from "./pages/RatingPage";
import CompetitionPage from "./pages/CompetitionPage";
import CompetitionFormPage from "./pages/CompetitionFormPage";
import AthletePage from "./pages/AthletePage";

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
      <Route path="/athletes/:id" element={<AthletePage />} />
      <Route path="/contests/:id" element={<CompetitionPage />} />
      <Route
        path="/organizer/competitions/new"
        element={<CompetitionFormPage />}
      />
      <Route
        path="/organizer/competitions/:id/edit"
        element={<CompetitionFormPage />}
      />
      <Route path="/announcements" element={<AnnouncementsPage />} />
      <Route path="/tasks/:id" element={<TaskPage />} />
      <Route path="/profile/edit" element={<EditProfilePage />} />
      <Route path="/profile/stats" element={<StatisticsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
