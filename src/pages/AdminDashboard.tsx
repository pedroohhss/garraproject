import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Users, Layers, Calendar, UserCheck, Settings2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";

interface Stats {
  participants: number;
  groups: number;
  activeWeekNumber: number | null;
  spotsLeft: number;
}

interface ChallengeConfig {
  id: string;
  registration_open: boolean;
  ideas_open: boolean;
  voting_open: boolean;
  groups_confirmed: boolean;
  joining_open: boolean;
}

interface GroupRow {
  id: string;
  name: string;
  representative_id: string | null;
  leader_id: string | null;
  representativeName?: string;
  leaderName?: string;
}

const MAX_PARTICIPANTS = 75;

const TOGGLE_ITEMS: { key: keyof Omit<ChallengeConfig, "id">; label: string }[] = [
  { key: "registration_open", label: "Cadastro aberto" },
  { key: "ideas_open", label: "Cadastro de ideias" },
  { key: "voting_open", label: "Votação" },
  { key: "groups_confirmed", label: "Grupos confirmados" },
  { key: "joining_open", label: "Entrada nos grupos" },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [config, setConfig] = useState<ChallengeConfig | null>(null);
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const timeout = setTimeout(() => setLoading(false), 8000);

      try {
        const [participantsRes, groupsCountRes, weeksRes, configRes, groupsRes] =
          await Promise.all([
            supabase.rpc("get_participant_count"),
            supabase.from("groups").select("id", { count: "exact", head: true }),
            supabase.from("weeks").select("number").eq("is_active", true).maybeSingle(),
            supabase.from("challenge_config").select("*").limit(1).maybeSingle(),
            supabase.from("groups").select("id, name, representative_id, leader_id"),
          ]);

        const participantCount = (participantsRes.data as number) ?? 0;

        setStats({
          participants: participantCount,
          groups: groupsCountRes.count ?? 0,
          activeWeekNumber: weeksRes.data?.number ?? null,
          spotsLeft: Math.max(0, MAX_PARTICIPANTS - participantCount),
        });

        if (configRes.data) {
          setConfig({
            id: configRes.data.id,
            registration_open: configRes.data.registration_open ?? false,
            ideas_open: configRes.data.ideas_open ?? false,
            voting_open: configRes.data.voting_open ?? false,
            groups_confirmed: configRes.data.groups_confirmed ?? false,
            joining_open: configRes.data.joining_open ?? false,
          });
        }

        // Enrich groups with user names
        const rawGroups = groupsRes.data ?? [];
        if (rawGroups.length > 0) {
          const userIds = [
            ...rawGroups.map((g) => g.representative_id),
            ...rawGroups.map((g) => g.leader_id),
          ].filter(Boolean) as string[];

          const uniqueIds = [...new Set(userIds)];
          const { data: usersData } = uniqueIds.length > 0
            ? await supabase.from("users").select("id, full_name").in("id", uniqueIds)
            : { data: [] as { id: string; full_name: string }[] };

          const nameMap = new Map((usersData ?? []).map((u) => [u.id, u.full_name]));

          setGroups(
            rawGroups.map((g) => ({
              ...g,
              representativeName: g.representative_id ? nameMap.get(g.representative_id) ?? "—" : "—",
              leaderName: g.leader_id ? nameMap.get(g.leader_id) ?? "—" : "—",
            }))
          );
        } else {
          setGroups([]);
        }
      } catch {
        setStats({ participants: 0, groups: 0, activeWeekNumber: null, spotsLeft: MAX_PARTICIPANTS });
        setConfig(null);
        setGroups([]);
      } finally {
        clearTimeout(timeout);
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleToggle = useCallback(
    async (key: keyof Omit<ChallengeConfig, "id">, value: boolean) => {
      if (!config) return;

      // Optimistic update
      setConfig((prev) => (prev ? { ...prev, [key]: value } : prev));

      const { error } = await supabase
        .from("challenge_config")
        .update({ [key]: value })
        .eq("id", config.id);

      if (error) {
        // Revert
        setConfig((prev) => (prev ? { ...prev, [key]: !value } : prev));
        toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
      }
    },
    [config]
  );

  const cards = [
    { label: "Participantes", value: stats?.participants ?? 0, icon: Users },
    { label: "Grupos", value: stats?.groups ?? 0, icon: Layers },
    { label: "Semana Ativa", value: stats?.activeWeekNumber != null ? `Semana ${stats.activeWeekNumber}` : "—", icon: Calendar },
    { label: "Vagas Restantes", value: stats?.spotsLeft ?? MAX_PARTICIPANTS, icon: UserCheck },
  ];

  return (
    <DashboardLayout title="Painel Admin">
      {/* Top cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

      {/* Challenge control toggles */}
      <div className="mt-6 glass-card p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Settings2 className="h-4 w-4 text-primary" />
          <span className="section-label">Controle do Desafio</span>
        </div>

        {loading || !config ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="skeleton-loading h-8 w-full" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {TOGGLE_ITEMS.map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-secondary/30 transition-colors"
              >
                <span className="text-sm text-foreground">{item.label}</span>
                <Switch
                  checked={config[item.key] as boolean}
                  onCheckedChange={(val) => handleToggle(item.key, val)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Groups table */}
      <div className="mt-6 glass-card overflow-hidden">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            <span className="section-label">Todos os Grupos</span>
          </div>
        </div>

        {loading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton-loading h-10 w-full" />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <div className="p-8 flex flex-col items-center justify-center text-center space-y-3">
            <Layers className="h-8 w-8 text-muted-foreground" />
            <p className="text-muted-foreground">Nenhum grupo cadastrado ainda.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left px-4 py-3 font-medium">Nome</th>
                  <th className="text-left px-4 py-3 font-medium">Representante</th>
                  <th className="text-left px-4 py-3 font-medium">Líder</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((group) => (
                  <tr key={group.id} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3 text-foreground font-medium">{group.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{group.representativeName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{group.leaderName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
