import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";

interface Week { id: string; number: number; title: string; is_active: boolean }
interface Criterion { id: string; week_id: string | null; description: string | null; points: number | null }

export default function AdminChecklistPage() {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [selectedWeekId, setSelectedWeekId] = useState("");
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasSubmissions, setHasSubmissions] = useState<Set<string>>(new Set());

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Criterion | null>(null);
  const [formDesc, setFormDesc] = useState("");
  const [formPoints, setFormPoints] = useState("");
  const [saving, setSaving] = useState(false);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<Criterion | null>(null);

  const loadWeeks = useCallback(async () => {
    const { data } = await supabase.from("weeks").select("id, number, title, is_active").order("number");
    const wks = data ?? [];
    setWeeks(wks);
    const active = wks.find((w) => w.is_active);
    setSelectedWeekId(active?.id ?? wks[0]?.id ?? "");
  }, []);

  useEffect(() => { loadWeeks(); }, [loadWeeks]);

  const loadCriteria = useCallback(async () => {
    if (!selectedWeekId) return;
    setLoading(true);

    const [criteriaRes, entriesRes] = await Promise.all([
      supabase.from("checklist_criteria").select("*").eq("week_id", selectedWeekId).order("description"),
      supabase.from("checklist_entries").select("criterion_id"),
    ]);

    setCriteria(criteriaRes.data ?? []);

    const submittedIds = new Set<string>();
    (entriesRes.data ?? []).forEach((e: any) => {
      if (e.criterion_id) submittedIds.add(e.criterion_id);
    });
    setHasSubmissions(submittedIds);
    setLoading(false);
  }, [selectedWeekId]);

  useEffect(() => { loadCriteria(); }, [loadCriteria]);

  const openCreate = () => {
    setEditing(null);
    setFormDesc("");
    setFormPoints("");
    setDialogOpen(true);
  };

  const openEdit = (c: Criterion) => {
    setEditing(c);
    setFormDesc(c.description ?? "");
    setFormPoints(String(c.points ?? ""));
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formDesc.trim() || !formPoints.trim()) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await supabase.from("checklist_criteria").update({
          description: formDesc.trim(),
          points: parseInt(formPoints),
        }).eq("id", editing.id);
        toast({ title: "Critério atualizado" });
      } else {
        await supabase.from("checklist_criteria").insert({
          week_id: selectedWeekId,
          description: formDesc.trim(),
          points: parseInt(formPoints),
        });
        toast({ title: "Critério criado" });
      }
      setDialogOpen(false);
      await loadCriteria();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from("checklist_criteria").delete().eq("id", deleteTarget.id);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Critério excluído" });
      await loadCriteria();
    }
    setDeleteTarget(null);
  };

  const maxPoints = criteria.reduce((s, c) => s + (c.points ?? 0), 0);

  return (
    <DashboardLayout title="Gerenciar Checklist">
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <Select value={selectedWeekId} onValueChange={setSelectedWeekId}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Selecionar semana" />
          </SelectTrigger>
          <SelectContent>
            {weeks.map((w) => (
              <SelectItem key={w.id} value={w.id}>
                Semana {w.number} — {w.title} {w.is_active ? "(Ativa)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex-1" />

        {criteria.length > 0 && (
          <span className="text-sm text-muted-foreground">{criteria.length} critérios · {maxPoints} pts máx</span>
        )}

        <Button size="sm" onClick={openCreate} className="gap-1.5">
          <Plus className="h-4 w-4" /> Novo critério
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card p-5 space-y-2">
              <div className="skeleton-loading h-5 w-3/4" />
              <div className="skeleton-loading h-4 w-24" />
            </div>
          ))}
        </div>
      ) : criteria.length === 0 ? (
        <div className="glass-card p-8 text-center text-muted-foreground">
          Nenhum critério definido para esta semana. Clique em "Novo critério" para começar.
        </div>
      ) : (
        <div className="space-y-3">
          {criteria.map((c) => {
            const locked = hasSubmissions.has(c.id);
            return (
              <div key={c.id} className="glass-card p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{c.description}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{c.points} pontos</p>
                </div>
                {locked && (
                  <Badge variant="outline" className="text-xs text-muted-foreground shrink-0">
                    Tem entregas
                  </Badge>
                )}
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(c)} title="Editar">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteTarget(c)}
                    disabled={locked}
                    title={locked ? "Não pode excluir — já tem entregas" : "Excluir"}
                    className={cn(locked && "opacity-40")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar critério" : "Novo critério"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Descrição</label>
              <Input
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                placeholder="Ex: BMC preenchido e entregue"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Pontos</label>
              <Input
                type="number"
                value={formPoints}
                onChange={(e) => setFormPoints(e.target.value)}
                placeholder="10"
                min={1}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="gap-1.5">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir critério?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.description}" será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
