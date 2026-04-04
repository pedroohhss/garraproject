import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  AlertTriangle, CheckCircle2, Clock, ExternalLink, FileText, Loader2, MessageSquare, Send, Trophy,
} from "lucide-react";

interface Activity {
  id: string;
  title: string | null;
  description: string | null;
  week_id: string | null;
  deadline: string | null;
  delivery_type: string | null;
  is_required: boolean | null;
}

interface Delivery {
  id: string;
  activity_id: string | null;
  group_id: string | null;
  submitted_by: string | null;
  submitted_at: string | null;
  content_text: string | null;
  content_link: string | null;
  content_file_url: string | null;
  admin_feedback: string | null;
  admin_score: number | null;
}

interface GroupInfo {
  id: string;
  name: string;
}

interface Week {
  id: string;
  number: number;
  title: string;
  is_active: boolean;
}

type CellStatus = "entregue" | "pendente" | "atrasado";

function getCellStatus(activity: Activity, delivery: Delivery | undefined): CellStatus {
  if (delivery) return "entregue";
  if (activity.deadline && new Date(activity.deadline) < new Date()) return "atrasado";
  return "pendente";
}

const CELL_STYLES: Record<CellStatus, string> = {
  entregue: "bg-primary/10 text-primary",
  pendente: "bg-secondary text-muted-foreground",
  atrasado: "bg-destructive/10 text-destructive",
};

