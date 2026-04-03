import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, FileText } from "lucide-react";

export default function ParticipanteDashboard() {
  const { profile } = useAuth();
  const [activeWeek, setActiveWeek] = useState<string | null>(null);
  const [activityCount, setActivityCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const timeout = setTimeout(() => setLoading(false), 8000);
      try {
        const [weekRes, activitiesRes] = await Promise.all([
          supabase.from("weeks").select("title, id").eq("is_active", true).limit(1),
          supabase.from("activities").select("id", { count: "exact", head: true }),
        ]);

        setActiveWeek(weekRes.data?.[0]?.title ?? null);
        setActivityCount(activitiesRes.count ?? 0);
      } catch {
        setActiveWeek(null);
        setActivityCount(0);
      } finally {
        clearTimeout(timeout);
        setLoading(false);
      }
    };
    load();
  }, []);

  const roleName = profile?.role === "representante" ? "Representante" : "Participante";

  const cards = [
    { label: "Semana Atual", value: activeWeek ?? "Nenhuma", icon: Calendar },
    { label: "Atividades", value: activityCount ?? 0, icon: FileText },
  ];

  return (
    <DashboardLayout title={`Painel do ${roleName}`}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="glass-card p-6 space-y-3">
            <div className="flex items-center gap-2">
              <card.icon className="h-4 w-4 text-primary" />
              <span className="section-label">{card.label}</span>
            </div>
            {loading ? (
              <div className="skeleton-loading h-8 w-24" />
            ) : (
              <p className="value-highlight">{card.value}</p>
            )}
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
