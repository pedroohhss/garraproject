import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Users, Calendar, Layers } from "lucide-react";

interface GroupRow {
  id: string;
  name: string;
  representative_id: string | null;
  members: { id: string; full_name: string }[];
  representative?: string;
}

export default function LiderDashboard() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [activeWeek, setActiveWeek] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      const timeout = setTimeout(() => setLoading(false), 8000);
      try {
        const [groupsRes, weekRes] = await Promise.all([
          supabase
            .from("groups")
            .select("id, name, representative_id")
            .eq("leader_id", user.id),
          supabase
            .from("weeks")
            .select("title")
            .eq("is_active", true)
            .maybeSingle(),
        ]);

        const rawGroups = groupsRes.data ?? [];
        setActiveWeek(weekRes.data?.title ?? null);

        if (rawGroups.length === 0) {
          setGroups([]);
        } else {
          // Fetch members and representative names for each group
          const groupIds = rawGroups.map((g) => g.id);
          const repIds = rawGroups
            .map((g) => g.representative_id)
            .filter(Boolean) as string[];

          const [membersRes, repsRes] = await Promise.all([
            supabase
              .from("users")
              .select("id, full_name, group_id")
              .in("group_id", groupIds),
            repIds.length > 0
              ? (supabase.from("users_public" as any).select("id, full_name").in("id", repIds) as unknown as Promise<{ data: { id: string; full_name: string }[] | null }>)
              : Promise.resolve({ data: [] as { id: string; full_name: string }[] }),
          ]);

          const membersData = membersRes.data ?? [];
          const repsData = repsRes.data ?? [];

          const repMap = new Map((repsData as { id: string; full_name: string }[]).map((r) => [r.id, r.full_name]));

          const enriched: GroupRow[] = rawGroups.map((g) => ({
            ...g,
            members: membersData.filter((m) => m.group_id === g.id),
            representative: g.representative_id
              ? repMap.get(g.representative_id) ?? "—"
              : "—",
          }));

          setGroups(enriched);
        }
      } catch {
        setGroups([]);
        setActiveWeek(null);
      } finally {
        clearTimeout(timeout);
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const cards = [
    { label: "Meus Grupos", value: groups.length, icon: Layers },
    { label: "Semana Atual", value: activeWeek ?? "Não iniciado", icon: Calendar },
  ];

  return (
    <DashboardLayout title="Painel do Líder">
      {/* Top cards */}
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

      {/* Groups table */}
      <div className="mt-6 glass-card overflow-hidden">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <span className="section-label">Grupos sob sua liderança</span>
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
            <Users className="h-8 w-8 text-muted-foreground" />
            <p className="text-muted-foreground">Nenhum grupo vinculado à sua liderança.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left px-4 py-3 font-medium">Nome</th>
                  <th className="text-left px-4 py-3 font-medium">Membros</th>
                  <th className="text-left px-4 py-3 font-medium">Representante</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((group) => (
                  <tr key={group.id} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3 text-foreground font-medium">{group.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{group.members.length}</td>
                    <td className="px-4 py-3 text-muted-foreground">{group.representative}</td>
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
