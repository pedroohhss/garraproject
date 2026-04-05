import { lazy } from "react";
import { RouteObject } from "react-router-dom";
import { ProtectedRoute } from "./guards";

const AdminDashboard = lazy(() => import("@/pages/AdminDashboard"));
const AdminUsersPage = lazy(() => import("@/pages/AdminUsersPage"));
const AdminWeeksPage = lazy(() => import("@/pages/AdminWeeksPage"));
const AdminActivitiesPage = lazy(() => import("@/pages/AdminActivitiesPage"));
const AdminChecklistPage = lazy(() => import("@/pages/AdminChecklistPage"));
const ChecklistTrackingPage = lazy(() => import("@/pages/ChecklistTrackingPage"));
const DeliveryTrackingPage = lazy(() => import("@/pages/DeliveryTrackingPage"));
const WeekDetailPage = lazy(() => import("@/pages/WeekDetailPage"));
const IdeasPage = lazy(() => import("@/pages/IdeasPage"));
const RankingPage = lazy(() => import("@/pages/RankingPage"));
const GroupsPage = lazy(() => import("@/pages/GroupsPage"));

const admin = (element: React.ReactNode) => (
  <ProtectedRoute allowedRoles={["admin"]}>{element}</ProtectedRoute>
);

export const adminRoutes: RouteObject[] = [
  { path: "/admin",                              element: admin(<AdminDashboard />) },
  { path: "/admin/usuarios",                     element: admin(<AdminUsersPage />) },
  { path: "/admin/grupos",                       element: admin(<GroupsPage />) },
  { path: "/admin/ranking",                      element: admin(<RankingPage />) },
  { path: "/admin/ideias",                       element: admin(<IdeasPage />) },
  { path: "/admin/semanas",                      element: admin(<AdminWeeksPage />) },
  { path: "/admin/semanas/:weekId",              element: admin(<WeekDetailPage />) },
  { path: "/admin/atividades",                   element: admin(<AdminActivitiesPage />) },
  { path: "/admin/entregas",                     element: admin(<DeliveryTrackingPage />) },
  { path: "/admin/checklist",                    element: admin(<AdminChecklistPage />) },
  { path: "/admin/checklist/acompanhamento",     element: admin(<ChecklistTrackingPage />) },
];
