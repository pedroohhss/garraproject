import { lazy } from "react";
import { RouteObject } from "react-router-dom";
import { ProtectedRoute } from "./guards";

const ParticipanteDashboard = lazy(() => import("@/pages/ParticipanteDashboard"));
const WeeksListPage = lazy(() => import("@/pages/WeeksListPage"));
const WeekDetailPage = lazy(() => import("@/pages/WeekDetailPage"));
const ActivitiesPage = lazy(() => import("@/pages/ActivitiesPage"));
const ChecklistPage = lazy(() => import("@/pages/ChecklistPage"));
const IdeasPage = lazy(() => import("@/pages/IdeasPage"));
const RankingPage = lazy(() => import("@/pages/RankingPage"));
const GroupsPage = lazy(() => import("@/pages/GroupsPage"));

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
