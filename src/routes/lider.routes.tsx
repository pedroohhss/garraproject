import { lazy } from "react";
import { RouteObject } from "react-router-dom";
import { ProtectedRoute } from "./guards";

const LiderDashboard = lazy(() => import("@/pages/LiderDashboard"));
const WeeksListPage = lazy(() => import("@/pages/WeeksListPage"));
const WeekDetailPage = lazy(() => import("@/pages/WeekDetailPage"));
const ActivitiesPage = lazy(() => import("@/pages/ActivitiesPage"));
const ChecklistTrackingPage = lazy(() => import("@/pages/ChecklistTrackingPage"));
const DeliveryTrackingPage = lazy(() => import("@/pages/DeliveryTrackingPage"));
const IdeasPage = lazy(() => import("@/pages/IdeasPage"));
const RankingPage = lazy(() => import("@/pages/RankingPage"));
const GroupsPage = lazy(() => import("@/pages/GroupsPage"));

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
