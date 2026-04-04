import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Calendar as CalendarIcon, CheckCircle2, ChevronRight, Loader2,
  Pencil, Play, Trophy, BookOpen, ClipboardList, PackageCheck, FileUp,
} from "lucide-react";

interface Week {
  id: string;
  number: number;
  title: string;
  theme: string | null;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
}

type WeekStatus = "futura" | "ativa" | "encerrada";

function getWeekStatus(week: Week, activeNumber: number | null): WeekStatus {
  if (week.is_active) return "ativa";
  if (activeNumber !== null && week.number < activeNumber) return "encerrada";
  if (activeNumber === null && week.ends_at) return "encerrada";
  return "futura";
}

const STATUS_BADGE: Record<WeekStatus, { label: string; className: string }> = {
  futura: { label: "Futura", className: "bg-secondary text-secondary-foreground" },
  ativa: { label: "Ativa", className: "bg-primary text-primary-foreground" },
  encerrada: { label: "Encerrada", className: "bg-muted text-muted-foreground" },
};

export default function WeeksListPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const isAdmin = profile?.role === "admin";
  const rolePrefix = profile?.role === "admin" ? "/admin" : profile?.role === "lider" ? "/lider" : "/participante";

  const [weeks, setWeeks] = useState<Week[]>([]);
  const [loading, setLoading] = useState(true);

  // Admin-only state
  const [activateTarget, setActivateTarget] = useState<Week | null>(null);
  const [activating, setActivating] = useState(false);
  const [showAdvance, setShowAdvance] = useState(false);
  const [advanceStep, setAdvanceStep] = useState(0);
  const [advancing, setAdvancing] = useState(false);
  const [editTarget, setEditTarget] = useState<Week | null>(null);
  const [editForm, setEditForm] = useState({ title: "", theme: "", starts_at: null as Date | null, ends_at: null as Date | null });
  const [saving, setSaving] = useState(false);

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

  const loadWeeks = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("weeks").select("*").order("number", { ascending: true });
    setWeeks(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { loadWeeks(); }, [loadWeeks]);

  const activeWeek = weeks.find((w) => w.is_active) ?? null;
  const activeNumber = activeWeek?.number ?? null;
  const challengeFinished = activeNumber === null && weeks.some((w) => w.ends_at) && weeks.every((w) => !w.is_active);
  const isLastWeek = activeNumber === 6;

  const handleActivate = async () => {
    if (!activateTarget) return;
    setActivating(true);
    await supabase.from("weeks").update({ is_active: false }).neq("id", activateTarget.id);
    const now = new Date().toISOString().split("T")[0];
    await supabase.from("weeks")
      .update({ is_active: true, starts_at: activateTarget.starts_at ?? now, ends_at: null })
      .eq("id", activateTarget.id);
    // Auto-populate criteria
    const { data: existingCriteria } = await supabase.from("checklist_criteria").select("id").eq("week_id", activateTarget.id);
    if ((existingCriteria ?? []).length === 0) {
      const defaults = DEFAULT_CRITERIA[activateTarget.number] ?? [];
      if (defaults.length > 0) {
        await supabase.from("checklist_criteria").insert(
          defaults.map((d) => ({ week_id: activateTarget.id, description: d.description, points: d.points }))
        );
      }
    }
    toast({ title: `Semana ${activateTarget.number} ativada!` });
    await loadWeeks();
    setActivating(false);
    setActivateTarget(null);
  };

  const handleAdvance = async () => {
    if (!activeWeek) return;
    setAdvancing(true);
    const now = new Date().toISOString().split("T")[0];
    await supabase.from("weeks").update({ is_active: false, ends_at: now }).eq("id", activeWeek.id);
    const next = weeks.find((w) => w.number === activeWeek.number + 1);
    if (next) {
      await supabase.from("weeks").update({ is_active: true, starts_at: now }).eq("id", next.id);
      const { data: existingCriteria } = await supabase.from("checklist_criteria").select("id").eq("week_id", next.id);
      if ((existingCriteria ?? []).length === 0) {
        const defaults = DEFAULT_CRITERIA[next.number] ?? [];
        if (defaults.length > 0) {
          await supabase.from("checklist_criteria").insert(
            defaults.map((d) => ({ week_id: next.id, description: d.description, points: d.points }))
          );
        }
      }
      toast({ title: `Avançou para Semana ${next.number}!` });
    } else {
      toast({ title: "Desafio encerrado!" });
    }
    await loadWeeks();
    setAdvancing(false);
    setShowAdvance(false);
    setAdvanceStep(0);
  };

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
    await supabase.from("weeks").update({
      title: editForm.title,
      theme: editForm.theme || null,
      starts_at: editForm.starts_at ? format(editForm.starts_at, "yyyy-MM-dd") : null,
      ends_at: editForm.ends_at ? format(editForm.ends_at, "yyyy-MM-dd") : null,
    }).eq("id", editTarget.id);
    toast({ title: "Semana atualizada" });
    await loadWeeks();
    setSaving(false);
    setEditTarget(null);
  };

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    return format(new Date(d + "T00:00:00"), "dd/MM/yyyy");
  };

  return (
    <DashboardLayout title="Semanas">
      {/* Admin controls */}
      {isAdmin && (
        <div className="flex flex-wrap items-center gap-3 mb-6">
          {activeWeek && (
            <Badge className="bg-primary text-primary-foreground text-sm px-3 py-1">
              Semana ativa: {activeWeek.number} — {activeWeek.title}
            </Badge>
          )}
          <div className="flex-1" />
          {activeWeek && !isLastWeek && (
            <Button variant="outline" size="sm" onClick={() => { setShowAdvance(true); setAdvanceStep(0); }} className="gap-1.5">
              <ChevronRight className="h-4 w-4" /> Avançar semana
            </Button>
          )}
          {isLastWeek && activeWeek && (
            <Button variant="outline" size="sm" onClick={() => { setShowAdvance(true); setAdvanceStep(0); }} className="gap-1.5">
              <Trophy className="h-4 w-4" /> Encerrar desafio
            </Button>
          )}
          {challengeFinished && (
            <Badge variant="secondary" className="text-sm px-3 py-1 gap-1.5">
              <Trophy className="h-4 w-4" /> Desafio encerrado
            </Badge>
          )}
        </div>
      )}

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
        <div className="glass-card p-8 text-center text-muted-foreground">Nenhuma semana cadastrada.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {weeks.map((week) => {
            const status = getWeekStatus(week, activeNumber);
            const badge = STATUS_BADGE[status];

            const featurePills = [
              { icon: BookOpen, label: "Materiais" },
              { icon: FileUp, label: "Entregas" },
              { icon: ClipboardList, label: "Checklist" },
              { icon: PackageCheck, label: "Atividades" },
            ];

            return (
              <div
                key={week.id}
                onClick={() => navigate(`${rolePrefix}/semanas/${week.id}`)}
                className={cn(
                  "glass-card p-6 flex flex-col gap-4 transition-all cursor-pointer group",
                  "hover:bg-secondary/20 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5",
                  status === "ativa" && "ring-2 ring-primary/50 bg-primary/5",
                  status === "encerrada" && "opacity-60"
                )}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Semana {week.number}</p>
                    <h3 className="text-foreground font-semibold mt-1 leading-snug">{week.title}</h3>
                    {week.theme && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{week.theme}</p>
                    )}
                  </div>
                  <Badge className={cn("text-xs shrink-0", badge.className)}>{badge.label}</Badge>
                </div>

                {/* Feature pills */}
                <div className="flex flex-wrap gap-1.5">
                  {featurePills.map(({ icon: Icon, label }) => (
                    <span
                      key={label}
                      className="flex items-center gap-1 text-[11px] text-muted-foreground bg-secondary/40 border border-border px-2 py-0.5 rounded-full"
                    >
                      <Icon className="h-3 w-3" />
                      {label}
                    </span>
                  ))}
                </div>

                {/* Footer: dates + CTA */}
                <div className="flex items-center justify-between mt-auto pt-1 border-t border-border/50">
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    <span>{formatDate(week.starts_at)}{week.ends_at ? ` → ${formatDate(week.ends_at)}` : ""}</span>
                  </div>
                  <span className={cn(
                    "flex items-center gap-1 text-xs font-medium transition-colors",
                    status === "ativa" ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                  )}>
                    {status === "ativa" ? "Acessar" : "Ver conteúdo"}
                    <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>

                {/* Admin controls */}
                {isAdmin && (
                  <div className="flex gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
                    <Button size="sm" variant="ghost" onClick={() => openEdit(week)} className="gap-1 text-xs">
                      <Pencil className="h-3 w-3" /> Editar
                    </Button>
                    {status === "futura" && (
                      <Button size="sm" variant="outline" onClick={() => setActivateTarget(week)} className="gap-1 text-xs">
                        <Play className="h-3 w-3" /> Ativar
                      </Button>
                    )}
                    {status === "encerrada" && (
                      <Button size="sm" variant="outline" onClick={() => setActivateTarget(week)} className="gap-1 text-xs">
                        <Play className="h-3 w-3" /> Reativar
                      </Button>
                    )}
                    {status === "ativa" && (
                      <Badge variant="outline" className="gap-1 text-xs border-primary/30 text-primary">
                        <CheckCircle2 className="h-3 w-3" /> Em andamento
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Activate Dialog */}
      {isAdmin && (
        <>
          <Dialog open={!!activateTarget} onOpenChange={(o) => !o && setActivateTarget(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ativar Semana {activateTarget?.number}?</DialogTitle>
                <DialogDescription>
                  Isso vai desativar qualquer outra semana ativa e tornar a Semana {activateTarget?.number} a semana atual.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setActivateTarget(null)}>Cancelar</Button>
                <Button onClick={handleActivate} disabled={activating}>
                  {activating && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Confirmar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={showAdvance} onOpenChange={(o) => { if (!o) { setShowAdvance(false); setAdvanceStep(0); } }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {advanceStep === 0
                    ? (isLastWeek ? "Encerrar desafio?" : `Avançar para Semana ${(activeWeek?.number ?? 0) + 1}?`)
                    : "Tem certeza absoluta?"}
                </DialogTitle>
                <DialogDescription>
                  {advanceStep === 0
                    ? `A Semana ${activeWeek?.number} será encerrada. ${isLastWeek ? "O desafio será finalizado." : `A Semana ${(activeWeek?.number ?? 0) + 1} será ativada.`}`
                    : "Confirmação final."}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="ghost" onClick={() => { setShowAdvance(false); setAdvanceStep(0); }}>Cancelar</Button>
                {advanceStep === 0 ? (
                  <Button variant="destructive" onClick={() => setAdvanceStep(1)}>Continuar</Button>
                ) : (
                  <Button variant="destructive" onClick={handleAdvance} disabled={advancing}>
                    {advancing && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Confirmar
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
            <DialogContent>
              <DialogHeader><DialogTitle>Editar Semana {editTarget?.number}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground font-medium">Título</label>
                  <Input value={editForm.title} onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground font-medium">Tema</label>
                  <Textarea value={editForm.theme} onChange={(e) => setEditForm((p) => ({ ...p, theme: e.target.value }))} rows={2} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <DateField label="Início" value={editForm.starts_at} onChange={(d) => setEditForm((p) => ({ ...p, starts_at: d }))} />
                  <DateField label="Encerramento" value={editForm.ends_at} onChange={(d) => setEditForm((p) => ({ ...p, ends_at: d }))} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setEditTarget(null)}>Cancelar</Button>
                <Button onClick={handleSaveEdit} disabled={saving || !editForm.title.trim()}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Salvar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </DashboardLayout>
  );
}

function DateField({ label, value, onChange }: { label: string; value: Date | null; onChange: (d: Date | undefined) => void }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs text-muted-foreground font-medium">{label}</label>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !value && "text-muted-foreground")}>
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value ? format(value, "dd/MM/yyyy") : "Selecionar"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={value ?? undefined} onSelect={onChange} initialFocus className="p-3 pointer-events-auto" />
        </PopoverContent>
      </Popover>
    </div>
  );
}
