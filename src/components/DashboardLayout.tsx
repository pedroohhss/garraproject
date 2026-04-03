import { ReactNode, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useLocation, Link } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Settings,
  FileText,
  Calendar,
  Lightbulb,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";

interface NavItem {
  label: string;
  icon: React.ElementType;
  path: string;
}

const navByRole: Record<string, NavItem[]> = {
  admin: [
    { label: "Dashboard", icon: LayoutDashboard, path: "/admin" },
    { label: "Participantes", icon: Users, path: "/admin/participantes" },
    { label: "Semanas", icon: Calendar, path: "/admin/semanas" },
    { label: "Configurações", icon: Settings, path: "/admin/config" },
  ],
  lider: [
    { label: "Dashboard", icon: LayoutDashboard, path: "/lider" },
    { label: "Entregas", icon: FileText, path: "/lider/entregas" },
    { label: "Equipe", icon: Users, path: "/lider/equipe" },
  ],
  participante: [
    { label: "Dashboard", icon: LayoutDashboard, path: "/participante" },
    { label: "Atividades", icon: FileText, path: "/participante/atividades" },
    { label: "Ideias", icon: Lightbulb, path: "/participante/ideias" },
  ],
  representante: [
    { label: "Dashboard", icon: LayoutDashboard, path: "/participante" },
    { label: "Atividades", icon: FileText, path: "/participante/atividades" },
    { label: "Ideias", icon: Lightbulb, path: "/participante/ideias" },
  ],
};

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
}

export default function DashboardLayout({ children, title }: DashboardLayoutProps) {
  const { profile, signOut, loading, error } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const role = profile?.role ?? "participante";
  const navItems = navByRole[role] ?? navByRole.participante;
  const initials = profile?.full_name
    ? profile.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut();
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass-card p-8 max-w-md text-center space-y-4">
          <p className="text-destructive font-medium">{error}</p>
          <button onClick={() => window.location.reload()} className="text-sm text-primary hover:underline">
            Recarregar página
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside
        className="fixed top-0 left-0 h-screen z-30 flex flex-col transition-all duration-300 border-r"
        style={{
          width: collapsed ? 64 : 220,
          background: "rgba(255,255,255,0.03)",
          borderColor: "rgba(255,255,255,0.08)",
          backdropFilter: "blur(12px)",
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 px-4 h-16 border-b border-border shrink-0">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">
            G
          </div>
          {!collapsed && (
            <span className="font-semibold text-foreground text-sm whitespace-nowrap">
              Garra Projects
            </span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  active
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                }`}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center h-10 border-t border-border text-muted-foreground hover:text-foreground transition-colors"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>

        {/* User footer */}
        <div className="border-t border-border px-3 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-semibold shrink-0">
            {initials}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground truncate">{profile?.full_name ?? "..."}</p>
              <p className="text-xs text-muted-foreground truncate capitalize">{role}</p>
            </div>
          )}
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
            title="Sair"
          >
            {signingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main
        className="flex-1 transition-all duration-300"
        style={{ marginLeft: collapsed ? 64 : 220 }}
      >
        {/* Header */}
        <header className="h-16 flex items-center px-6 border-b border-border">
          <h1 className="section-label">{title}</h1>
        </header>

        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
