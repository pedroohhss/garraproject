import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Users, Layers, Calendar, UserCheck, Settings2, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

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
  memberCount: number;
  missingRequired: string[];
}

const MAX_PARTICIPANTS = 75;
const REQUIRED_CARGOS = ["fundador", "estrategista", "construtor"];

export default function AdminDashboard() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<Stats | null>(null);
  const [config, setConfig] = useState<ChallengeConfig | null>(null);
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [loading, setLoading] = useState(true);

  const TOGGLE_ITEMS: { key: keyof Omit<ChallengeConfig, "id">; label: string }[] = [
    { key: "registration_open", label: t("dashboard.admin.openRegistration") },
    { key: "ideas_open", label: t("dashboard.admin.ideaRegistration") },
    { key: "voting_open", label: t("dashboard.admin.voting") },
    { key: "joining_open", label: t("dashboard.admin.groupEntry") },
  ];

  useEffect(() => {
    const load = async () => {
      const timeout = setTimeout(() => setLoading(false), 8000);
      try {
        const [participantsRes, groupsCountRes, weeksRes, configRes, groupsRes, membersRes] =
          await Promise.all([
            supabase.rpc("get_participant_count"),
            supabase.from("groups").select("id", { count: "exact", head: true }),
            supabase.from("weeks").select("number").eq("is_active", true).maybeSingle(),
            supabase.from("challenge_config").select("*").limit(1).maybeSingle(),
            supabase.from("groups").select("id, name, representative_id, leader_id"),
            supabase.from("group_members").select("group_id, user_id, cargo"),
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

        const rawGroups = groupsRes.data ?? [];
        const allMembers = (membersRes.data ?? []) as { group_id: string; user_id: string; cargo: string }[];

        const membersByGroup = new Map<string, { user_id: string; cargo: string }[]>();
        allMembers.forEach((m) => {
          const list = membersByGroup.get(m.group_id) ?? [];
          list.push(m);
          membersByGroup.set(m.group_id, list);
        });

        if (rawGroups.length > 0) {
          const userIds = [
            ...rawGroups.map((g) => g.representative_id),
            ...rawGroups.map((g) => g.leader_id),
          ].filter(Boolean) as string[];
          const uniqueIds = [...new Set(userIds)];
          const { data: usersData } = uniqueIds.length > 0
            ? await supabase.from("users_public" as any).select("id, full_name").in("id", uniqueIds) as { data: { id: string; full_name: string }[] | null }
            : { data: [] as { id: string; full_name: string }[] };
          const nameMap = new Map((usersData ?? []).map((u) => [u.id, u.full_name]));

          setGroups(
            rawGroups.map((g) => {
              const members = membersByGroup.get(g.id) ?? [];
              const occupiedCargos = members.map((m) => m.cargo);
              const missingRequired = REQUIRED_CARGOS.filter((c) => !occupiedCargos.includes(c));
              return {
                ...g,
                representativeName: g.representative_id ? nameMap.get(g.representative_id) ?? "—" : "—",
                leaderName: g.leader_id ? nameMap.get(g.leader_id) ?? "—" : "—",
                memberCount: members.length,
                missingRequired,
              };
            })
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

  const [creatingGroups, setCreatingGroups] = useState(false);

  const createGroupsFromTopIdeas = useCallback(async () => {
    setCreatingGroups(true);
    try {
      const [ideasRes, votesRes] = await Promise.all([
        supabase.from("ideas").select("id, title, created_by"),
        supabase.from("votes").select("idea_id, quantity"),
      ]);
      const allIdeas = ideasRes.data ?? [];
      const allVotes = votesRes.data ?? [];

      const voteSumMap = new Map<string, number>();
      allVotes.forEach((v) => {
        if (v.idea_id) {
          voteSumMap.set(v.idea_id, (voteSumMap.get(v.idea_id) ?? 0) + (v.quantity ?? 1));
        }
      });

      const ranked = allIdeas
        .map((i) => ({ ...i, totalVotes: voteSumMap.get(i.id) ?? 0 }))
        .sort((a, b) => b.totalVotes - a.totalVotes);

      if (ranked.length === 0) {
        toast({ title: t("dashboard.admin.noIdeasForGroups"), variant: "destructive" });
        return;
      }

      const MAX = 15;
      let selected = ranked.slice(0, MAX);
      const cutoffScore = selected.length === MAX ? selected[MAX - 1].totalVotes : -1;
      const tiedBeyond = ranked.slice(MAX).filter((i) => i.totalVotes === cutoffScore && cutoffScore > 0);

      if (tiedBeyond.length > 0) {
        selected = [...selected, ...tiedBeyond];
        toast({
          title: t("dashboard.admin.tieDetected"),
          description: t("dashboard.admin.tieDescription", { cutoffScore, selected: selected.length }),
        });
      }

      for (const idea of selected) {
        const { data: group, error: groupErr } = await supabase
          .from("groups")
          .insert({ name: idea.title, idea_id: idea.id, leader_id: idea.created_by })
          .select("id")
          .single();
        if (groupErr) throw groupErr;

        if (idea.created_by) {
          const { error: memberErr } = await supabase
            .from("group_members")
            .insert({ group_id: group.id, user_id: idea.created_by, cargo: "fundador" as any });
          if (memberErr) throw memberErr;

          await supabase.from("users").update({ group_id: group.id }).eq("id", idea.created_by);
        }
      }

      const { data: cfgData } = await supabase.from("challenge_config").select("id").limit(1).single();
      if (cfgData) {
        await supabase.from("challenge_config").update({ groups_confirmed: true }).eq("id", cfgData.id);
      }

      toast({ title: t("dashboard.admin.groupsCreated", { count: selected.length }) });
    } catch (err: any) {
      toast({ title: t("dashboard.admin.errorCreatingGroups"), description: err.message, variant: "destructive" });
    } finally {
      setCreatingGroups(false);
    }
  }, [config, t]);

  const handleToggle = useCallback(
    async (key: keyof Omit<ChallengeConfig, "id">, value: boolean) => {
      if (!config) return;
      setConfig((prev) => (prev ? { ...prev, [key]: value } : prev));
      const { error } = await supabase
        .from("challenge_config")
        .update({ [key]: value })
        .eq("id", config.id);
      if (error) {
        setConfig((prev) => (prev ? { ...prev, [key]: !value } : prev));
        toast({ title: t("dashboard.admin.errorUpdating"), description: error.message, variant: "destructive" });
        return;
      }

      if (key === "voting_open" && value === false) {
        const { count } = await supabase.from("groups").select("id", { count: "exact", head: true });
        if ((count ?? 0) === 0) {
          await createGroupsFromTopIdeas();
        }
      }
    },
    [config, createGroupsFromTopIdeas, t]
  );

  const cards = [
    { label: t("dashboard.admin.participants"), value: stats?.participants ?? 0, icon: Users },
    { label: t("dashboard.admin.groups"), value: stats?.groups ?? 0, icon: Layers },
    { label: t("dashboard.admin.activeWeek"), value: stats?.activeWeekNumber != null ? `${t("common.week")} ${stats.activeWeekNumber}` : "—", icon: Calendar },
    { label: t("dashboard.admin.remainingSlots"), value: stats?.spotsLeft ?? MAX_PARTICIPANTS, icon: UserCheck },
  ];

  return (
    <DashboardLayout title={t("dashboard.admin.title")}>
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

      <div className="mt-6 glass-card p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Settings2 className="h-4 w-4 text-primary" />
          <span className="section-label">{t("dashboard.admin.challengeControl")}</span>
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
              <div key={item.key} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-secondary/30 transition-colors">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-foreground">{item.label}</span>
                  {item.key === "voting_open" && creatingGroups && (
                    <span className="flex items-center gap-1 text-xs text-primary">
                      <Loader2 className="h-3 w-3 animate-spin" /> {t("dashboard.admin.creatingGroups")}
                    </span>
                  )}
                </div>
                <Switch
                  checked={config[item.key] as boolean}
                  onCheckedChange={(val) => handleToggle(item.key, val)}
                  disabled={creatingGroups}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 glass-card overflow-hidden">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            <span className="section-label">{t("dashboard.admin.allGroups")}</span>
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
            <p className="text-muted-foreground">{t("dashboard.admin.noGroupsYet")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left px-4 py-3 font-medium">{t("dashboard.admin.title")}</th>
                  <th className="text-left px-4 py-3 font-medium">{t("dashboard.admin.members")}</th>
                  <th className="text-left px-4 py-3 font-medium">{t("dashboard.admin.status")}</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((group) => (
                  <tr key={group.id} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3 text-foreground font-medium">{group.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{group.memberCount}/5</td>
                    <td className="px-4 py-3">
                      {group.missingRequired.length === 0 ? (
                        <Badge variant="default" className="gap-1 text-xs">
                          <CheckCircle2 className="h-3 w-3" /> {t("dashboard.admin.complete")}
                        </Badge>
                      ) : (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge variant="destructive" className="gap-1 text-xs">
                            <AlertTriangle className="h-3 w-3" /> {t("dashboard.admin.missing", { roles: group.missingRequired.map((c) => c.charAt(0).toUpperCase() + c.slice(1)).join(", ") })}
                          </Badge>
                        </div>
                      )}
                    </td>
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
