import { ReactNode, useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useLocation, Link } from "react-router-dom"; // useLocation: sidebar active state
import { useTranslation } from "react-i18next";
import AppBreadcrumb from "@/components/AppBreadcrumb";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  LayoutDashboard,
  Users,
  FileText,
  Calendar,
  Lightbulb,
  Layers,
  ClipboardCheck,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Menu,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import garraLogo from "@/assets/logo-garra.png";

interface NavItem {
  label: string;
  icon: React.ElementType;
  path: string;
}

function getNavByRole(t: (key: string) => string): Record<string, NavItem[]> {
  return {
    admin: [
      { label: t("nav.dashboard"), icon: LayoutDashboard, path: "/admin" },
      { label: t("nav.users"),     icon: Users,           path: "/admin/usuarios" },
      { label: t("nav.groups"),    icon: Layers,          path: "/admin/grupos" },
      { label: t("nav.ranking"),   icon: FileText,        path: "/admin/ranking" },
      { label: t("nav.weeks"),     icon: Calendar,        path: "/admin/semanas" },
      { label: t("nav.ideas"),     icon: Lightbulb,       path: "/admin/ideias" },
    ],
    lider: [
      { label: t("nav.dashboard"), icon: LayoutDashboard, path: "/lider" },
      { label: t("nav.myGroups"),  icon: Layers,          path: "/lider/grupos" },
      { label: t("nav.weeks"),     icon: Calendar,        path: "/lider/semanas" },
      { label: t("nav.checklist"), icon: ClipboardCheck,  path: "/lider/checklist" },
      { label: t("nav.ranking"),   icon: FileText,        path: "/lider/ranking" },
      { label: t("nav.ideas"),     icon: Lightbulb,       path: "/lider/ideias" },
    ],
    participante: [
      { label: t("nav.dashboard"), icon: LayoutDashboard, path: "/participante" },
      { label: t("nav.myGroup"),   icon: Users,           path: "/participante/grupos" },
      { label: t("nav.weeks"),     icon: Calendar,        path: "/participante/semanas" },
      { label: t("nav.checklist"), icon: ClipboardCheck,  path: "/participante/checklist" },
      { label: t("nav.ranking"),   icon: FileText,        path: "/participante/ranking" },
      { label: t("nav.ideas"),     icon: Lightbulb,       path: "/participante/ideias" },
    ],
    representante: [
      { label: t("nav.dashboard"), icon: LayoutDashboard, path: "/participante" },
      { label: t("nav.myGroup"),   icon: Users,           path: "/participante/grupos" },
      { label: t("nav.weeks"),     icon: Calendar,        path: "/participante/semanas" },
      { label: t("nav.checklist"), icon: ClipboardCheck,  path: "/participante/checklist" },
      { label: t("nav.ranking"),   icon: FileText,        path: "/participante/ranking" },
      { label: t("nav.ideas"),     icon: Lightbulb,       path: "/participante/ideias" },
    ],
  };
}

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
  breadcrumbLabel?: string; // label para segmentos dinâmicos (ex: nome da semana)
}

