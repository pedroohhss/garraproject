import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Week { id: string; number: number; title: string; is_active: boolean }
interface Group { id: string; name: string }
interface Criterion { id: string; week_id: string; description: string | null; points: number | null }
interface Entry {
  id: string; criterion_id: string | null; group_id: string | null;
  completed: boolean | null; note: string | null; submitted_at: string | null;
}

export default function ChecklistTrackingPage() {
  const { t } = useTranslation();
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [selectedWeekId, setSelectedWeekId] = useState("");
  const [groups, setGroups] = useState<Group[]>([]);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  const [detailGroup, setDetailGroup] = useState<Group | null>(null);

  const loadWeeks = useCallback(async () => {
    const { data } = await supabase.from("weeks").select("id, number, title, is_active").order("number");
    const wks = data ?? [];
    setWeeks(wks);
    const active = wks.find((w) => w.is_active);
    setSelectedWeekId(active?.id ?? wks[0]?.id ?? "");
  }, []);

  useEffect(() => { loadWeeks(); }, [loadWeeks]);

  const loadData = useCallback(async () => {
    if (!selectedWeekId) return;
    setLoading(true);
    const [criteriaRes, groupsRes, entriesRes] = await Promise.all([
      supabase.from("checklist_criteria").select("*").eq("week_id", selectedWeekId),
      supabase.from("groups").select("id, name").order("name"),
      supabase.from("checklist_entries").select("*"),
    ]);
    setCriteria(criteriaRes.data ?? []);
    setGroups(groupsRes.data ?? []);
    setEntries((entriesRes.data ?? []) as Entry[]);
    setLoading(false);
  }, [selectedWeekId]);

  useEffect(() => { loadData(); }, [loadData]);

  const getGroupStatus = (groupId: string): "preenchido" | "pendente" => {
    const weekCriteriaIds = new Set(criteria.map((c) => c.id));
    const groupEntries = entries.filter((e) => e.group_id === groupId && weekCriteriaIds.has(e.criterion_id ?? ""));
    return groupEntries.length >= criteria.length && criteria.length > 0 ? "preenchido" : "pendente";
  };

  const getGroupPoints = (groupId: string): number => {
    const weekCriteriaIds = new Set(criteria.map((c) => c.id));
    return entries
      .filter((e) => e.group_id === groupId && weekCriteriaIds.has(e.criterion_id ?? "") && e.completed)
      .reduce((sum, e) => {
        const crit = criteria.find((c) => c.id === e.criterion_id);
        return sum + (crit?.points ?? 0);
      }, 0);
  };

  const getGroupEntries = (groupId: string) => {
    const weekCriteriaIds = new Set(criteria.map((c) => c.id));
    return entries.filter((e) => e.group_id === groupId && weekCriteriaIds.has(e.criterion_id ?? ""));
  };

  const maxPoints = criteria.reduce((s, c) => s + (c.points ?? 0), 0);
  const selectedWeek = weeks.find((w) => w.id === selectedWeekId);

  return (
    <DashboardLayout title={t("checklistTracking.title")}>
      <div className="flex items-center gap-3 mb-6">
        <Select value={selectedWeekId} onValueChange={setSelectedWeekId}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder={t("checklistTracking.selectWeek")} />
          </SelectTrigger>
          <SelectContent>
            {weeks.map((w) => (
              <SelectItem key={w.id} value={w.id}>
                {w.is_active
                  ? t("checklistTracking.weekOption", { number: w.number, title: w.title })
                  : t("checklistTracking.weekOptionInactive", { number: w.number, title: w.title })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {criteria.length > 0 && (
          <span className="text-xs text-muted-foreground">{t("checklistTracking.criteriaCount", { count: criteria.length, max: maxPoints })}</span>
        )}
      </div>

      {loading ? (
        <div className="glass-card p-6 space-y-3">
          <div className="skeleton-loading h-8 w-full" />
          <div className="skeleton-loading h-32 w-full" />
        </div>
      ) : criteria.length === 0 ? (
        <div className="glass-card p-8 text-center text-muted-foreground">
          {t("checklistTracking.noCriteria")}
        </div>
      ) : groups.length === 0 ? (
        <div className="glass-card p-8 text-center text-muted-foreground">{t("checklistTracking.noGroups")}</div>
      ) : (
        <div className="space-y-2">
          {groups.map((group) => {
            const status = getGroupStatus(group.id);
            const points = getGroupPoints(group.id);
            const isPending = status === "pendente";

            return (
              <div
                key={group.id}
                onClick={() => setDetailGroup(group)}
                className={cn(
                  "glass-card p-4 flex items-center gap-4 cursor-pointer hover:bg-secondary/30 transition-colors",
                  isPending && "border-l-2 border-l-destructive/50"
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {isPending && <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />}
                    <span className="text-sm font-medium text-foreground">{group.name}</span>
                  </div>
                </div>
                <span className="text-sm text-foreground font-medium">{points}/{maxPoints} pts</span>
                <Badge className={cn("text-xs gap-1",
                  isPending ? "bg-destructive/10 text-destructive" : "bg-primary/20 text-primary"
                )}>
                  {isPending
                    ? <><Clock className="h-3 w-3" /> {t("checklistTracking.pending")}</>
                    : <><CheckCircle2 className="h-3 w-3" /> {t("checklistTracking.filled")}</>}
                </Badge>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Sheet */}
      <Sheet open={!!detailGroup} onOpenChange={(o) => !o && setDetailGroup(null)}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{detailGroup?.name}</SheetTitle>
          </SheetHeader>
          {detailGroup && (
            <div className="mt-4 space-y-3">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                {t("checklistTracking.sheetTitle", { title: selectedWeek?.title ?? "" })}
              </p>
              {criteria.map((c) => {
                const entry = getGroupEntries(detailGroup.id).find((e) => e.criterion_id === c.id);
                const completed = entry?.completed ?? false;
                return (
                  <div key={c.id} className={cn("p-3 rounded-lg", completed ? "bg-primary/5" : "bg-secondary/30")}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm text-foreground">{c.description}</p>
                      <Badge className={cn("text-xs shrink-0",
                        completed ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"
                      )}>
                        {completed ? `${c.points} pts` : "0 pts"}
                      </Badge>
                    </div>
                    {entry?.note && (
                      <p className="text-xs text-muted-foreground mt-2 italic">"{entry.note}"</p>
                    )}
                    {entry?.submitted_at && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {t("checklistTracking.submittedAt", { date: format(new Date(entry.submitted_at), `dd/MM/yyyy '${t("common.at")}' HH:mm`) })}
                      </p>
                    )}
                  </div>
                );
              })}
              <div className="border-t border-border pt-3 flex justify-between">
                <span className="text-sm text-muted-foreground">{t("checklistTracking.total")}</span>
                <span className="text-sm font-bold text-foreground">
                  {getGroupPoints(detailGroup.id)}/{maxPoints} pts
                </span>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </DashboardLayout>
  );
}
