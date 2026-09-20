import { NavLink } from "react-router-dom";

export default function Navbar() {
  return (
    <nav>
      <strong>FSP</strong>

      <NavLink to="/">Решать</NavLink>
      <NavLink to="/contests">Соревнования</NavLink>
      <NavLink to="/announcements">Анонсы</NavLink>

      <button className="nav-avatar" aria-label="Профиль">
        👤
      </button>
    </nav>
  );
}
