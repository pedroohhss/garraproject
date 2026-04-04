import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/AdminDashboard";
import LiderDashboard from "./pages/LiderDashboard";
import ParticipanteDashboard from "./pages/ParticipanteDashboard";
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
  const { user, profile, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;

  if (allowedRoles) {
    const role = profile?.role ?? "participante";
    if (!allowedRoles.includes(role)) return <Navigate to="/" replace />;
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
            {/* Role-based redirect */}
            <Route path="/" element={<RoleRedirect />} />

            {/* Public routes */}
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/cadastro" element={<PublicRoute><Register /></PublicRoute>} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Admin routes */}
            <Route path="/admin" element={<ProtectedRoute allowedRoles={["admin"]}><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/ideias" element={<ProtectedRoute allowedRoles={["admin"]}><IdeasPage /></ProtectedRoute>} />
            <Route path="/admin/ranking" element={<ProtectedRoute allowedRoles={["admin"]}><RankingPage /></ProtectedRoute>} />
            <Route path="/admin/grupos" element={<ProtectedRoute allowedRoles={["admin"]}><GroupsPage /></ProtectedRoute>} />

            {/* Lider routes */}
            <Route path="/lider" element={<ProtectedRoute allowedRoles={["lider"]}><LiderDashboard /></ProtectedRoute>} />
            <Route path="/lider/ideias" element={<ProtectedRoute allowedRoles={["lider"]}><IdeasPage /></ProtectedRoute>} />
            <Route path="/lider/ranking" element={<ProtectedRoute allowedRoles={["lider"]}><RankingPage /></ProtectedRoute>} />
            <Route path="/lider/grupos" element={<ProtectedRoute allowedRoles={["lider"]}><GroupsPage /></ProtectedRoute>} />

            {/* Participante / Representante routes */}
            <Route path="/participante" element={<ProtectedRoute allowedRoles={["participante", "representante"]}><ParticipanteDashboard /></ProtectedRoute>} />
            <Route path="/participante/ideias" element={<ProtectedRoute allowedRoles={["participante", "representante"]}><IdeasPage /></ProtectedRoute>} />
            <Route path="/participante/ranking" element={<ProtectedRoute allowedRoles={["participante", "representante"]}><RankingPage /></ProtectedRoute>} />
            <Route path="/participante/grupos" element={<ProtectedRoute allowedRoles={["participante", "representante"]}><GroupsPage /></ProtectedRoute>} />

            {/* Profile routes */}
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
