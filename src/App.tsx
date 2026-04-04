import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/AdminDashboard";
import LiderDashboard from "./pages/LiderDashboard";
import ParticipanteDashboard from "./pages/ParticipanteDashboard";
import AdminUsersPage from "./pages/AdminUsersPage";
import WeeksListPage from "./pages/WeeksListPage";
import WeekDetailPage from "./pages/WeekDetailPage";
import ChecklistPage from "./pages/ChecklistPage";
import ChecklistTrackingPage from "./pages/ChecklistTrackingPage";
import IdeasPage from "./pages/IdeasPage";
import RankingPage from "./pages/RankingPage";
import GroupsPage from "./pages/GroupsPage";
import ProfilePage from "./pages/ProfilePage";
import EditProfilePage from "./pages/EditProfilePage";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="animate-spin h-8 w-8 text-primary" />
    </div>
  );
}

function RoleRedirect() {
  const { user, profile, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;

  const role = profile?.role;
  if (role === "admin") return <Navigate to="/admin" replace />;
  if (role === "lider") return <Navigate to="/lider" replace />;
  return <Navigate to="/participante" replace />;
}

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { user, profile, loading, signOut } = useAuth();

  const hasStoredToken = Object.keys(localStorage).some(
    (key) => key.startsWith("sb-") && key.endsWith("-auth-token")
  );

  // Token was deleted externally — clear in-memory session to avoid redirect loop
  useEffect(() => {
    if (user && !hasStoredToken) {
      signOut();
    }
  }, [user, hasStoredToken]);

  if (loading) return <LoadingScreen />;
  // Token gone but signOut still in flight — show loading instead of redirecting
  if (user && !hasStoredToken) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;

  if (allowedRoles && profile) {
    const role = profile.role ?? "participante";
    if (!allowedRoles.includes(role)) {
      return <Navigate to="/" replace />;
    }
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
          <Routes>
            <Route path="/" element={<RoleRedirect />} />

            {/* Public */}
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/cadastro" element={<PublicRoute><Register /></PublicRoute>} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Admin */}
            <Route path="/admin" element={<ProtectedRoute allowedRoles={["admin"]}><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/usuarios" element={<ProtectedRoute allowedRoles={["admin"]}><AdminUsersPage /></ProtectedRoute>} />
            <Route path="/admin/ideias" element={<ProtectedRoute allowedRoles={["admin"]}><IdeasPage /></ProtectedRoute>} />
            <Route path="/admin/ranking" element={<ProtectedRoute allowedRoles={["admin"]}><RankingPage /></ProtectedRoute>} />
            <Route path="/admin/grupos" element={<ProtectedRoute allowedRoles={["admin"]}><GroupsPage /></ProtectedRoute>} />
            <Route path="/admin/semanas" element={<ProtectedRoute allowedRoles={["admin"]}><WeeksListPage /></ProtectedRoute>} />
            <Route path="/admin/semanas/:weekId" element={<ProtectedRoute allowedRoles={["admin"]}><WeekDetailPage /></ProtectedRoute>} />
            <Route path="/admin/checklist/acompanhamento" element={<ProtectedRoute allowedRoles={["admin"]}><ChecklistTrackingPage /></ProtectedRoute>} />

            {/* Lider */}
            <Route path="/lider" element={<ProtectedRoute allowedRoles={["lider"]}><LiderDashboard /></ProtectedRoute>} />
            <Route path="/lider/ideias" element={<ProtectedRoute allowedRoles={["lider"]}><IdeasPage /></ProtectedRoute>} />
            <Route path="/lider/ranking" element={<ProtectedRoute allowedRoles={["lider"]}><RankingPage /></ProtectedRoute>} />
            <Route path="/lider/grupos" element={<ProtectedRoute allowedRoles={["lider"]}><GroupsPage /></ProtectedRoute>} />
            <Route path="/lider/semanas" element={<ProtectedRoute allowedRoles={["lider"]}><WeeksListPage /></ProtectedRoute>} />
            <Route path="/lider/semanas/:weekId" element={<ProtectedRoute allowedRoles={["lider"]}><WeekDetailPage /></ProtectedRoute>} />
            <Route path="/lider/checklist" element={<ProtectedRoute allowedRoles={["lider"]}><ChecklistTrackingPage /></ProtectedRoute>} />

            {/* Participante / Representante */}
            <Route path="/participante" element={<ProtectedRoute allowedRoles={["participante", "representante"]}><ParticipanteDashboard /></ProtectedRoute>} />
            <Route path="/participante/ideias" element={<ProtectedRoute allowedRoles={["participante", "representante"]}><IdeasPage /></ProtectedRoute>} />
            <Route path="/participante/ranking" element={<ProtectedRoute allowedRoles={["participante", "representante"]}><RankingPage /></ProtectedRoute>} />
            <Route path="/participante/grupos" element={<ProtectedRoute allowedRoles={["participante", "representante"]}><GroupsPage /></ProtectedRoute>} />
            <Route path="/participante/semanas" element={<ProtectedRoute allowedRoles={["participante", "representante"]}><WeeksListPage /></ProtectedRoute>} />
            <Route path="/participante/semanas/:weekId" element={<ProtectedRoute allowedRoles={["participante", "representante"]}><WeekDetailPage /></ProtectedRoute>} />
            <Route path="/participante/checklist" element={<ProtectedRoute allowedRoles={["participante", "representante"]}><ChecklistPage /></ProtectedRoute>} />

            {/* Profile */}
            <Route path="/perfil/editar" element={<ProtectedRoute><EditProfilePage /></ProtectedRoute>} />
            <Route path="/perfil/:userId" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
