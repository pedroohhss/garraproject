import { RouteObject } from "react-router-dom";
import AdminDashboard from "@/pages/AdminDashboard";
import AdminUsersPage from "@/pages/AdminUsersPage";
import AdminWeeksPage from "@/pages/AdminWeeksPage";
import AdminActivitiesPage from "@/pages/AdminActivitiesPage";
import AdminChecklistPage from "@/pages/AdminChecklistPage";
import ChecklistTrackingPage from "@/pages/ChecklistTrackingPage";
import DeliveryTrackingPage from "@/pages/DeliveryTrackingPage";
import WeekDetailPage from "@/pages/WeekDetailPage";
import IdeasPage from "@/pages/IdeasPage";
import RankingPage from "@/pages/RankingPage";
import GroupsPage from "@/pages/GroupsPage";
import { ProtectedRoute } from "./guards";

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
