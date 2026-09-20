import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <nav>
      <strong>FSP</strong>

      <Link to="/">Solve</Link>
      <Link to="/contests">Contests</Link>
      <Link to="/announcements">Announcements</Link>

      <button>Avatar</button>
    </nav>
  );
}