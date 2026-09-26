import { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";

type CurrentUser = {
  id: number;
  username: string;
  role: "participant" | "organizer";
  organizer_probation_until: string | null;
};

export default function Navbar() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [userId, setUserId] = useState<number | null>(null);
  const [role, setRole] = useState<CurrentUser["role"]>("participant");
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
          "/api/me",
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
        setUserId(user.id);
        setRole(user.role);
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
      <NavLink to="/" className="nav-brand" aria-label="ФСП — главная">\n        <img\n          src="https://fsp-russia.ru/completed_pages/images/logo_big.svg"\n          alt="ФСП"\n          className="nav-brand-logo"\n        />\n      </NavLink>

      <NavLink to="/">Соревнования</NavLink>
      <NavLink to="/rating">Рейтинг</NavLink>
      <NavLink to="/solve">Сборник задач</NavLink>
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
            {userId !== null && (
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  navigate(`/athletes/${userId}`);
                }}
              >
                Мой профиль
              </button>
            )}
            
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
                setIsMenuOpen(false);
                navigate("/profile/edit");
              }}
            >
              Редактировать профиль
            </button>

            {role === "participant" && (
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  navigate("/team");
                }}
              >
                Команда
              </button>
            )}

            {role === "organizer" && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    navigate("/organizer/platform-settings");
                  }}
                >
                  Настройки платформы
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    navigate("/organizer/access");
                  }}
                >
                  Управление организаторами
                </button>
              </>
            )}
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
