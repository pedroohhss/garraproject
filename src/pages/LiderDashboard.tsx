import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Users, FileText } from "lucide-react";

export default function LiderDashboard() {
  const { profile } = useAuth();
  const [teamCount, setTeamCount] = useState<number | null>(null);
  const [deliveryCount, setDeliveryCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.group_id) {
      setLoading(false);
      return;
    }

    const load = async () => {
      const timeout = setTimeout(() => setLoading(false), 8000);
      try {
        const [teamRes, delivRes] = await Promise.all([
          supabase.from("users").select("id", { count: "exact", head: true }).eq("group_id", profile.group_id!),
          supabase.from("deliveries").select("id", { count: "exact", head: true }).eq("group_id", profile.group_id!),
        ]);
        setTeamCount(teamRes.count ?? 0);
        setDeliveryCount(delivRes.count ?? 0);
      } catch {
        setTeamCount(0);
        setDeliveryCount(0);
      } finally {
        clearTimeout(timeout);
        setLoading(false);
      }
    };
    load();
  }, [profile?.group_id]);

  const cards = [
    { label: "Membros da Equipe", value: teamCount ?? 0, icon: Users },
    { label: "Entregas", value: deliveryCount ?? 0, icon: FileText },
  ];

  return (
    <DashboardLayout title="Painel do Líder">
      {!profile?.group_id ? (
        <div className="glass-card p-6 text-center">
          <p className="text-muted-foreground">Você ainda não está vinculado a um grupo.</p>
        </div>
      ) : (
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
      )}
    </DashboardLayout>
  );
}