export default function DashboardLayout({ children, title, breadcrumbLabel }: DashboardLayoutProps) {
  const { profile, signOut, loading, error } = useAuth();
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem("sidebar:collapsed") === "true");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();

  // Close mobile sidebar on navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Lock body scroll when mobile sidebar is open
  useEffect(() => {
    if (isMobile && mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isMobile, mobileOpen]);

  const role = profile?.role ?? "participante";
  const navByRole = getNavByRole(t);
  const navItems = navByRole[role] ?? navByRole.participante;


  const initials = profile?.full_name
    ? profile.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  const handleSignOut = async () => {
    setShowLogoutConfirm(false);
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

  if (error && !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass-card p-8 max-w-md text-center space-y-4">
          <p className="text-destructive font-medium">{error}</p>
          <button onClick={() => window.location.reload()} className="text-sm text-primary hover:underline">
            {t("layout.reloadPage")}
          </button>
        </div>
      </div>
    );
  }

  const sidebarWidth = collapsed ? 64 : 220;

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 h-16 border-b border-border shrink-0">
        <img src={garraLogo} alt={t("layout.appName")} className="w-8 h-8 shrink-0 object-contain" />
        {(!collapsed || isMobile) && (
          <span className="font-semibold text-foreground text-sm whitespace-nowrap">
            {t("layout.appName")}
          </span>
        )}
        {isMobile && (
          <button
            onClick={() => setMobileOpen(false)}
            className="ml-auto text-muted-foreground hover:text-foreground transition-colors"
            aria-label={t("layout.closeMenu")}
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isPrefixOfOther = navItems.some((other) => other.path !== item.path && other.path.startsWith(item.path + "/"));
          const active = location.pathname === item.path || (!isPrefixOfOther && location.pathname.startsWith(item.path + "/"));
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                active
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              }`}
              title={collapsed && !isMobile ? item.label : undefined}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {(!collapsed || isMobile) && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle — desktop only */}
      {!isMobile && (
        <button
          onClick={() => { const next = !collapsed; setCollapsed(next); localStorage.setItem("sidebar:collapsed", String(next)); }}
          className="flex items-center justify-center h-10 border-t border-border text-muted-foreground hover:text-foreground transition-colors"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      )}

      {/* User footer */}
      {collapsed && !isMobile ? (
        <div className="border-t border-border px-1 py-3 flex items-center gap-2">
          <Link
            to={profile?.id ? `/perfil/${profile.id}` : "#"}
            className="w-8 h-8 rounded-full shrink-0 hover:ring-1 hover:ring-primary/40 transition-all overflow-hidden"
            title={t("layout.viewProfile")}
          >
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover rounded-full" />
            ) : (
              <div className="w-full h-full bg-primary/20 flex items-center justify-center text-primary text-xs font-semibold">
                {initials}
              </div>
            )}
          </Link>
          <button
            onClick={() => setShowLogoutConfirm(true)}
            disabled={signingOut}
            className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
            title={t("layout.logout")}
          >
            {signingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
          </button>
        </div>
      ) : (
        <div className="border-t border-border px-3 py-3 flex items-center gap-3">
          <Link
            to={profile?.id ? `/perfil/${profile.id}` : "#"}
            className="w-8 h-8 rounded-full shrink-0 hover:ring-1 hover:ring-primary/40 transition-all overflow-hidden"
            title={t("layout.viewProfile")}
          >
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover rounded-full" />
            ) : (
              <div className="w-full h-full bg-primary/20 flex items-center justify-center text-primary text-xs font-semibold">
                {initials}
              </div>
            )}
          </Link>
          <Link to={profile?.id ? `/perfil/${profile.id}` : "#"} className="flex-1 min-w-0 hover:opacity-80 transition-opacity">
            <p className="text-sm text-foreground truncate">{profile?.full_name ?? "..."}</p>
            <p className="text-xs text-muted-foreground truncate">{t(`common.roles.${role}`, { defaultValue: role })}</p>
          </Link>
          <button
            onClick={() => setShowLogoutConfirm(true)}
            disabled={signingOut}
            className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
            title={t("layout.logout")}
          >
            {signingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
          </button>
        </div>
      )}
    </>
  );

  return (
    <>
    <Dialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("layout.logoutTitle")}</DialogTitle>
          <DialogDescription>
            {t("layout.logoutDescription")}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setShowLogoutConfirm(false)}>
            {t("layout.cancel")}
          </Button>
          <Button variant="destructive" onClick={handleSignOut} disabled={signingOut}>
            {signingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
            {t("layout.logout")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <div className="min-h-screen flex">
      {/* Mobile backdrop */}
      {isMobile && mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar — mobile: overlay; desktop: fixed column */}
      {isMobile ? (
        <aside
          className="fixed top-0 left-0 h-[100dvh] z-50 flex flex-col transition-transform duration-300"
          style={{
            width: 260,
            transform: mobileOpen ? "translateX(0)" : "translateX(-100%)",
            background: "rgba(10,10,15,0.97)",
            borderRight: "1px solid rgba(255,255,255,0.08)",
            backdropFilter: "blur(16px)",
          }}
        >
          {sidebarContent}
        </aside>
      ) : (
        <aside
          className="fixed top-0 left-0 h-screen z-30 flex flex-col transition-all duration-300 border-r"
          style={{
            width: sidebarWidth,
            background: "rgba(255,255,255,0.03)",
            borderColor: "rgba(255,255,255,0.08)",
            backdropFilter: "blur(12px)",
          }}
        >
          {sidebarContent}
        </aside>
      )}

      {/* Main content */}
      <main
        className="flex-1 transition-all duration-300 min-w-0"
        style={{ marginLeft: isMobile ? 0 : sidebarWidth }}
      >
        {/* Header */}
        <header className="h-16 flex items-center px-4 md:px-6 gap-3 border-b border-border">
          <button
            onClick={() => isMobile ? setMobileOpen(true) : (setCollapsed(prev => { const next = !prev; localStorage.setItem("sidebar:collapsed", String(next)); return next; }))}
            className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
            aria-label={isMobile ? t("layout.openMenu") : collapsed ? t("layout.expandMenu") : t("layout.collapseMenu")}
          >
            <Menu className="h-5 w-5" />
          </button>
          <AppBreadcrumb navItems={navItems} breadcrumbLabel={breadcrumbLabel} />
          {/* Profile avatar — mobile header */}
          {isMobile && (
            <Link
              to={profile?.id ? `/perfil/${profile.id}` : "#"}
              className="w-8 h-8 rounded-full shrink-0 hover:ring-2 hover:ring-primary/40 transition-all overflow-hidden"
              title={t("layout.viewProfile")}
            >
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt={profile?.full_name ?? t("layout.profile")} className="w-full h-full object-cover rounded-full" />
              ) : (
                <div className="w-full h-full bg-primary/20 flex items-center justify-center text-primary text-xs font-semibold rounded-full">
                  {initials}
                </div>
              )}
            </Link>
          )}
        </header>

        <div className="p-4 md:p-6">{children}</div>
      </main>
    </div>
    </>
  );
}
