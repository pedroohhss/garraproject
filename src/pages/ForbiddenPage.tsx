import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { ShieldOff, Clock } from "lucide-react";

export default function ForbiddenPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const reason = params.get("reason") ?? "role";
  const isUnavailable = reason === "unavailable";

  const Icon = isUnavailable ? Clock : ShieldOff;
  const title = isUnavailable ? t("forbidden.titleUnavailable") : t("forbidden.titleRole");
  const description = isUnavailable ? t("forbidden.descriptionUnavailable") : t("forbidden.descriptionRole");

  return (
    <DashboardLayout title={title}>
      <div className="flex flex-col items-center justify-center py-24 gap-6 text-center">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
          <Icon className="h-9 w-9 text-muted-foreground" />
        </div>
        <div className="space-y-2 max-w-sm">
          <h2 className="text-xl font-semibold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => navigate(-1)}>
            {t("forbidden.goBack")}
          </Button>
          <Button onClick={() => navigate("/")}>
            {t("forbidden.goDashboard")}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
