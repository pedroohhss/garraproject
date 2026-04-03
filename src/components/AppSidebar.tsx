import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useLocation, Link } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Lightbulb,
  CalendarDays,
  BookOpen,
  Settings,
  LogOut,
  FolderKanban,
  ClipboardList,
} from "lucide-react";

interface NavItem {
  title: string;
  url: string;
  icon: React.ElementType;
}

const participantNav: NavItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Meu Grupo", url: "/dashboard/grupo", icon: Users },
  { title: "Ideias", url: "/dashboard/ideias", icon: Lightbulb },
  { title: "Semana Atual", url: "/dashboard/semana", icon: CalendarDays },
  { title: "Materiais", url: "/dashboard/materiais", icon: BookOpen },
];

const leaderNav: NavItem[] = [
  { title: "Dashboard", url: "/dashboard/lider", icon: LayoutDashboard },
  { title: "Meus Grupos", url: "/dashboard/lider/grupos", icon: FolderKanban },
  { title: "Semana Atual", url: "/dashboard/lider/semana", icon: CalendarDays },
  { title: "Materiais", url: "/dashboard/lider/materiais", icon: BookOpen },
];

const adminNav: NavItem[] = [
  { title: "Dashboard", url: "/dashboard/admin", icon: LayoutDashboard },
  { title: "Usuários", url: "/dashboard/admin/usuarios", icon: Users },
  { title: "Grupos", url: "/dashboard/admin/grupos", icon: FolderKanban },
  { title: "Semanas", url: "/dashboard/admin/semanas", icon: CalendarDays },
  { title: "Atividades", url: "/dashboard/admin/atividades", icon: ClipboardList },
  { title: "Materiais", url: "/dashboard/admin/materiais", icon: BookOpen },
  { title: "Configurações", url: "/dashboard/admin/config", icon: Settings },
];

export default function AppSidebar() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const role = profile?.role;
  const navItems =
    role === "admin" ? adminNav : role === "lider" ? leaderNav : participantNav;

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-16 hover:w-56 transition-all duration-300 z-50 flex flex-col border-r border-border group"
      style={{ background: "#0A0A0F" }}>
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-border">
        <span className="text-primary font-bold text-lg whitespace-nowrap overflow-hidden">
          <span className="inline group-hover:hidden">G</span>
          <span className="hidden group-hover:inline">Garra</span>
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 space-y-1 overflow-hidden">
        {navItems.map((item) => {
          const active = location.pathname === item.url;
          return (
            <Link
              key={item.url}
              to={item.url}
              className={`flex items-center gap-3 px-5 py-2.5 text-sm transition-colors whitespace-nowrap ${
                active
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              }`}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                {item.title}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-3 space-y-3">
        {/* User info */}
        <div className="flex items-center gap-3 px-2 overflow-hidden">
          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold shrink-0">
            {profile?.full_name?.charAt(0)?.toUpperCase() ?? "?"}
          </div>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 min-w-0">
            <p className="text-xs text-foreground truncate">{profile?.full_name}</p>
            <span className="badge-role text-[10px]">{role ?? "—"}</span>
          </div>
        </div>

        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-5 py-2 text-sm text-muted-foreground hover:text-destructive transition-colors w-full"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            Sair
          </span>
        </button>
      </div>
    </aside>
  );
}
