import { lazy, Suspense } from "react";
import { useRoutes } from "react-router-dom";
import { LoadingScreen, RoleRedirect, ProtectedRoute } from "./guards";
import { authRoutes } from "./auth.routes";
import { adminRoutes } from "./admin.routes";
import { liderRoutes } from "./lider.routes";
import { participanteRoutes } from "./participante.routes";
import { profileRoutes } from "./profile.routes";

const NotFound = lazy(() => import("@/pages/NotFound"));
const ForbiddenPage = lazy(() => import("@/pages/ForbiddenPage"));

export function AppRoutes() {
  const element = useRoutes([
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

  return <Suspense fallback={<LoadingScreen />}>{element}</Suspense>;
}
