import { RouteObject } from "react-router-dom";
import ParticipanteDashboard from "@/pages/ParticipanteDashboard";
import WeeksListPage from "@/pages/WeeksListPage";
import WeekDetailPage from "@/pages/WeekDetailPage";
import ActivitiesPage from "@/pages/ActivitiesPage";
import ChecklistPage from "@/pages/ChecklistPage";
import IdeasPage from "@/pages/IdeasPage";
import RankingPage from "@/pages/RankingPage";
import GroupsPage from "@/pages/GroupsPage";
import { ProtectedRoute } from "./guards";

const participante = (element: React.ReactNode) => (
  <ProtectedRoute allowedRoles={["participante", "representante"]}>{element}</ProtectedRoute>
);

export const participanteRoutes: RouteObject[] = [
  { path: "/participante",                   element: participante(<ParticipanteDashboard />) },
  { path: "/participante/grupos",            element: participante(<GroupsPage />) },
  { path: "/participante/ranking",           element: participante(<RankingPage />) },
  { path: "/participante/ideias",            element: participante(<IdeasPage />) },
  { path: "/participante/semanas",           element: participante(<WeeksListPage />) },
  { path: "/participante/semanas/:weekId",   element: participante(<WeekDetailPage />) },
  { path: "/participante/atividades",        element: participante(<ActivitiesPage />) },
  { path: "/participante/checklist",         element: participante(<ChecklistPage />) },
];
