import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Calendar as CalendarIcon, CheckCircle2, ChevronRight, ClipboardCheck, Loader2,
  Pencil, Play, Plus, Trash2, Trophy,
} from "lucide-react";
import { useTranslation } from "react-i18next";

interface Week {
  id: string;
  number: number;
  title: string;
  theme: string | null;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
}

interface Criterion {
  id: string;
  week_id: string;
  description: string | null;
  points: number | null;
}

type WeekStatus = "futura" | "ativa" | "encerrada";

function getWeekStatus(week: Week, activeNumber: number | null): WeekStatus {
  if (week.is_active) return "ativa";
  if (activeNumber !== null && week.number < activeNumber) return "encerrada";
  if (activeNumber === null && week.ends_at) return "encerrada";
  return "futura";
}

const DEFAULT_CRITERIA: Record<number, { description: string; points: number }[]> = {
  1: [
    { description: "Ideia cadastrada e votação participada", points: 10 },
    { description: "Grupo formado com 5 membros", points: 10 },
    { description: "Reunião de alinhamento realizada", points: 10 },
  ],
  2: [
    { description: "BMC preenchido e entregue", points: 10 },
    { description: "5 entrevistas de validação realizadas", points: 10 },
    { description: "Hipótese principal definida", points: 10 },
  ],
  3: [
    { description: "Pitch apresentado na reunião", points: 10 },
    { description: "MVP definido com escopo claro", points: 10 },
    { description: "Primeira versão construída", points: 10 },
  ],
  4: [
    { description: "MVP testado com pessoas externas", points: 10 },
    { description: "3 pontos de melhoria implementados", points: 10 },
    { description: "Material de apresentação iniciado", points: 10 },
  ],
  5: [
    { description: "Canal de aquisição testado", points: 10 },
    { description: "Tentativa real de venda realizada", points: 10 },
    { description: "Métricas registradas", points: 10 },
  ],
  6: [
    { description: "Apresentação final entregue", points: 10 },
    { description: "Carta de transformação escrita", points: 10 },
    { description: "Próximo passo definido por cada membro", points: 10 },
  ],
};

