import { lazy } from "react";
import { RouteObject } from "react-router-dom";
import { PublicRoute } from "./guards";

const Login = lazy(() => import("@/pages/Login"));
const Register = lazy(() => import("@/pages/Register"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));

export const authRoutes: RouteObject[] = [
  {
    path: "/login",
    element: <PublicRoute><Login /></PublicRoute>,
  },
  {
    path: "/cadastro",
    element: <PublicRoute><Register /></PublicRoute>,
  },
  {
    path: "/reset-password",
    element: <ResetPassword />,
  },
];
