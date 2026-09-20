import { BrowserRouter, Routes, Route } from "react-router-dom";
import SolvePage from "./pages/SolvePage";
import ContestsPage from "./pages/ContestsPage";
import AnnouncementsPage from "./pages/AnnouncementsPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SolvePage />} />
        <Route path="/contests" element={<ContestsPage />} />
        <Route path="/announcements" element={<AnnouncementsPage />} />
      </Routes>
    </BrowserRouter>
  );
}