import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Users, Lightbulb, Calendar } from "lucide-react";

interface Stats {
  participants: number;
  ideas: number;
  activeWeek: string | null;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const timeout = setTimeout(() => setLoading(false), 8000);

      try {
        const [participantsRes, ideasRes, weeksRes] = await Promise.all([
          supabase.rpc("get_participant_count"),
          supabase.from("ideas").select("id", { count: "exact", head: true }),
          supabase.from("weeks").select("title").eq("is_active", true).limit(1),
        ]);

        setStats({
          participants: participantsRes.data ?? 0,
          ideas: ideasRes.count ?? 0,
          activeWeek: weeksRes.data?.[0]?.title ?? null,
        });
      } catch {
        setStats({ participants: 0, ideas: 0, activeWeek: null });
      } finally {
        clearTimeout(timeout);
        setLoading(false);
      }
    };
    load();
  }, []);

  const cards = [
    { label: "Participantes", value: stats?.participants ?? 0, icon: Users },
    { label: "Ideias", value: stats?.ideas ?? 0, icon: Lightbulb },
    { label: "Semana Ativa", value: stats?.activeWeek ?? "Nenhuma", icon: Calendar },
  ];

  return (
    <DashboardLayout title="Painel Admin">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
