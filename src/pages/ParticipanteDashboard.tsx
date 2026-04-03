import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Users, FileText, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CARGOS } from "@/components/CargoSelectDialog";

interface WeekData {
  title: string;
  theme: string | null;
}

export default function ParticipanteDashboard() {
  const { profile, user } = useAuth();
  const [activeWeek, setActiveWeek] = useState<WeekData | null>(null);
  const [groupName, setGroupName] = useState<string | null>(null);
  const [userCargo, setUserCargo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const timeout = setTimeout(() => setLoading(false), 8000);
      try {
        const weekPromise = supabase
          .from("weeks")
          .select("title, theme")
          .eq("is_active", true)
          .maybeSingle();

        const memberPromise = user
          ? supabase
              .from("group_members")
              .select("group_id, cargo")
              .eq("user_id", user.id)
              .maybeSingle()
          : Promise.resolve({ data: null });

        const [weekRes, memberRes] = await Promise.all([weekPromise, memberPromise]);

        setActiveWeek(weekRes.data ?? null);

        const memberData = memberRes.data as { group_id: string; cargo: string } | null;
        if (memberData) {
          setUserCargo(memberData.cargo);
          const { data: groupData } = await supabase
            .from("groups")
            .select("name")
            .eq("id", memberData.group_id)
            .maybeSingle();
          setGroupName(groupData?.name ?? null);
        } else {
          setGroupName(null);
          setUserCargo(null);
        }
      } catch {
        setActiveWeek(null);
        setGroupName(null);
        setUserCargo(null);
      } finally {
        clearTimeout(timeout);
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const roleName = profile?.role === "representante" ? "Representante" : "Participante";
  const cargoInfo = userCargo ? CARGOS.find((c) => c.value === userCargo) : null;

  const groupValue = groupName
    ? userCargo
      ? `${groupName}`
      : groupName
    : "Sem grupo";

  const cards = [
    { label: "Semana Atual", value: activeWeek?.title ?? "Não iniciado", icon: Calendar },
    { label: "Meu Grupo", value: groupValue, icon: Users, extra: cargoInfo },
    { label: "Entregas Pendentes", value: "—", icon: FileText },
  ];

  return (
    <DashboardLayout title={`Painel do ${roleName}`}>
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
              <div>
                <p className="value-highlight">{card.value}</p>
                {card.extra && (
                  <Badge variant="default" className="mt-1 text-xs capitalize">
                    {card.extra.label}
                  </Badge>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

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
