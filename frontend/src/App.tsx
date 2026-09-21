import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import SolvePage from "./pages/SolvePage";
import ContestsPage from "./pages/ContestsPage";
import AnnouncementsPage from "./pages/AnnouncementsPage";
import TaskPage from "./pages/TaskPage";
import RegisterPage from "./pages/RegisterPage";
import LoginPage from "./pages/LoginPage";

type AuthState = "loading" | "authenticated" | "unauthenticated";
  
export default function App() {


  const [authState, setAuthState] =
    useState<AuthState>("loading");

  useEffect(() => {
      async function checkAuth() {
          const token = localStorage.getItem("token");

          if (!token) {
              setAuthState("unauthenticated");
              return;
          }

          const response = await fetch(
              "http://127.0.0.1:8000/api/me",
              {
                  headers: {
                      Authorization: `Bearer ${token}`,
                  },
              }
          );

          if (!response.ok) {
              localStorage.removeItem("token");
              setAuthState("unauthenticated");
              return;
          }

          setAuthState("authenticated");
      }

      checkAuth();
  }, []);

  if (authState === "loading") {
    return null;
  }
  
  if (authState === "unauthenticated") {
      return (
          <Routes>
              <Route path="/login" element={
                <LoginPage 
                    onLogin={() => setAuthState("authenticated")}
                />
                } />
              <Route path="/register" element={<RegisterPage />} />

              <Route
                  path="*"
                  element={<Navigate to="/login" replace />}
              />
          </Routes>
      );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SolvePage />} />
        <Route path="/contests" element={<ContestsPage />} />
        <Route path="/announcements" element={<AnnouncementsPage />} />
        <Route path="/tasks/:id" element={<TaskPage />} />

        <Route
            path="*"
            element={<Navigate to="/" replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}