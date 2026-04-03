import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import GlassCard from "@/components/GlassCard";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

interface ChallengeConfig {
  id: string;
  registration_open: boolean | null;
  ideas_open: boolean | null;
  voting_open: boolean | null;
  groups_confirmed: boolean | null;
  joining_open: boolean | null;
}

const toggles: { key: keyof Omit<ChallengeConfig, "id">; label: string }[] = [
  { key: "registration_open", label: "Cadastro Aberto" },
  { key: "ideas_open", label: "Fase de Ideias" },
  { key: "voting_open", label: "Votação" },
  { key: "groups_confirmed", label: "Grupos Confirmados" },
  { key: "joining_open", label: "Entrada nos Grupos" },
];

export default function DashboardAdmin() {
  const [config, setConfig] = useState<ChallengeConfig | null>(null);
  const [stats, setStats] = useState({ participants: 0, groups: 0, activeWeek: "—", deliveries: 0 });
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setLoadError(prev => prev ?? "Tempo esgotado ao carregar dados.");
    }, 8000);

    Promise.all([fetchConfig(), fetchStats()])
      .catch(() => setLoadError("Erro ao carregar dados do painel."))
      .finally(() => clearTimeout(timeout));

    return () => clearTimeout(timeout);
  }, []);

  const fetchConfig = async () => {
    const { data, error } = await supabase.from("challenge_config").select("*").limit(1).single();
    if (error) { console.error("[Admin] config error:", error.message); return; }
    if (data) setConfig(data as ChallengeConfig);
  };

  const fetchStats = async () => {
    const [usersRes, groupsRes, weeksRes, deliveriesRes] = await Promise.all([
      supabase.from("users").select("*", { count: "exact", head: true }).neq("role", "admin"),
      supabase.from("groups").select("*", { count: "exact", head: true }),
      supabase.from("weeks").select("title").eq("is_active", true).limit(1).single(),
      supabase.from("deliveries").select("*", { count: "exact", head: true }),
    ]);

    setStats({
      participants: usersRes.count ?? 0,
      groups: groupsRes.count ?? 0,
      activeWeek: weeksRes.data?.title ?? "—",
      deliveries: deliveriesRes.count ?? 0,
    });
  };

  const handleToggle = async (key: keyof Omit<ChallengeConfig, "id">, value: boolean) => {
    if (!config) return;
    const { error } = await supabase
      .from("challenge_config")
      .update({ [key]: value })
      .eq("id", config.id);

    if (error) {
      toast.error("Erro ao atualizar configuração");
      return;
    }

    setConfig({ ...config, [key]: value });
    toast.success("Configuração atualizada");
  };

  if (loadError) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <GlassCard className="text-center p-8">
            <p className="text-destructive mb-4">{loadError}</p>
            <button onClick={() => window.location.reload()} className="text-primary hover:underline text-sm">Recarregar</button>
          </GlassCard>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-foreground">Painel Admin</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <GlassCard>
          <p className="section-label mb-2">Participantes</p>
          <p className="value-highlight">{stats.participants}</p>
        </GlassCard>
        <GlassCard>
          <p className="section-label mb-2">Grupos Formados</p>
          <p className="value-highlight">{stats.groups}</p>
        </GlassCard>
        <GlassCard>
          <p className="section-label mb-2">Semana Ativa</p>
          <p className="value-highlight text-lg">{stats.activeWeek}</p>
        </GlassCard>
        <GlassCard>
          <p className="section-label mb-2">Entregas Concluídas</p>
          <p className="value-highlight">{stats.deliveries}</p>
        </GlassCard>
      </div>

      {/* Challenge Control */}
      <div className="mb-8">
        <h2 className="section-label mb-4">Controle do Desafio</h2>
        <GlassCard>
          <div className="space-y-4">
            {toggles.map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between py-2">
                <span className="text-sm text-foreground">{label}</span>
                <Switch
                  checked={config?.[key] ?? false}
                  onCheckedChange={(v) => handleToggle(key, v)}
                />
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Groups table placeholder */}
      <div>
        <h2 className="section-label mb-4">Grupos</h2>
        <GlassCard>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 label-sm font-semibold">Nome</th>
                  <th className="text-left py-3 px-4 label-sm font-semibold">Membros</th>
                  <th className="text-left py-3 px-4 label-sm font-semibold">Representante</th>
                  <th className="text-left py-3 px-4 label-sm font-semibold">Líder</th>
                  <th className="text-left py-3 px-4 label-sm font-semibold">Pontuação</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={5} className="text-center py-8 text-muted-foreground">
                    Nenhum grupo cadastrado
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </GlassCard>
      </div>
    </DashboardLayout>
  );
}
