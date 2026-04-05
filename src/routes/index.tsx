import { useRoutes } from "react-router-dom";
import NotFound from "@/pages/NotFound";
import ForbiddenPage from "@/pages/ForbiddenPage";
import { RoleRedirect, ProtectedRoute } from "./guards";
import { authRoutes } from "./auth.routes";
import { adminRoutes } from "./admin.routes";
import { liderRoutes } from "./lider.routes";
import { participanteRoutes } from "./participante.routes";
import { profileRoutes } from "./profile.routes";

export function AppRoutes() {
  return useRoutes([
    { path: "/", element: <RoleRedirect /> },
    ...authRoutes,
    ...adminRoutes,
    ...liderRoutes,
    ...participanteRoutes,
    ...profileRoutes,
    {
      path: "/sem-acesso",
      element: <ProtectedRoute><ForbiddenPage /></ProtectedRoute>,
    },
    { path: "*", element: <NotFound /> },
  ]);
}
