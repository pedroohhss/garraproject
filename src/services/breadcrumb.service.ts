import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BreadcrumbItem } from "@/models/breadcrumb.model";

interface NavItem {
  label: string;
  path: string;
}

interface UseBreadcrumbsOptions {
  navItems: NavItem[];
  breadcrumbLabel?: string; // label para segmentos dinâmicos (ex: nome da semana)
}

export function useBreadcrumbs({ navItems, breadcrumbLabel }: UseBreadcrumbsOptions): BreadcrumbItem[] {
  const location = useLocation();
  const { t } = useTranslation();
  const roleRoot = navItems[0].path;

  // Rotas de perfil: /perfil/:userId  ou  /perfil/:userId/editar
  if (location.pathname.startsWith("/perfil")) {
    const editMatch = location.pathname.match(/^\/perfil\/([^/]+)\/editar$/);
    if (editMatch) {
      const profileId = editMatch[1];
      return [
        { label: t("breadcrumb.home"), path: roleRoot },
        { label: t("breadcrumb.profile"), path: `/perfil/${profileId}` },
        { label: t("breadcrumb.editProfile"), path: null },
      ];
    }
    return [
      { label: t("breadcrumb.home"), path: roleRoot },
      { label: t("breadcrumb.profile"), path: null },
    ];
  }

  const crumbs: BreadcrumbItem[] = [];
  const isAtRoot = location.pathname === roleRoot;
  crumbs.push({ label: t("breadcrumb.home"), path: isAtRoot ? null : roleRoot });

  if (!isAtRoot) {
    const matchedNav = navItems.slice(1).find(
      (item) => location.pathname === item.path || location.pathname.startsWith(item.path + "/")
    );

    if (matchedNav) {
      const hasSubPath = location.pathname !== matchedNav.path;
      crumbs.push({ label: matchedNav.label, path: hasSubPath ? matchedNav.path : null });

      if (hasSubPath) {
        crumbs.push({ label: breadcrumbLabel ?? "...", path: null });
      }
    }
  }

  return crumbs;
}
