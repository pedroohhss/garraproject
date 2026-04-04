import { useEffect, useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Star, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";

interface RankedIdea {
  id: string;
  title: string;
  category: string | null;
  created_by: string | null;
  authorName: string;
  totalVotes: number;
  avgRating: number;
  voteCount: number;
}

const MAX_GROUPS = 15;

export default function RankingPage() {
  const { profile } = useAuth();
  const [ideas, setIdeas] = useState<RankedIdea[]>([]);
  const [config, setConfig] = useState<{ voting_open: boolean; groups_confirmed: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [tieDialogOpen, setTieDialogOpen] = useState(false);
  const [tiedIdeas, setTiedIdeas] = useState<RankedIdea[]>([]);
  const [tieSlots, setTieSlots] = useState(0);
  const [tieSelected, setTieSelected] = useState<Set<string>>(new Set());

  const isAdmin = profile?.role === "admin";

  useEffect(() => {
    const load = async () => {
      try {
        const [ideasRes, votesRes, configRes] = await Promise.all([
          supabase.from("ideas").select("id, title, category, created_by, created_at").order("created_at", { ascending: false }),
          supabase.from("votes").select("*"),
          supabase.from("challenge_config").select("voting_open, groups_confirmed").limit(1).maybeSingle(),
        ]);

        const rawIdeas = ideasRes.data ?? [];
        const allVotes = votesRes.data ?? [];

        setConfig(configRes.data ? {
          voting_open: configRes.data.voting_open ?? false,
          groups_confirmed: configRes.data.groups_confirmed ?? false,
        } : null);

        // Compute vote totals
        const voteCountMap = new Map<string, number>();
        const voteSumMap = new Map<string, number>();
        allVotes.forEach((v) => {
          if (v.idea_id) {
            voteCountMap.set(v.idea_id, (voteCountMap.get(v.idea_id) ?? 0) + 1);
            voteSumMap.set(v.idea_id, (voteSumMap.get(v.idea_id) ?? 0) + (v.quantity ?? 1));
          }
        });

        // Author names
        const authorIds = [...new Set(rawIdeas.map((i) => i.created_by).filter(Boolean))] as string[];
        let nameMap = new Map<string, string>();
        if (authorIds.length > 0) {
          const { data: usersData } = await supabase.from("users_public" as any).select("id, full_name").in("id", authorIds) as { data: { id: string; full_name: string }[] | null };
          nameMap = new Map((usersData ?? []).map((u) => [u.id, u.full_name]));
        }

        const ranked: RankedIdea[] = rawIdeas.map((i) => {
          const count = voteCountMap.get(i.id) ?? 0;
          const sum = voteSumMap.get(i.id) ?? 0;
          return {
            id: i.id,
            title: i.title,
            category: i.category,
            created_by: i.created_by,
            authorName: i.created_by ? nameMap.get(i.created_by) ?? "Desconhecido" : "Desconhecido",
            totalVotes: sum,
            avgRating: count > 0 ? sum / count : 0,
            voteCount: count,
          };
        }).sort((a, b) => b.totalVotes - a.totalVotes || b.avgRating - a.avgRating);

        setIdeas(ranked);
      } catch {
        setIdeas([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const canConfirm = isAdmin && config && !config.voting_open && !config.groups_confirmed;

  const handleConfirmClick = () => {
    // Check for ties at position 15
    if (ideas.length <= MAX_GROUPS) {
      setConfirmDialogOpen(true);
      return;
    }

    const cutoffScore = ideas[MAX_GROUPS - 1].totalVotes;
    const ideasAtCutoff = ideas.filter((i) => i.totalVotes === cutoffScore);
    const ideasAboveCutoff = ideas.filter((i) => i.totalVotes > cutoffScore);
    const slotsForTied = MAX_GROUPS - ideasAboveCutoff.length;

    if (ideasAtCutoff.length > slotsForTied) {
      // Tie exists
      setTiedIdeas(ideasAtCutoff);
      setTieSlots(slotsForTied);
      setTieSelected(new Set());
      setTieDialogOpen(true);
    } else {
      setConfirmDialogOpen(true);
    }
  };

  const getSelectedIdeas = (): RankedIdea[] => {
    if (ideas.length <= MAX_GROUPS) return ideas;

    if (tieSelected.size > 0) {
      const cutoffScore = ideas[MAX_GROUPS - 1].totalVotes;
      const above = ideas.filter((i) => i.totalVotes > cutoffScore);
      const tied = ideas.filter((i) => i.totalVotes === cutoffScore && tieSelected.has(i.id));
      return [...above, ...tied].slice(0, MAX_GROUPS);
    }

    return ideas.slice(0, MAX_GROUPS);
  };

  const executeConfirmation = async () => {
    setConfirming(true);
    try {
      const selected = getSelectedIdeas();

      for (const idea of selected) {
        // Create group
        const { data: group, error: groupErr } = await supabase
          .from("groups")
          .insert({ name: idea.title, idea_id: idea.id, leader_id: idea.created_by })
          .select("id")
          .single();
        if (groupErr) throw groupErr;

        // Add creator as fundador
        if (idea.created_by) {
          const { error: memberErr } = await supabase
            .from("group_members")
            .insert({
              group_id: group.id,
              user_id: idea.created_by,
              cargo: "fundador" as any,
            });
          if (memberErr) throw memberErr;

          // Update user's group_id
          await supabase.from("users").update({ group_id: group.id }).eq("id", idea.created_by);
        }
      }

      // Update config
      const { data: cfgData } = await supabase.from("challenge_config").select("id").limit(1).single();
      if (cfgData) {
        await supabase.from("challenge_config").update({ groups_confirmed: true }).eq("id", cfgData.id);
      }

      setConfig((prev) => prev ? { ...prev, groups_confirmed: true } : prev);
      toast({ title: `${selected.length} grupos criados com sucesso!` });
      setConfirmDialogOpen(false);
      setTieDialogOpen(false);
    } catch (err: any) {
      toast({ title: "Erro ao confirmar grupos", description: err.message, variant: "destructive" });
    } finally {
      setConfirming(false);
    }
  };

  const toggleTieSelection = (id: string) => {
    setTieSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < tieSlots) {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <DashboardLayout title="Ranking de Ideias">
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-muted-foreground">
          {ideas.length} {ideas.length === 1 ? "ideia" : "ideias"} · Top {MAX_GROUPS} viram grupos
        </p>
        {canConfirm && (
          <Button onClick={handleConfirmClick} disabled={confirming || ideas.length === 0}>
            {confirming && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            <CheckCircle2 className="h-4 w-4 mr-1.5" />
            Confirmar os {Math.min(MAX_GROUPS, ideas.length)} grupos
          </Button>
        )}
        {config?.groups_confirmed && (
          <Badge variant="default" className="gap-1">
            <CheckCircle2 className="h-3 w-3" /> Grupos confirmados
          </Badge>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="glass-card p-4 flex items-center gap-4">
              <div className="skeleton-loading h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="skeleton-loading h-4 w-3/4" />
                <div className="skeleton-loading h-3 w-1/4" />
              </div>
            </div>
          ))}
        </div>
      ) : ideas.length === 0 ? (
        <div className="glass-card p-12 flex flex-col items-center text-center space-y-3">
          <Trophy className="h-10 w-10 text-muted-foreground" />
          <p className="text-muted-foreground">Nenhuma ideia cadastrada ainda.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {ideas.map((idea, index) => {
            const isClassified = index < MAX_GROUPS;
            const position = index + 1;

            return (
              <div
                key={idea.id}
                className={`glass-card p-4 flex items-center gap-4 transition-all ${
                  isClassified ? "ring-1 ring-primary/20" : "opacity-70"
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                  position <= 3
                    ? "bg-primary text-primary-foreground"
                    : isClassified
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}>
                  {position}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium text-foreground truncate">{idea.title}</h3>
                    {idea.category && (
                      <Badge variant="secondary" className="text-[10px] capitalize shrink-0">{idea.category}</Badge>
                    )}
                    {isClassified && (
                      <Badge variant="default" className="text-[10px] shrink-0">
                        <Trophy className="h-2.5 w-2.5 mr-0.5" /> Classificada
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    por {idea.authorName}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex items-center gap-1 text-sm">
                    <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                    <span className="font-medium text-foreground">{idea.totalVotes}</span>
                    <span className="text-xs text-muted-foreground">pts</span>
                  </div>
                  {idea.voteCount > 0 && (
                    <span className="text-xs text-muted-foreground">
                      ({idea.avgRating.toFixed(1)} ★ · {idea.voteCount})
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirm dialog */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar formação dos grupos?</AlertDialogTitle>
            <AlertDialogDescription>
              Serão criados {Math.min(MAX_GROUPS, ideas.length)} grupos a partir das ideias mais votadas.
              Os criadores de cada ideia serão adicionados automaticamente como Fundadores.
              Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={confirming}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={executeConfirmation} disabled={confirming}>
              {confirming && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Tie resolution dialog */}
      <Dialog open={tieDialogOpen} onOpenChange={setTieDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Empate detectado
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Há {tiedIdeas.length} ideias empatadas na posição de corte com a mesma pontuação.
            Selecione {tieSlots} para completar os {MAX_GROUPS} grupos.
          </p>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {tiedIdeas.map((idea) => (
              <label
                key={idea.id}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  tieSelected.has(idea.id) ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"
                }`}
              >
                <Checkbox
                  checked={tieSelected.has(idea.id)}
                  onCheckedChange={() => toggleTieSelection(idea.id)}
                  disabled={!tieSelected.has(idea.id) && tieSelected.size >= tieSlots}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{idea.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {idea.totalVotes} pts · por {idea.authorName}
                  </p>
                </div>
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button
              onClick={() => { setTieDialogOpen(false); setConfirmDialogOpen(true); }}
              disabled={tieSelected.size !== tieSlots}
              className="w-full"
            >
              Confirmar seleção ({tieSelected.size}/{tieSlots})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
