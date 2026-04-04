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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronRight,
  Loader2,
  Pencil,
  Play,
  Trophy,
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

export default function AdminWeeksPage() {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [loading, setLoading] = useState(true);

  // Activate dialog
  const [activateTarget, setActivateTarget] = useState<Week | null>(null);
  const [activating, setActivating] = useState(false);

  // Advance dialog (double confirm)
  const [showAdvance, setShowAdvance] = useState(false);
  const [advanceStep, setAdvanceStep] = useState(0); // 0=first confirm, 1=second confirm
  const [advancing, setAdvancing] = useState(false);

  // Edit dialog
  const [editTarget, setEditTarget] = useState<Week | null>(null);
  const [editForm, setEditForm] = useState({ title: "", theme: "", starts_at: null as Date | null, ends_at: null as Date | null });
  const [saving, setSaving] = useState(false);

  const loadWeeks = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("weeks")
      .select("*")
      .order("number", { ascending: true });
    if (error) {
      toast({ title: "Erro ao carregar semanas", variant: "destructive" });
    } else {
      setWeeks(data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadWeeks(); }, [loadWeeks]);

  const activeWeek = weeks.find((w) => w.is_active) ?? null;
  const activeNumber = activeWeek?.number ?? null;
  const challengeFinished = activeNumber === null && weeks.some((w) => w.ends_at) && weeks.every((w) => !w.is_active);
  const isLastWeek = activeNumber === 6;

  // ── Activate ──
  const handleActivate = async () => {
    if (!activateTarget) return;
    setActivating(true);
    // Deactivate all, then activate target
    const { error: deactErr } = await supabase
      .from("weeks")
      .update({ is_active: false })
      .neq("id", activateTarget.id);
    if (deactErr) {
      toast({ title: "Erro", description: deactErr.message, variant: "destructive" });
      setActivating(false);
      return;
    }
    const now = new Date().toISOString().split("T")[0];
    const { error } = await supabase
      .from("weeks")
      .update({ is_active: true, starts_at: activateTarget.starts_at ?? now })
      .eq("id", activateTarget.id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Semana ${activateTarget.number} ativada!` });
      await loadWeeks();
    }
    setActivating(false);
    setActivateTarget(null);
  };

  // ── Advance ──
  const handleAdvance = async () => {
    if (!activeWeek) return;
    setAdvancing(true);
    const now = new Date().toISOString().split("T")[0];

    // End current
    const { error: endErr } = await supabase
      .from("weeks")
      .update({ is_active: false, ends_at: now })
      .eq("id", activeWeek.id);
    if (endErr) {
      toast({ title: "Erro", description: endErr.message, variant: "destructive" });
      setAdvancing(false);
      return;
    }

    // Activate next
    const next = weeks.find((w) => w.number === activeWeek.number + 1);
    if (next) {
      const { error: nextErr } = await supabase
        .from("weeks")
        .update({ is_active: true, starts_at: now })
        .eq("id", next.id);
      if (nextErr) {
        toast({ title: "Erro", description: nextErr.message, variant: "destructive" });
      } else {
        toast({ title: `Avançou para Semana ${next.number}!` });
      }
    } else {
      toast({ title: "Desafio encerrado!", description: "Todas as semanas foram concluídas." });
    }

    await loadWeeks();
    setAdvancing(false);
    setShowAdvance(false);
    setAdvanceStep(0);
  };

  // ── Edit ──
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
    const { error } = await supabase
      .from("weeks")
      .update({
        title: editForm.title,
        theme: editForm.theme || null,
        starts_at: editForm.starts_at ? format(editForm.starts_at, "yyyy-MM-dd") : null,
        ends_at: editForm.ends_at ? format(editForm.ends_at, "yyyy-MM-dd") : null,
      })
      .eq("id", editTarget.id);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Semana atualizada" });
      await loadWeeks();
    }
    setSaving(false);
    setEditTarget(null);
  };

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    return format(new Date(d + "T00:00:00"), "dd/MM/yyyy");
  };

  return (
    <DashboardLayout title="Gestão de Semanas">
      {/* Header actions */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {activeWeek && (
          <Badge className="bg-primary text-primary-foreground text-sm px-3 py-1">
            Semana ativa: {activeWeek.number} — {activeWeek.title}
          </Badge>
        )}
        <div className="flex-1" />
        {activeWeek && !isLastWeek && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setShowAdvance(true); setAdvanceStep(0); }}
            className="gap-1.5"
          >
            <ChevronRight className="h-4 w-4" /> Avançar semana
          </Button>
        )}
        {isLastWeek && activeWeek && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setShowAdvance(true); setAdvanceStep(0); }}
            className="gap-1.5"
          >
            <Trophy className="h-4 w-4" /> Encerrar desafio
          </Button>
        )}
        {challengeFinished && (
          <Badge variant="secondary" className="text-sm px-3 py-1 gap-1.5">
            <Trophy className="h-4 w-4" /> Desafio encerrado
          </Badge>
        )}
      </div>

      {/* Week cards */}
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
        <div className="glass-card p-8 text-center text-muted-foreground">
          Nenhuma semana cadastrada ainda.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {weeks.map((week) => {
            const status = getWeekStatus(week, activeNumber);
            const badge = STATUS_BADGE[status];
            const isEncerrada = status === "encerrada";

            return (
              <div
                key={week.id}
                className={cn(
                  "glass-card p-6 space-y-4 transition-all",
                  status === "ativa" && "ring-2 ring-primary/50",
                  isEncerrada && "opacity-60"
                )}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                      Semana {week.number}
                    </p>
                    <h3 className="text-foreground font-semibold mt-1">{week.title}</h3>
                  </div>
                  <Badge className={cn("text-xs", badge.className)}>{badge.label}</Badge>
                </div>

                {week.theme && (
                  <p className="text-sm text-muted-foreground">Tema: {week.theme}</p>
                )}

                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>Início: {formatDate(week.starts_at)}</span>
                  <span>Fim: {formatDate(week.ends_at)}</span>
                </div>

                <div className="flex gap-2 pt-1">
                  {!isEncerrada && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEdit(week)}
                      className="gap-1 text-xs"
                    >
                      <Pencil className="h-3 w-3" /> Editar
                    </Button>
                  )}
                  {status === "futura" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setActivateTarget(week)}
                      className="gap-1 text-xs"
                    >
                      <Play className="h-3 w-3" /> Ativar
                    </Button>
                  )}
                  {status === "ativa" && (
                    <Badge variant="outline" className="gap-1 text-xs border-primary/30 text-primary">
                      <CheckCircle2 className="h-3 w-3" /> Em andamento
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Activate Confirm Dialog ── */}
      <Dialog open={!!activateTarget} onOpenChange={(o) => !o && setActivateTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ativar Semana {activateTarget?.number}?</DialogTitle>
            <DialogDescription>
              Isso vai desativar qualquer outra semana ativa e tornar a Semana {activateTarget?.number} — "{activateTarget?.title}" a semana atual do desafio.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setActivateTarget(null)}>Cancelar</Button>
            <Button onClick={handleActivate} disabled={activating}>
              {activating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Advance Double Confirm Dialog ── */}
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
                ? `A Semana ${activeWeek?.number} será encerrada. ${isLastWeek ? "O desafio será finalizado." : `A Semana ${(activeWeek?.number ?? 0) + 1} será ativada.`} Esta ação não pode ser desfeita.`
                : "Esta é a confirmação final. Clique em Confirmar para prosseguir."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setShowAdvance(false); setAdvanceStep(0); }}>Cancelar</Button>
            {advanceStep === 0 ? (
              <Button variant="destructive" onClick={() => setAdvanceStep(1)}>
                Continuar
              </Button>
            ) : (
              <Button variant="destructive" onClick={handleAdvance} disabled={advancing}>
                {advancing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Confirmar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Dialog ── */}
      <Dialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Semana {editTarget?.number}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">Título</label>
              <Input
                value={editForm.title}
                onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">Tema</label>
              <Textarea
                value={editForm.theme}
                onChange={(e) => setEditForm((p) => ({ ...p, theme: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <DateField
                label="Data de início"
                value={editForm.starts_at}
                onChange={(d) => setEditForm((p) => ({ ...p, starts_at: d }))}
              />
              <DateField
                label="Data de encerramento"
                value={editForm.ends_at}
                onChange={(d) => setEditForm((p) => ({ ...p, ends_at: d }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditTarget(null)}>Cancelar</Button>
            <Button onClick={handleSaveEdit} disabled={saving || !editForm.title.trim()}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

function DateField({ label, value, onChange }: { label: string; value: Date | null; onChange: (d: Date | undefined) => void }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs text-muted-foreground font-medium">{label}</label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn("w-full justify-start text-left font-normal", !value && "text-muted-foreground")}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value ? format(value, "dd/MM/yyyy") : "Selecionar"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value ?? undefined}
            onSelect={onChange}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