export default function AdminWeeksPage() {
  const { t } = useTranslation();

  const STATUS_BADGE: Record<WeekStatus, { label: string; className: string }> = {
    futura: { label: t("common.inactive"), className: "bg-secondary text-secondary-foreground" },
    ativa: { label: t("common.active_f"), className: "bg-primary text-primary-foreground" },
    encerrada: { label: t("adminWeeks.inProgress"), className: "bg-muted text-muted-foreground" },
  };

  const [weeks, setWeeks] = useState<Week[]>([]);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [entryCounts, setEntryCounts] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);

  const [activateTarget, setActivateTarget] = useState<Week | null>(null);
  const [activating, setActivating] = useState(false);
  const [showAdvance, setShowAdvance] = useState(false);
  const [advanceStep, setAdvanceStep] = useState(0);
  const [advancing, setAdvancing] = useState(false);
  const [editTarget, setEditTarget] = useState<Week | null>(null);
  const [editForm, setEditForm] = useState({ title: "", theme: "", starts_at: null as Date | null, ends_at: null as Date | null });
  const [saving, setSaving] = useState(false);

  // Criteria management
  const [criteriaWeek, setCriteriaWeek] = useState<Week | null>(null);
  const [criteriaForm, setCriteriaForm] = useState({ description: "", points: "10" });
  const [editCriterionId, setEditCriterionId] = useState<string | null>(null);
  const [savingCriterion, setSavingCriterion] = useState(false);
  const [deleteCriterion, setDeleteCriterion] = useState<Criterion | null>(null);

  const loadWeeks = useCallback(async () => {
    setLoading(true);
    const [weeksRes, criteriaRes, entriesRes] = await Promise.all([
      supabase.from("weeks").select("*").order("number", { ascending: true }),
      supabase.from("checklist_criteria").select("*"),
      supabase.from("checklist_entries").select("criterion_id"),
    ]);
    setWeeks(weeksRes.data ?? []);
    setCriteria(criteriaRes.data ?? []);

    const counts = new Map<string, number>();
    (entriesRes.data ?? []).forEach((e) => {
      if (e.criterion_id) counts.set(e.criterion_id, (counts.get(e.criterion_id) ?? 0) + 1);
    });
    setEntryCounts(counts);
    setLoading(false);
  }, []);

  useEffect(() => { loadWeeks(); }, [loadWeeks]);

  const activeWeek = weeks.find((w) => w.is_active) ?? null;
  const activeNumber = activeWeek?.number ?? null;
  const challengeFinished = activeNumber === null && weeks.some((w) => w.ends_at) && weeks.every((w) => !w.is_active);
  const isLastWeek = activeNumber === 6;

  // Activate
  const handleActivate = async () => {
    if (!activateTarget) return;
    setActivating(true);
    await supabase.from("weeks").update({ is_active: false }).neq("id", activateTarget.id);
    const now = new Date().toISOString().split("T")[0];
    const { error } = await supabase.from("weeks")
      .update({ is_active: true, starts_at: activateTarget.starts_at ?? now, ends_at: null })
      .eq("id", activateTarget.id);
    if (error) toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    else {
      // Auto-populate criteria if none exist for this week
      const weekCriteria = criteria.filter((c) => c.week_id === activateTarget.id);
      if (weekCriteria.length === 0) {
        const defaults = DEFAULT_CRITERIA[activateTarget.number] ?? [];
        if (defaults.length > 0) {
          await supabase.from("checklist_criteria").insert(
            defaults.map((d) => ({ week_id: activateTarget.id, description: d.description, points: d.points }))
          );
        }
      }
      toast({ title: t("adminWeeks.activateTitle", { number: activateTarget.number }) + "!" });
      await loadWeeks();
    }
    setActivating(false);
    setActivateTarget(null);
  };

  // Advance
  const handleAdvance = async () => {
    if (!activeWeek) return;
    setAdvancing(true);
    const now = new Date().toISOString().split("T")[0];
    await supabase.from("weeks").update({ is_active: false, ends_at: now }).eq("id", activeWeek.id);
    const next = weeks.find((w) => w.number === activeWeek.number + 1);
    if (next) {
      await supabase.from("weeks").update({ is_active: true, starts_at: now }).eq("id", next.id);
      // Auto-populate criteria for next week
      const nextCriteria = criteria.filter((c) => c.week_id === next.id);
      if (nextCriteria.length === 0) {
        const defaults = DEFAULT_CRITERIA[next.number] ?? [];
        if (defaults.length > 0) {
          await supabase.from("checklist_criteria").insert(
            defaults.map((d) => ({ week_id: next.id, description: d.description, points: d.points }))
          );
        }
      }
      toast({ title: t("adminWeeks.advanceTitle_next", { number: next.number }) });
    } else {
      toast({ title: t("adminWeeks.challengeEnded") });
    }
    await loadWeeks();
    setAdvancing(false);
    setShowAdvance(false);
    setAdvanceStep(0);
  };

  // Edit week
  const openEdit = (week: Week) => {
    setEditTarget(week);
    setEditForm({
      title: week.title,
      theme: week.theme ?? "",
      starts_at: week.starts_at ? new Date(week.starts_at + "T00:00:00") : null,
      ends_at: week.ends_at ? new Date(week.ends_at + "T00:00:00") : null,
    });
  };

  const handleSaveEdit = async () => {
    if (!editTarget) return;
    setSaving(true);
    const { error } = await supabase.from("weeks").update({
      title: editForm.title,
      theme: editForm.theme || null,
      starts_at: editForm.starts_at ? format(editForm.starts_at, "yyyy-MM-dd") : null,
      ends_at: editForm.ends_at ? format(editForm.ends_at, "yyyy-MM-dd") : null,
    }).eq("id", editTarget.id);
    if (error) toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    else { toast({ title: t("adminWeeks.editTitle", { number: editTarget.number }) }); await loadWeeks(); }
    setSaving(false);
    setEditTarget(null);
  };

  // Criteria
  const openCriteria = (week: Week) => {
    setCriteriaWeek(week);
    setCriteriaForm({ description: "", points: "10" });
    setEditCriterionId(null);
  };

  const weekCriteria = criteriaWeek ? criteria.filter((c) => c.week_id === criteriaWeek.id) : [];
  const weekHasEntries = weekCriteria.some((c) => (entryCounts.get(c.id) ?? 0) > 0);

  const handleSaveCriterion = async () => {
    if (!criteriaWeek || !criteriaForm.description.trim()) return;
    setSavingCriterion(true);
    const payload = {
      week_id: criteriaWeek.id,
      description: criteriaForm.description.trim(),
      points: parseInt(criteriaForm.points) || 10,
    };
    if (editCriterionId) {
      const { error } = await supabase.from("checklist_criteria").update(payload).eq("id", editCriterionId);
      if (error) toast({ title: t("common.error"), description: error.message, variant: "destructive" });
      else toast({ title: t("adminWeeks.toastCriterionSaved") });
    } else {
      const { error } = await supabase.from("checklist_criteria").insert(payload);
      if (error) toast({ title: t("common.error"), description: error.message, variant: "destructive" });
      else toast({ title: t("adminWeeks.toastCriterionSaved") });
    }
    setCriteriaForm({ description: "", points: "10" });
    setEditCriterionId(null);
    setSavingCriterion(false);
    await loadWeeks();
  };

  const handleDeleteCriterion = async () => {
    if (!deleteCriterion) return;
    await supabase.from("checklist_criteria").delete().eq("id", deleteCriterion.id);
    toast({ title: t("adminWeeks.toastCriterionDeleted") });
    setDeleteCriterion(null);
    await loadWeeks();
  };

  const populateDefaults = async () => {
    if (!criteriaWeek) return;
    const defaults = DEFAULT_CRITERIA[criteriaWeek.number] ?? [];
    if (defaults.length === 0) return;
    await supabase.from("checklist_criteria").insert(
      defaults.map((d) => ({ week_id: criteriaWeek.id, description: d.description, points: d.points }))
    );
    toast({ title: t("adminWeeks.fillSuggested") });
    await loadWeeks();
  };

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    return format(new Date(d + "T00:00:00"), "dd/MM/yyyy");
  };

  return (
    <DashboardLayout title={t("adminWeeks.title")}>
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {activeWeek && (
          <Badge className="bg-primary text-primary-foreground text-sm px-3 py-1">
            {t("adminWeeks.activeWeek", { number: activeWeek.number, title: activeWeek.title })}
          </Badge>
        )}
        <div className="flex-1" />
        {activeWeek && !isLastWeek && (
          <Button variant="outline" size="sm" onClick={() => { setShowAdvance(true); setAdvanceStep(0); }} className="gap-1.5">
            <ChevronRight className="h-4 w-4" /> {t("adminWeeks.advanceWeek")}
          </Button>
        )}
        {isLastWeek && activeWeek && (
          <Button variant="outline" size="sm" onClick={() => { setShowAdvance(true); setAdvanceStep(0); }} className="gap-1.5">
            <Trophy className="h-4 w-4" /> {t("adminWeeks.endChallenge")}
          </Button>
        )}
        {challengeFinished && (
          <Badge variant="secondary" className="text-sm px-3 py-1 gap-1.5">
            <Trophy className="h-4 w-4" /> {t("adminWeeks.challengeEnded")}
          </Badge>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="glass-card p-6 space-y-3">
              <div className="skeleton-loading h-6 w-32" />
              <div className="skeleton-loading h-4 w-48" />
              <div className="skeleton-loading h-4 w-40" />
            </div>
          ))}
        </div>
      ) : weeks.length === 0 ? (
        <div className="glass-card p-8 text-center text-muted-foreground">{t("adminWeeks.noWeeks")}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {weeks.map((week) => {
            const status = getWeekStatus(week, activeNumber);
            const badge = STATUS_BADGE[status];
            const wCriteria = criteria.filter((c) => c.week_id === week.id);

            return (
              <div
                key={week.id}
                className={cn(
                  "glass-card p-6 space-y-4 transition-all",
                  status === "ativa" && "ring-2 ring-primary/50 bg-primary/5",
                  status === "encerrada" && "opacity-60"
                )}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{t("common.week")} {week.number}</p>
                    <h3 className="text-foreground font-semibold mt-1">{week.title}</h3>
                  </div>
                  <Badge className={cn("text-xs", badge.className)}>{badge.label}</Badge>
                </div>
                {week.theme && <p className="text-sm text-muted-foreground">{t("adminWeeks.fieldTheme")}: {week.theme}</p>}
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>{t("adminWeeks.fieldStart")}: {formatDate(week.starts_at)}</span>
                  <span>{t("adminWeeks.fieldEnd")}: {formatDate(week.ends_at)}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  <ClipboardCheck className="h-3 w-3 inline mr-1" />
                  {wCriteria.length} {t("adminWeeks.criteria")} · {t("common.points", { count: wCriteria.reduce((s, c) => s + (c.points ?? 0), 0) })}
                </div>

                <div className="flex gap-2 pt-1 flex-wrap">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(week)} className="gap-1 text-xs">
                    <Pencil className="h-3 w-3" /> {t("common.edit")}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => openCriteria(week)} className="gap-1 text-xs">
                    <ClipboardCheck className="h-3 w-3" /> {t("adminWeeks.criteria")}
                  </Button>
                  {status === "futura" && (
                    <Button size="sm" variant="outline" onClick={() => setActivateTarget(week)} className="gap-1 text-xs">
                      <Play className="h-3 w-3" /> {t("adminWeeks.activate")}
                    </Button>
                  )}
                  {status === "encerrada" && (
                    <Button size="sm" variant="outline" onClick={() => setActivateTarget(week)} className="gap-1 text-xs">
                      <Play className="h-3 w-3" /> {t("adminWeeks.reactivate")}
                    </Button>
                  )}
                  {status === "ativa" && (
                    <Badge variant="outline" className="gap-1 text-xs border-primary/30 text-primary">
                      <CheckCircle2 className="h-3 w-3" /> {t("adminWeeks.inProgress")}
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Activate */}
      <Dialog open={!!activateTarget} onOpenChange={(o) => !o && setActivateTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("adminWeeks.activateTitle", { number: activateTarget?.number })}</DialogTitle>
            <DialogDescription>
              {t("adminWeeks.activateDescription", { number: activateTarget?.number })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setActivateTarget(null)}>{t("common.cancel")}</Button>
            <Button onClick={handleActivate} disabled={activating}>
              {activating && <Loader2 className="h-4 w-4 animate-spin mr-2" />} {t("common.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Advance */}
      <Dialog open={showAdvance} onOpenChange={(o) => { if (!o) { setShowAdvance(false); setAdvanceStep(0); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {advanceStep === 0
                ? (isLastWeek ? t("adminWeeks.advanceTitle_end") : t("adminWeeks.advanceTitle_next", { number: (activeWeek?.number ?? 0) + 1 }))
                : t("adminWeeks.absolutelySure")}
            </DialogTitle>
            <DialogDescription>
              {advanceStep === 0
                ? t("adminWeeks.advanceDescription", { number: activeWeek?.number, consequence: isLastWeek ? t("adminWeeks.advanceConsequence_end") : t("adminWeeks.advanceConsequence_next", { nextNumber: (activeWeek?.number ?? 0) + 1 }) })
                : t("adminWeeks.finalConfirmation")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setShowAdvance(false); setAdvanceStep(0); }}>{t("common.cancel")}</Button>
            {advanceStep === 0 ? (
              <Button variant="destructive" onClick={() => setAdvanceStep(1)}>{t("common.continue")}</Button>
            ) : (
              <Button variant="destructive" onClick={handleAdvance} disabled={advancing}>
                {advancing && <Loader2 className="h-4 w-4 animate-spin mr-2" />} {t("common.confirm")}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Week */}
      <Dialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("adminWeeks.editTitle", { number: editTarget?.number })}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">{t("adminWeeks.fieldTitle")}</label>
              <Input value={editForm.title} onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">{t("adminWeeks.fieldTheme")}</label>
              <Textarea value={editForm.theme} onChange={(e) => setEditForm((p) => ({ ...p, theme: e.target.value }))} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <DateField label={t("adminWeeks.fieldStart")} value={editForm.starts_at} onChange={(d) => setEditForm((p) => ({ ...p, starts_at: d ?? null }))} />
              <DateField label={t("adminWeeks.fieldEnd")} value={editForm.ends_at} onChange={(d) => setEditForm((p) => ({ ...p, ends_at: d ?? null }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditTarget(null)}>{t("common.cancel")}</Button>
            <Button onClick={handleSaveEdit} disabled={saving || !editForm.title.trim()}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />} {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Criteria Management */}
      <Dialog open={!!criteriaWeek} onOpenChange={(o) => !o && setCriteriaWeek(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("adminWeeks.criteriaSheetTitle", { number: criteriaWeek?.number })}</DialogTitle>
            <DialogDescription>
              {weekHasEntries
                ? t("adminWeeks.criteriaReadOnly")
                : t("adminWeeks.criteriaHint")}
            </DialogDescription>
          </DialogHeader>

          {/* Existing criteria */}
          <div className="space-y-2">
            {weekCriteria.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">{t("adminWeeks.noCriteria")}</p>
            ) : (
              weekCriteria.map((c) => (
                <div key={c.id} className="flex items-center gap-2 p-3 rounded-lg bg-secondary/30">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">{c.description}</p>
                    <p className="text-xs text-muted-foreground">{c.points} pts</p>
                  </div>
                  {!weekHasEntries && (
                    <div className="flex gap-1 shrink-0">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => {
                        setEditCriterionId(c.id);
                        setCriteriaForm({ description: c.description ?? "", points: String(c.points ?? 10) });
                      }}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteCriterion(c)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Add/edit form */}
          {!weekHasEntries && (
            <div className="space-y-3 border-t border-border pt-4">
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-medium">
                  {editCriterionId ? t("adminWeeks.editCriterion") : t("adminWeeks.newCriterion")}
                </label>
                <Input
                  placeholder={t("adminWeeks.criterionDescription")}
                  value={criteriaForm.description}
                  onChange={(e) => setCriteriaForm((p) => ({ ...p, description: e.target.value }))}
                />
              </div>
              <div className="flex gap-2">
                <div className="space-y-1.5 w-24">
                  <label className="text-xs text-muted-foreground font-medium">{t("adminWeeks.criterionPoints")}</label>
                  <Input
                    type="number"
                    value={criteriaForm.points}
                    onChange={(e) => setCriteriaForm((p) => ({ ...p, points: e.target.value }))}
                  />
                </div>
                <div className="flex items-end gap-2 flex-1">
                  <Button size="sm" onClick={handleSaveCriterion} disabled={savingCriterion || !criteriaForm.description.trim()}>
                    {savingCriterion && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                    {editCriterionId ? t("common.save") : t("common.add")}
                  </Button>
                  {editCriterionId && (
                    <Button size="sm" variant="ghost" onClick={() => { setEditCriterionId(null); setCriteriaForm({ description: "", points: "10" }); }}>
                      {t("common.cancel")}
                    </Button>
                  )}
                </div>
              </div>
              {weekCriteria.length === 0 && (
                <Button variant="outline" size="sm" onClick={populateDefaults} className="w-full gap-1">
                  <Plus className="h-3 w-3" /> {t("adminWeeks.fillSuggested")}
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete criterion */}
      <AlertDialog open={!!deleteCriterion} onOpenChange={(o) => !o && setDeleteCriterion(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("adminWeeks.deleteCriterionTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("adminWeeks.deleteCriterionDescription", { description: deleteCriterion?.description })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCriterion} className="bg-destructive text-destructive-foreground">{t("common.remove")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}

function DateField({ label, value, onChange }: { label: string; value: Date | null; onChange: (d: Date | undefined) => void }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-1.5">
      <label className="text-xs text-muted-foreground font-medium">{label}</label>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !value && "text-muted-foreground")}>
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value ? format(value, "dd/MM/yyyy") : t("adminActivities.selectDate")}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={value ?? undefined} onSelect={onChange} initialFocus className="p-3 pointer-events-auto" />
        </PopoverContent>
      </Popover>
    </div>
  );
}
