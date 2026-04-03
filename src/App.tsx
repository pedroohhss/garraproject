import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ResetPassword from "./pages/ResetPassword";
import DashboardParticipant from "./pages/DashboardParticipant";
import DashboardLeader from "./pages/DashboardLeader";
import DashboardAdmin from "./pages/DashboardAdmin";
import NotFound from "./pages/NotFound";
import AuthErrorBanner from "./components/AuthErrorBanner";

const queryClient = new QueryClient();

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="skeleton-loading h-8 w-32" />
    </div>
  );
}

function RoleRedirect() {
  const { profile, loading, error } = useAuth();

  console.log("[RoleRedirect] state:", { loading, hasProfile: !!profile, role: profile?.role, error });

  if (loading) return <LoadingScreen />;
  if (!profile) return <Navigate to="/login" replace />;

  switch (profile.role) {
    case "admin":
      return <Navigate to="/dashboard/admin" replace />;
    case "lider":
      return <Navigate to="/dashboard/lider" replace />;
    default:
      return <Navigate to="/dashboard" replace />;
  }
}

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { user, profile, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && profile && !allowedRoles.includes(profile.role ?? "")) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AuthErrorBanner />
          <Routes>
            <Route path="/" element={<RoleRedirect />} />
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/cadastro" element={<PublicRoute><Register /></PublicRoute>} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/dashboard" element={<ProtectedRoute allowedRoles={["participante", "representante"]}><DashboardParticipant /></ProtectedRoute>} />
            <Route path="/dashboard/lider" element={<ProtectedRoute allowedRoles={["lider"]}><DashboardLeader /></ProtectedRoute>} />
            <Route path="/dashboard/admin" element={<ProtectedRoute allowedRoles={["admin"]}><DashboardAdmin /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
