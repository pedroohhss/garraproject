import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award } from "lucide-react";
import { cn } from "@/lib/utils";

interface Week { id: string; number: number; title: string }

interface GroupRank {
  id: string;
  name: string;
  totalPoints: number;
  pointsByWeek: Map<number, number>;
  earliestDelivery: string | null;
}

export default function RankingPage() {
  const [groups, setGroups] = useState<GroupRank[]>([]);
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [weeksRes, groupsRes, criteriaRes, entriesRes, deliveriesRes] = await Promise.all([
        supabase.from("weeks").select("id, number, title").order("number"),
        supabase.from("groups").select("id, name"),
        supabase.from("checklist_criteria").select("id, week_id, points"),
        supabase.from("checklist_entries").select("criterion_id, group_id, completed"),
        supabase.from("deliveries").select("group_id, submitted_at"),
      ]);

      const wks = weeksRes.data ?? [];
      setWeeks(wks);

      const allGroups = groupsRes.data ?? [];
      const allCriteria = criteriaRes.data ?? [];
      const allEntries = entriesRes.data ?? [];
      const allDeliveries = deliveriesRes.data ?? [];

      // Map criterion to its week and points
      const criterionMap = new Map(allCriteria.map((c) => [c.id, c]));
      const weekIdToNumber = new Map(wks.map((w) => [w.id, w.number]));

      // Earliest delivery per group (for tiebreak)
      const earliestMap = new Map<string, string>();
      allDeliveries.forEach((d) => {
        if (d.group_id && d.submitted_at) {
          const prev = earliestMap.get(d.group_id);
          if (!prev || d.submitted_at < prev) earliestMap.set(d.group_id, d.submitted_at);
        }
      });

      const ranked: GroupRank[] = allGroups.map((g) => {
        const pointsByWeek = new Map<number, number>();
        let total = 0;
        allEntries.forEach((e) => {
          if (e.group_id === g.id && e.completed && e.criterion_id) {
            const crit = criterionMap.get(e.criterion_id);
            if (crit) {
              const pts = crit.points ?? 0;
              total += pts;
              const weekNum = weekIdToNumber.get(crit.week_id ?? "") ?? 0;
              pointsByWeek.set(weekNum, (pointsByWeek.get(weekNum) ?? 0) + pts);
            }
          }
        });
        return {
          id: g.id,
          name: g.name,
          totalPoints: total,
          pointsByWeek,
          earliestDelivery: earliestMap.get(g.id) ?? null,
        };
      });

      ranked.sort((a, b) => {
        if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
        // Tiebreak: earliest delivery first
        if (!a.earliestDelivery && !b.earliestDelivery) return 0;
        if (!a.earliestDelivery) return 1;
        if (!b.earliestDelivery) return -1;
        return a.earliestDelivery.localeCompare(b.earliestDelivery);
      });

      setGroups(ranked);
      setLoading(false);
    };
    load();
  }, []);

  const PODIUM_ICONS = [Trophy, Medal, Award];

  return (
    <DashboardLayout title="Ranking de Grupos">
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="glass-card p-4 flex items-center gap-4">
              <div className="skeleton-loading h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="skeleton-loading h-4 w-3/4" />
                <div className="skeleton-loading h-3 w-1/4" />
              </div>
            </div>
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="glass-card p-12 flex flex-col items-center text-center space-y-3">
          <Trophy className="h-10 w-10 text-muted-foreground" />
          <p className="text-muted-foreground">Nenhum grupo cadastrado ainda.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {groups.map((group, index) => {
            const position = index + 1;
            const PodiumIcon = position <= 3 ? PODIUM_ICONS[index] : null;

            return (
              <div
                key={group.id}
                className={cn(
                  "glass-card p-4 flex items-center gap-4 transition-all",
                  position <= 3 && "ring-1 ring-primary/20"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
                  position === 1 ? "bg-primary text-primary-foreground" :
                  position === 2 ? "bg-primary/60 text-primary-foreground" :
                  position === 3 ? "bg-primary/30 text-primary" :
                  "bg-muted text-muted-foreground"
                )}>
                  {PodiumIcon ? <PodiumIcon className="h-5 w-5" /> : position}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-foreground">{group.name}</h3>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    {weeks.map((w) => {
                      const pts = group.pointsByWeek.get(w.number) ?? 0;
                      return pts > 0 ? (
                        <span key={w.number} className="text-[10px] text-muted-foreground">
                          S{w.number}: {pts}pts
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-lg font-bold text-foreground">{group.totalPoints}</p>
                  <p className="text-xs text-muted-foreground">pontos</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
