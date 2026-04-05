import { RouteObject } from "react-router-dom";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ResetPassword from "@/pages/ResetPassword";
import { PublicRoute } from "./guards";

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
