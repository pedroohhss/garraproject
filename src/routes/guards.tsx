import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

export function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="animate-spin h-8 w-8 text-primary" />
    </div>
  );
}

export function RoleRedirect() {
  const { user, profile, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;

  const role = profile?.role;
  if (role === "admin") return <Navigate to="/admin" replace />;
  if (role === "lider") return <Navigate to="/lider" replace />;
  return <Navigate to="/participante" replace />;
}

export function ProtectedRoute({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles?: string[];
}) {
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

export function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}