export default function DeliveryTrackingPage() {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [selectedWeekId, setSelectedWeekId] = useState("");
  const [activities, setActivities] = useState<Activity[]>([]);
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);

  // Detail sheet
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<GroupInfo | null>(null);
  const [feedback, setFeedback] = useState("");
  const [score, setScore] = useState("");
  const [savingFeedback, setSavingFeedback] = useState(false);

  const loadWeeks = useCallback(async () => {
    const { data } = await supabase.from("weeks").select("id, number, title, is_active").order("number");
    const wks = data ?? [];
    setWeeks(wks);
    const active = wks.find((w) => w.is_active);
    if (active) setSelectedWeekId(active.id);
    else if (wks.length > 0) setSelectedWeekId(wks[0].id);
  }, []);

  useEffect(() => { loadWeeks(); }, [loadWeeks]);

  const loadData = useCallback(async () => {
    if (!selectedWeekId) return;
    setLoading(true);
    const [activitiesRes, groupsRes, deliveriesRes] = await Promise.all([
      supabase.from("activities").select("*").eq("week_id", selectedWeekId).order("deadline"),
      supabase.from("groups").select("id, name").order("name"),
      supabase.from("deliveries").select("*"),
    ]);
    setActivities(activitiesRes.data ?? []);
    setGroups(groupsRes.data ?? []);
    setDeliveries((deliveriesRes.data ?? []) as Delivery[]);
    setLoading(false);
  }, [selectedWeekId]);

  useEffect(() => { loadData(); }, [loadData]);

  const getDelivery = (activityId: string, groupId: string) =>
    deliveries.find((d) => d.activity_id === activityId && d.group_id === groupId);

  const openDetail = (activity: Activity, group: GroupInfo) => {
    const del = getDelivery(activity.id, group.id);
    setSelectedActivity(activity);
    setSelectedGroup(group);
    setSelectedDelivery(del ?? null);
    setFeedback(del?.admin_feedback ?? "");
    setScore(del?.admin_score != null ? String(del.admin_score) : "");
  };

  const handleSaveFeedback = async () => {
    if (!selectedDelivery) return;
    const parsedScore = score.trim() === "" ? null : parseInt(score, 10);
    if (parsedScore !== null && (isNaN(parsedScore) || parsedScore < 0 || parsedScore > 100)) {
      toast({ title: "Nota deve ser entre 0 e 100", variant: "destructive" }); return;
    }
    setSavingFeedback(true);
    const { error } = await supabase
      .from("deliveries")
      .update({ admin_feedback: feedback.trim() || null, admin_score: parsedScore })
      .eq("id", selectedDelivery.id);
    if (error) {
      toast({ title: "Erro ao salvar avaliação", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Avaliação salva" });
      setSelectedDelivery((prev) => prev ? { ...prev, admin_feedback: feedback.trim() || null, admin_score: parsedScore } : prev);
      await loadData();
    }
    setSavingFeedback(false);
  };

  const hasLateDelivery = (groupId: string) =>
    activities.some((a) => getCellStatus(a, getDelivery(a.id, groupId)) === "atrasado");

  const selectedWeek = weeks.find((w) => w.id === selectedWeekId);

  return (
    <DashboardLayout title="Acompanhamento de Entregas">
      <div className="flex items-center gap-3 mb-6">
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
      </div>

      {loading ? (
        <div className="glass-card p-6 space-y-3">
          <div className="skeleton-loading h-8 w-full" />
          <div className="skeleton-loading h-48 w-full" />
        </div>
      ) : activities.length === 0 ? (
        <div className="glass-card p-8 text-center text-muted-foreground">
          Nenhuma atividade nesta semana.
        </div>
      ) : groups.length === 0 ? (
        <div className="glass-card p-8 text-center text-muted-foreground">
          Nenhum grupo cadastrado.
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground sticky left-0 bg-card z-10">
                    Grupo
                  </th>
                  {activities.map((a) => (
                    <th key={a.id} className="text-center px-3 py-3 font-medium text-muted-foreground min-w-[120px]">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-xs">{a.title}</span>
                        {a.is_required && <Badge variant="destructive" className="text-[10px] px-1">Obrig.</Badge>}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {groups.map((group) => {
                  const late = hasLateDelivery(group.id);
                  return (
                    <tr
                      key={group.id}
                      className={cn(
                        "border-b border-border last:border-0",
                        late && "bg-destructive/5"
                      )}
                    >
                      <td className={cn(
                        "px-4 py-3 font-medium text-foreground sticky left-0 bg-card z-10",
                        late && "bg-destructive/5"
                      )}>
                        <div className="flex items-center gap-1.5">
                          {late && <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />}
                          <span className="truncate">{group.name}</span>
                        </div>
                      </td>
                      {activities.map((activity) => {
                        const delivery = getDelivery(activity.id, group.id);
                        const status = getCellStatus(activity, delivery);
                        return (
                          <td key={activity.id} className="px-3 py-3 text-center">
                            <button
                              onClick={() => openDetail(activity, group)}
                              className={cn(
                                "inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full transition-colors hover:opacity-80",
                                CELL_STYLES[status]
                              )}
                            >
                              {status === "entregue" && <CheckCircle2 className="h-3 w-3" />}
                              {status === "pendente" && <Clock className="h-3 w-3" />}
                              {status === "atrasado" && <AlertTriangle className="h-3 w-3" />}
                              {status === "entregue" ? (delivery?.admin_score != null ? `${delivery.admin_score}pts` : "Entregue") : status === "pendente" ? "Pendente" : "Atrasado"}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Detail Sheet ── */}
      <Sheet open={!!selectedActivity && !!selectedGroup} onOpenChange={(o) => {
        if (!o) { setSelectedActivity(null); setSelectedGroup(null); setSelectedDelivery(null); }
      }}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{selectedGroup?.name}</SheetTitle>
          </SheetHeader>

          <div className="mt-4 space-y-4">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Atividade</p>
              <p className="text-sm text-foreground font-medium mt-1">{selectedActivity?.title}</p>
              <p className="text-xs text-muted-foreground mt-1">{selectedActivity?.description}</p>
            </div>

            {selectedDelivery ? (
              <>
                <div className="border-t border-border pt-4 space-y-3">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Entrega</p>
                  <p className="text-xs text-muted-foreground">
                    Enviada em {selectedDelivery.submitted_at ? format(new Date(selectedDelivery.submitted_at), "dd/MM/yyyy 'às' HH:mm") : "—"}
                  </p>

                  {selectedDelivery.content_text && (
                    <div className="bg-secondary/50 rounded-lg p-3">
                      <p className="text-sm text-foreground whitespace-pre-wrap">{selectedDelivery.content_text}</p>
                    </div>
                  )}

                  {selectedDelivery.content_link && (
                    <a
                      href={selectedDelivery.content_link}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-primary hover:underline flex items-center gap-1"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> {selectedDelivery.content_link}
                    </a>
                  )}

                  {selectedDelivery.content_file_url && (
                    <a
                      href={selectedDelivery.content_file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-primary hover:underline flex items-center gap-1"
                    >
                      <FileText className="h-3.5 w-3.5" /> Ver arquivo
                    </a>
                  )}
                </div>

                {/* Feedback */}
                <div className="border-t border-border pt-4 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Feedback do Admin</p>
                  </div>
                  <Textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Escreva seu feedback..."
                    rows={4}
                  />
                  <Button size="sm" onClick={handleSaveFeedback} disabled={savingFeedback} className="gap-1">
                    {savingFeedback && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    <Send className="h-3.5 w-3.5" /> Salvar feedback
                  </Button>
                </div>
              </>
            ) : (
              <div className="border-t border-border pt-4">
                <p className="text-sm text-muted-foreground">Nenhuma entrega realizada por este grupo.</p>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </DashboardLayout>
  );
}
