import { lazy } from "react";
import { RouteObject } from "react-router-dom";
import { ProtectedRoute } from "./guards";

const ProfilePage = lazy(() => import("@/pages/ProfilePage"));
const EditProfilePage = lazy(() => import("@/pages/EditProfilePage"));

export const profileRoutes: RouteObject[] = [
  {
    path: "/perfil/:userId",
    element: <ProtectedRoute><ProfilePage /></ProtectedRoute>,
  },
  {
    path: "/perfil/:userId/editar",
    element: <ProtectedRoute><EditProfilePage /></ProtectedRoute>,
  },
];
