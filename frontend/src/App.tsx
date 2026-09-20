import { BrowserRouter, Routes, Route } from "react-router-dom";
import SolvePage from "./pages/SolvePage";
import ContestsPage from "./pages/ContestsPage";
import AnnouncementsPage from "./pages/AnnouncementsPage";
import TaskPage from "./pages/TaskPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SolvePage />} />
        <Route path="/contests" element={<ContestsPage />} />
        <Route path="/announcements" element={<AnnouncementsPage />} />
        <Route path="/tasks/:id" element={<TaskPage />} />
      </Routes>
    </BrowserRouter>
  );
}