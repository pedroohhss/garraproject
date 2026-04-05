import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { CheckCircle2, ClipboardCheck, Loader2, Lock } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Criterion {
  id: string;
  description: string | null;
  points: number | null;
  week_id: string | null;
}

interface Entry {
  id: string;
  criterion_id: string | null;
  group_id: string | null;
  completed: boolean | null;
  note: string | null;
  submitted_by: string | null;
  submitted_at: string | null;
}

export default function ChecklistPage() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [entries, setEntries] = useState<Map<string, Entry>>(new Map());
  const [weekTitle, setWeekTitle] = useState("");
  const [weekId, setWeekId] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [toggles, setToggles] = useState<Map<string, boolean>>(new Map());
  const [notes, setNotes] = useState<Map<string, string>>(new Map());

  const isRepresentante = profile?.role === "representante";
  const groupId = profile?.group_id;

  const load = useCallback(async () => {
    setLoading(true);
    const { data: week } = await supabase
      .from("weeks").select("id, number, title").eq("is_active", true).maybeSingle();
    if (!week) { setLoading(false); return; }

    setWeekTitle(`${t("common.week")} ${week.number} — ${week.title}`);
    setWeekId(week.id);

    const [criteriaRes, entriesRes] = await Promise.all([
      supabase.from("checklist_criteria").select("*").eq("week_id", week.id),
      groupId
        ? supabase.from("checklist_entries").select("*").eq("group_id", groupId)
        : Promise.resolve({ data: [] }),
    ]);

    const crit = criteriaRes.data ?? [];
    setCriteria(crit);

    const entryMap = new Map<string, Entry>();
    const tMap = new Map<string, boolean>();
    const nMap = new Map<string, string>();

    (entriesRes.data ?? []).forEach((e: any) => {
      if (e.criterion_id && crit.some((c) => c.id === e.criterion_id)) {
        entryMap.set(e.criterion_id, e as Entry);
        tMap.set(e.criterion_id, e.completed ?? false);
        nMap.set(e.criterion_id, e.note ?? "");
      }
    });

    setEntries(entryMap);
    setToggles(tMap.size > 0 ? tMap : new Map(crit.map((c) => [c.id, false])));
    setNotes(nMap.size > 0 ? nMap : new Map(crit.map((c) => [c.id, ""])));
    setSubmitted(entryMap.size > 0);
    setLoading(false);
  }, [groupId, t]);

  useEffect(() => { load(); }, [load]);

  const totalPoints = criteria.reduce((s, c) => {
    if (toggles.get(c.id)) return s + (c.points ?? 0);
    return s;
  }, 0);

  const maxPoints = criteria.reduce((s, c) => s + (c.points ?? 0), 0);

  const handleSubmit = async () => {
    if (!groupId || !profile) return;
    setSubmitting(true);
    try {
      for (const criterion of criteria) {
        const existing = entries.get(criterion.id);
        const payload = {
          criterion_id: criterion.id,
          group_id: groupId,
          completed: toggles.get(criterion.id) ?? false,
          note: notes.get(criterion.id)?.trim() || null,
          submitted_by: profile.id,
          submitted_at: new Date().toISOString(),
        };
        if (existing) {
          await supabase.from("checklist_entries").update(payload).eq("id", existing.id);
        } else {
          await supabase.from("checklist_entries").insert(payload);
        }
      }
      toast({ title: t("checklist.toastSuccess", { points: totalPoints, max: maxPoints }) });
      setSubmitted(true);
      await load();
    } catch (err: any) {
      toast({ title: t("checklist.toastError"), description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout title={t("checklist.title")}>
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card p-6 space-y-3">
              <div className="skeleton-loading h-5 w-64" />
              <div className="skeleton-loading h-4 w-32" />
            </div>
          ))}
        </div>
      ) : !weekId ? (
        <div className="glass-card p-8 text-center text-muted-foreground">
          {t("checklist.noActiveWeek")}
        </div>
      ) : criteria.length === 0 ? (
        <div className="glass-card p-8 text-center text-muted-foreground">
          {t("checklist.noCriteria")}
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <Badge className="bg-primary text-primary-foreground text-sm px-3 py-1">{weekTitle}</Badge>
            <div className="flex-1" />
            <div className="text-sm text-foreground font-medium">
              {totalPoints}/{t("common.points", { count: maxPoints })}
            </div>
          </div>

          <div className="space-y-3">
            {criteria.map((criterion) => {
              const checked = toggles.get(criterion.id) ?? false;
              const note = notes.get(criterion.id) ?? "";

              return (
                <div
                  key={criterion.id}
                  className={cn(
                    "glass-card p-4 space-y-3 transition-all",
                    checked && "ring-1 ring-primary/30 bg-primary/5"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-sm text-foreground font-medium">{criterion.description}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{t("common.points", { count: criterion.points })}</p>
                    </div>
                    {isRepresentante && !submitted ? (
                      <Switch
                        checked={checked}
                        onCheckedChange={(v) => setToggles((prev) => new Map(prev).set(criterion.id, v))}
                      />
                    ) : (
                      <Badge className={cn("text-xs", checked ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground")}>
                        {checked ? <><CheckCircle2 className="h-3 w-3 mr-1" /> {t("checklist.done")}</> : t("checklist.notDone")}
                      </Badge>
                    )}
                  </div>
                  {isRepresentante && !submitted ? (
                    <Textarea
                      placeholder={t("checklist.notePlaceholder")}
                      value={note}
                      onChange={(e) => setNotes((prev) => new Map(prev).set(criterion.id, e.target.value))}
                      rows={2}
                      className="text-sm"
                    />
                  ) : note ? (
                    <p className="text-xs text-muted-foreground bg-secondary/30 rounded p-2">{note}</p>
                  ) : null}
                </div>
              );
            })}
          </div>

          {isRepresentante && (
            <div className="mt-6">
              {submitted ? (
                <div className="glass-card p-4 flex items-center gap-2 text-primary">
                  <Lock className="h-4 w-4" />
                  <span className="text-sm">{t("checklist.submittedMessage")}</span>
                </div>
              ) : (
                <Button onClick={handleSubmit} disabled={submitting} className="w-full gap-1.5">
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  <ClipboardCheck className="h-4 w-4" /> {t("checklist.submitButton", { points: totalPoints, max: maxPoints })}
                </Button>
              )}
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
