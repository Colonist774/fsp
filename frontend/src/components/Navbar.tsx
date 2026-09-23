import { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";

type CurrentUser = {
  username: string;
};

export default function Navbar() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadCurrentUser() {
      const token = localStorage.getItem("token");

      if (!token) {
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
          return;
        }

        const user: CurrentUser = await response.json();
        setUsername(user.username);
      } catch {
        return;
      }
    }

    loadCurrentUser();
    window.addEventListener("profile-updated", loadCurrentUser);

    return () => {
      window.removeEventListener("profile-updated", loadCurrentUser);
    };
  }, []);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target as Node)
      ) {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, []);

  const initial = username.trim().charAt(0).toUpperCase() || "?";

  return (
    <nav>
      <strong>ФСП</strong>

      <NavLink to="/">Решать</NavLink>
      <NavLink to="/contests">Соревнования</NavLink>
      <NavLink to="/rating">Рейтинг</NavLink>
      <NavLink to="/announcements">Анонсы</NavLink>

      <div className="nav-profile" ref={profileRef}>
        <button
          className="nav-avatar"
          type="button"
          aria-label="Профиль"
          aria-expanded={isMenuOpen}
          onClick={() => setIsMenuOpen((current) => !current)}
        >
          {initial}
        </button>

        {isMenuOpen && (
          <div className="nav-profile-menu">
            <button
              type="button"
              onClick={() => {
                setIsMenuOpen(false);
                navigate("/profile/edit");
              }}
            >
              Редактировать профиль
            </button>
            <button
              type="button"
              onClick={() => {
                setIsMenuOpen(false);
                navigate("/profile/stats");
              }}
            >
              Моя статистика
            </button>

            <button
              type="button"
              onClick={() => {
                localStorage.removeItem("token");
                window.location.href = "/login";
              }}
            >
              Выйти
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
