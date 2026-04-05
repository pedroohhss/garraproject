import { RouteObject } from "react-router-dom";
import ProfilePage from "@/pages/ProfilePage";
import EditProfilePage from "@/pages/EditProfilePage";
import { ProtectedRoute } from "./guards";

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
