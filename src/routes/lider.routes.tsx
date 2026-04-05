import { RouteObject } from "react-router-dom";
import LiderDashboard from "@/pages/LiderDashboard";
import WeeksListPage from "@/pages/WeeksListPage";
import WeekDetailPage from "@/pages/WeekDetailPage";
import ActivitiesPage from "@/pages/ActivitiesPage";
import ChecklistTrackingPage from "@/pages/ChecklistTrackingPage";
import DeliveryTrackingPage from "@/pages/DeliveryTrackingPage";
import IdeasPage from "@/pages/IdeasPage";
import RankingPage from "@/pages/RankingPage";
import GroupsPage from "@/pages/GroupsPage";
import { ProtectedRoute } from "./guards";

const lider = (element: React.ReactNode) => (
  <ProtectedRoute allowedRoles={["lider"]}>{element}</ProtectedRoute>
);

export const liderRoutes: RouteObject[] = [
  { path: "/lider",                    element: lider(<LiderDashboard />) },
  { path: "/lider/grupos",             element: lider(<GroupsPage />) },
  { path: "/lider/ranking",            element: lider(<RankingPage />) },
  { path: "/lider/ideias",             element: lider(<IdeasPage />) },
  { path: "/lider/semanas",            element: lider(<WeeksListPage />) },
  { path: "/lider/semanas/:weekId",    element: lider(<WeekDetailPage />) },
  { path: "/lider/atividades",         element: lider(<ActivitiesPage />) },
  { path: "/lider/entregas",           element: lider(<DeliveryTrackingPage />) },
  { path: "/lider/checklist",          element: lider(<ChecklistTrackingPage />) },
];
