import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { useBreadcrumbs } from "@/services/breadcrumb.service";

interface NavItem {
  label: string;
  path: string;
}

interface AppBreadcrumbProps {
  navItems: NavItem[];
  breadcrumbLabel?: string;
}

export default function AppBreadcrumb({ navItems, breadcrumbLabel }: AppBreadcrumbProps) {
  const breadcrumbs = useBreadcrumbs({ navItems, breadcrumbLabel });

  return (
    <nav aria-label="breadcrumb" className="flex-1 min-w-0">
      <ol className="flex items-center gap-1 text-sm">
        {breadcrumbs.map((crumb, index) => (
          <li key={index} className="flex items-center gap-1 min-w-0">
            {index > 0 && (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            )}
            {crumb.path ? (
              <Link
                to={crumb.path}
                className="text-muted-foreground hover:text-foreground transition-colors truncate"
              >
                {crumb.label}
              </Link>
            ) : (
              <span className="text-foreground font-medium truncate">{crumb.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
