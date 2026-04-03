import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Users, FileText, Sparkles } from "lucide-react";

interface WeekData {
  title: string;
  theme: string | null;
}

export default function ParticipanteDashboard() {
  const { profile } = useAuth();
  const [activeWeek, setActiveWeek] = useState<WeekData | null>(null);
  const [groupName, setGroupName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const timeout = setTimeout(() => setLoading(false), 8000);
      try {
        // Fetch active week
        const weekPromise = supabase
          .from("weeks")
          .select("title, theme")
          .eq("is_active", true)
          .maybeSingle();

        // Fetch group name if user has a group
        const groupPromise = profile?.group_id
          ? supabase
              .from("groups")
              .select("name")
              .eq("id", profile.group_id)
              .maybeSingle()
          : Promise.resolve({ data: null });

        const [weekRes, groupRes] = await Promise.all([weekPromise, groupPromise]);

        setActiveWeek(weekRes.data ?? null);
        setGroupName(groupRes.data?.name ?? null);
      } catch {
        setActiveWeek(null);
        setGroupName(null);
      } finally {
        clearTimeout(timeout);
        setLoading(false);
      }
    };
    load();
  }, [profile?.group_id]);

  const roleName = profile?.role === "representante" ? "Representante" : "Participante";

  const cards = [
    { label: "Semana Atual", value: activeWeek?.title ?? "Não iniciado", icon: Calendar },
    { label: "Meu Grupo", value: groupName ?? "Sem grupo", icon: Users },
    { label: "Entregas Pendentes", value: "—", icon: FileText },
  ];

  return (
    <DashboardLayout title={`Painel do ${roleName}`}>
      {/* Top cards */}
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

      {/* Week theme section */}
      <div className="mt-6">
        {loading ? (
          <div className="glass-card p-6 space-y-3">
            <div className="skeleton-loading h-5 w-32" />
            <div className="skeleton-loading h-4 w-full" />
            <div className="skeleton-loading h-4 w-3/4" />
          </div>
        ) : activeWeek?.theme ? (
          <div className="glass-card p-6 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="section-label">Tema da Semana</span>
            </div>
            <p className="text-foreground">{activeWeek.theme}</p>
          </div>
        ) : (
          <div className="glass-card p-8 flex flex-col items-center justify-center text-center space-y-3">
            <Sparkles className="h-8 w-8 text-muted-foreground" />
            <p className="text-muted-foreground">O desafio ainda não começou.</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
