import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Users, UserPlus, Loader2, Trash2, Plus, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import CargoSelectDialog, { CARGOS } from "@/components/CargoSelectDialog";

interface GroupMember {
  user_id: string;
  cargo: string;
  full_name: string;
}

interface GroupData {
  id: string;
  name: string;
  idea_id: string | null;
  ideaTitle?: string;
  ideaDescription?: string | null;
  members: GroupMember[];
}

interface UnselectedIdea {
  id: string;
  title: string;
  totalVotes: number;
  created_by: string | null;
}

const MAX_PER_GROUP = 5;
const MAX_GROUPS = 15;
const REQUIRED_CARGOS = ["fundador", "estrategista", "construtor"];

export default function GroupsPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [config, setConfig] = useState<{ joining_open: boolean; groups_confirmed: boolean } | null>(null);
  const [userMembership, setUserMembership] = useState<{ group_id: string; cargo: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailGroup, setDetailGroup] = useState<GroupData | null>(null);

  // Cargo dialog
  const [cargoDialogOpen, setCargoDialogOpen] = useState(false);
  const [cargoTargetGroup, setCargoTargetGroup] = useState<GroupData | null>(null);

  // Admin management
  const [unselectedIdeas, setUnselectedIdeas] = useState<UnselectedIdea[]>([]);
  const [removeDialogGroup, setRemoveDialogGroup] = useState<GroupData | null>(null);
  const [removing, setRemoving] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const isAdmin = profile?.role === "admin";

  const fetchData = useCallback(async () => {
    try {
      const [groupsRes, membersRes, configRes, ideasRes, votesRes] = await Promise.all([
        supabase.from("groups").select("id, name, idea_id"),
        supabase.from("group_members").select("group_id, user_id, cargo"),
        supabase.from("challenge_config").select("joining_open, groups_confirmed").limit(1).maybeSingle(),
        supabase.from("ideas").select("id, title, description, created_by"),
        supabase.from("votes").select("idea_id, quantity"),
      ]);

      const rawGroups = groupsRes.data ?? [];
      const allMembers = (membersRes.data ?? []) as { group_id: string; user_id: string; cargo: string }[];
      const allIdeas = ideasRes.data ?? [];
      const allVotes = votesRes.data ?? [];

      setConfig(configRes.data ? {
        joining_open: configRes.data.joining_open ?? false,
        groups_confirmed: configRes.data.groups_confirmed ?? false,
      } : null);

      if (user) {
        const myMembership = allMembers.find((m) => m.user_id === user.id);
        setUserMembership(myMembership ? { group_id: myMembership.group_id, cargo: myMembership.cargo } : null);
      }

      // Get all user names
      const memberUserIds = [...new Set(allMembers.map((m) => m.user_id))];
      let nameMap = new Map<string, string>();
      if (memberUserIds.length > 0) {
        const { data: usersData } = await supabase.from("users_public" as any).select("id, full_name").in("id", memberUserIds) as { data: { id: string; full_name: string }[] | null };
        nameMap = new Map((usersData ?? []).map((u) => [u.id, u.full_name]));
      }

      const ideaMap = new Map(allIdeas.map((i) => [i.id, i]));

      const membersByGroup = new Map<string, GroupMember[]>();
      allMembers.forEach((m) => {
        const list = membersByGroup.get(m.group_id) ?? [];
        list.push({ user_id: m.user_id, cargo: m.cargo, full_name: nameMap.get(m.user_id) ?? "—" });
        membersByGroup.set(m.group_id, list);
      });

      const enriched: GroupData[] = rawGroups.map((g) => {
        const idea = g.idea_id ? ideaMap.get(g.idea_id) : null;
        return {
          ...g,
          ideaTitle: idea?.title,
          ideaDescription: idea?.description,
          members: membersByGroup.get(g.id) ?? [],
        };
      });

      setGroups(enriched);

      // Compute unselected ideas (ideas that don't have a group yet)
      const groupIdeaIds = new Set(rawGroups.map((g) => g.idea_id).filter(Boolean));
      const voteSumMap = new Map<string, number>();
      allVotes.forEach((v) => {
        if (v.idea_id) {
          voteSumMap.set(v.idea_id, (voteSumMap.get(v.idea_id) ?? 0) + (v.quantity ?? 1));
        }
      });
      const unselected = allIdeas
        .filter((i) => !groupIdeaIds.has(i.id))
        .map((i) => ({ id: i.id, title: i.title, totalVotes: voteSumMap.get(i.id) ?? 0, created_by: i.created_by }))
        .sort((a, b) => b.totalVotes - a.totalVotes);
      setUnselectedIdeas(unselected);
    } catch {
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    const timeout = setTimeout(() => setLoading(false), 8000);
    fetchData().finally(() => clearTimeout(timeout));
  }, [fetchData]);

  const canJoin = config?.joining_open && config?.groups_confirmed;

  const handleJoinClick = (group: GroupData, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    if (userMembership) {
      toast({ title: "Você já pertence a um grupo", variant: "destructive" });
      return;
    }
    if (group.members.length >= MAX_PER_GROUP) {
      toast({ title: "Grupo já está cheio (5 membros)", variant: "destructive" });
      return;
    }
    setCargoTargetGroup(group);
    setCargoDialogOpen(true);
  };

  const handleConfirmCargo = async (cargo: string) => {
    if (!user || !cargoTargetGroup) return;
    const { error } = await supabase.from("group_members").insert({
      group_id: cargoTargetGroup.id,
      user_id: user.id,
      cargo,
    } as any);
    if (error) throw error;
    await supabase.from("users").update({ group_id: cargoTargetGroup.id }).eq("id", user.id);
    toast({ title: "Você entrou no grupo!" });
    setLoading(true);
    await fetchData();
  };

  // Admin: remove a group
  const handleRemoveGroup = async () => {
    if (!removeDialogGroup) return;
    setRemoving(true);
    try {
      // Delete members first, then the group
      await supabase.from("group_members").delete().eq("group_id", removeDialogGroup.id);
      // Reset users' group_id
      for (const m of removeDialogGroup.members) {
        await supabase.from("users").update({ group_id: null }).eq("id", m.user_id);
      }
      const { error } = await supabase.from("groups").delete().eq("id", removeDialogGroup.id);
      if (error) throw error;
      toast({ title: `Grupo "${removeDialogGroup.name}" removido` });
      setRemoveDialogGroup(null);
      setLoading(true);
      await fetchData();
    } catch (err: any) {
      toast({ title: "Erro ao remover grupo", description: err.message, variant: "destructive" });
    } finally {
      setRemoving(false);
    }
  };

  // Admin: add a group from an unselected idea
  const handleAddGroup = async (idea: UnselectedIdea) => {
    if (groups.length >= MAX_GROUPS) {
      toast({ title: `Limite de ${MAX_GROUPS} grupos atingido`, variant: "destructive" });
      return;
    }
    setAdding(idea.id);
    try {
      const { data: group, error: groupErr } = await supabase
        .from("groups")
        .insert({ name: idea.title, idea_id: idea.id, leader_id: idea.created_by })
        .select("id")
        .single();
      if (groupErr) throw groupErr;

      if (idea.created_by) {
        await supabase.from("group_members").insert({
          group_id: group.id,
          user_id: idea.created_by,
          cargo: "fundador" as any,
        });
        await supabase.from("users").update({ group_id: group.id }).eq("id", idea.created_by);
      }

      toast({ title: `Grupo "${idea.title}" adicionado` });
      setAddDialogOpen(false);
      setLoading(true);
      await fetchData();
    } catch (err: any) {
      toast({ title: "Erro ao adicionar grupo", description: err.message, variant: "destructive" });
    } finally {
      setAdding(null);
    }
  };

  // Admin: confirm all groups (set groups_confirmed = true)
  const handleConfirmGroups = async () => {
    setConfirming(true);
    try {
      const { data: cfgData } = await supabase.from("challenge_config").select("id").limit(1).single();
      if (cfgData) {
        await supabase.from("challenge_config").update({ groups_confirmed: true }).eq("id", cfgData.id);
      }
      setConfig((prev) => prev ? { ...prev, groups_confirmed: true } : prev);
      toast({ title: "Grupos confirmados com sucesso!" });
      setConfirmDialogOpen(false);
    } catch (err: any) {
      toast({ title: "Erro ao confirmar", description: err.message, variant: "destructive" });
    } finally {
      setConfirming(false);
    }
  };

  return (
    <DashboardLayout title="Grupos">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <p className="text-sm text-muted-foreground">
          {groups.length} {groups.length === 1 ? "grupo" : "grupos"}
          {groups.length > 0 && ` · Limite: ${MAX_GROUPS}`}
        </p>

        {/* Admin actions */}
        {isAdmin && groups.length > 0 && !config?.groups_confirmed && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setAddDialogOpen(true)} disabled={groups.length >= MAX_GROUPS}>
              <Plus className="h-3.5 w-3.5" /> Adicionar grupo
            </Button>
            <Button size="sm" className="gap-1.5" onClick={() => setConfirmDialogOpen(true)}>
              <CheckCircle2 className="h-3.5 w-3.5" /> Confirmar grupos
            </Button>
          </div>
        )}

        {config?.groups_confirmed && (
          <Badge variant="default" className="gap-1">
            <CheckCircle2 className="h-3 w-3" /> Grupos confirmados
          </Badge>
        )}
      </div>

      {/* Admin warning banner */}
      {isAdmin && groups.length > 0 && !config?.groups_confirmed && (
        <div className="glass-card p-4 mb-6 flex items-start gap-3 border-yellow-500/30 bg-yellow-500/5">
          <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">Revise os grupos antes de confirmar</p>
            <p className="text-xs text-muted-foreground mt-1">
              Você pode remover grupos indesejados e adicionar outros a partir de ideias não selecionadas.
              Após confirmar, os participantes poderão entrar nos grupos.
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="glass-card p-6 space-y-3">
              <div className="skeleton-loading h-5 w-3/4" />
              <div className="skeleton-loading h-4 w-1/2" />
              <div className="skeleton-loading h-4 w-full" />
            </div>
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="glass-card p-12 flex flex-col items-center text-center space-y-3">
          <Users className="h-10 w-10 text-muted-foreground" />
          <p className="text-muted-foreground">Nenhum grupo formado ainda.</p>
          <p className="text-xs text-muted-foreground">Os grupos serão criados automaticamente quando a votação for encerrada.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {groups.map((group) => {
            const occupiedCargos = group.members.map((m) => m.cargo);
            const missingRequired = REQUIRED_CARGOS.filter((c) => !occupiedCargos.includes(c));
            const isFull = group.members.length >= MAX_PER_GROUP;
            const isMyGroup = userMembership?.group_id === group.id;

            return (
              <div
                key={group.id}
                className={`glass-card p-6 space-y-3 cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all ${
                  isMyGroup ? "ring-1 ring-primary/40" : ""
                }`}
                onClick={() => setDetailGroup(group)}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-foreground font-medium">{group.name}</h3>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge variant={isFull ? "secondary" : "default"} className="text-xs">
                      {group.members.length}/{MAX_PER_GROUP}
                    </Badge>
                    {/* Admin: remove button (only before confirmation) */}
                    {isAdmin && !config?.groups_confirmed && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={(e) => { e.stopPropagation(); setRemoveDialogGroup(group); }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>

                {group.ideaTitle && (
                  <p className="text-xs text-muted-foreground">Ideia: {group.ideaTitle}</p>
                )}

                {/* Cargo slots */}
                <div className="flex flex-wrap gap-1.5">
                  {CARGOS.map((cargo) => {
                    const member = group.members.find((m) => m.cargo === cargo.value);
                    const Icon = cargo.icon;
                    return (
                      <div
                        key={cargo.value}
                        className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border ${
                          member
                            ? "bg-primary/10 border-primary/30 text-primary"
                            : cargo.required
                            ? "bg-destructive/10 border-destructive/30 text-destructive"
                            : "bg-muted border-border text-muted-foreground"
                        }`}
                      >
                        <Icon className="h-3 w-3" />
                        <span>{member ? member.full_name.split(" ")[0] : "Vago"}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Join button (only after confirmation + joining_open) */}
                {canJoin && (
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      variant={isMyGroup ? "secondary" : "default"}
                      size="sm"
                      className="h-8 text-xs gap-1.5"
                      onClick={(e) => handleJoinClick(group, e)}
                      disabled={!!userMembership || isFull}
                      title={
                        isMyGroup ? "Você já está neste grupo"
                          : userMembership ? "Você já pertence a outro grupo"
                          : isFull ? "Grupo cheio"
                          : "Entrar neste grupo"
                      }
                    >
                      {isMyGroup ? <Users className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
                      {isMyGroup ? "Meu grupo" : "Entrar"}
                    </Button>

                    {missingRequired.length > 0 && (
                      <span className="text-[10px] text-destructive">
                        Falta: {missingRequired.map((c) => c.charAt(0).toUpperCase() + c.slice(1)).join(", ")}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Cargo selection dialog */}
      {cargoTargetGroup && (
        <CargoSelectDialog
          open={cargoDialogOpen}
          onOpenChange={setCargoDialogOpen}
          occupiedCargos={cargoTargetGroup.members.map((m) => m.cargo)}
          onConfirm={handleConfirmCargo}
          groupName={cargoTargetGroup.name}
        />
      )}

      {/* Detail dialog */}
      <Dialog open={!!detailGroup} onOpenChange={(open) => { if (!open) setDetailGroup(null); }}>
        <DialogContent className="sm:max-w-lg">
          {detailGroup && (
            <>
              <DialogHeader>
                <DialogTitle>{detailGroup.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                {detailGroup.ideaTitle && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Ideia original</p>
                    <p className="text-sm text-foreground font-medium">{detailGroup.ideaTitle}</p>
                    {detailGroup.ideaDescription && (
                      <p className="text-sm text-muted-foreground mt-1">{detailGroup.ideaDescription}</p>
                    )}
                  </div>
                )}

                <div>
                  <p className="text-xs text-muted-foreground mb-2">
                    Membros ({detailGroup.members.length}/{MAX_PER_GROUP})
                  </p>
                  {detailGroup.members.length > 0 ? (
                    <div className="space-y-1.5">
                      {detailGroup.members.map((member) => {
                        const cargoInfo = CARGOS.find((c) => c.value === member.cargo);
                        return (
                          <div
                            key={member.user_id}
                            className="flex items-center gap-2 text-sm cursor-pointer hover:opacity-80"
                            onClick={() => navigate(`/perfil/${member.user_id}`)}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                            <span className="text-foreground">{member.full_name}</span>
                            <Badge variant={cargoInfo?.required ? "default" : "secondary"} className="text-[10px] px-1.5 py-0 capitalize">
                              {cargoInfo?.label ?? member.cargo}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhum membro ainda.</p>
                  )}
                </div>

                {/* Vacant cargos */}
                {(() => {
                  const vacant = CARGOS.filter((c) => c.required && !detailGroup.members.some((m) => m.cargo === c.value));
                  if (vacant.length === 0) return null;
                  return (
                    <div>
                      <p className="text-xs text-destructive mb-1">Cargos obrigatórios vagos:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {vacant.map((c) => {
                          const Icon = c.icon;
                          return (
                            <span key={c.value} className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-destructive/10 border border-destructive/30 text-destructive">
                              <Icon className="h-3 w-3" /> {c.label}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Remove group confirmation */}
      <AlertDialog open={!!removeDialogGroup} onOpenChange={(open) => { if (!open) setRemoveDialogGroup(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover grupo?</AlertDialogTitle>
            <AlertDialogDescription>
              O grupo "{removeDialogGroup?.name}" será removido e seus membros desvinculados. 
              Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveGroup} disabled={removing} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {removing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add group from unselected ideas */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar grupo</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Selecione uma ideia para criar um novo grupo ({groups.length}/{MAX_GROUPS}).
          </p>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {unselectedIdeas.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Todas as ideias já possuem grupo.</p>
            ) : (
              unselectedIdeas.map((idea) => (
                <div key={idea.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-primary/40 transition-all">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{idea.title}</p>
                    <p className="text-xs text-muted-foreground">{idea.totalVotes} pts</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0 h-8 text-xs gap-1"
                    onClick={() => handleAddGroup(idea)}
                    disabled={adding === idea.id || groups.length >= MAX_GROUPS}
                  >
                    {adding === idea.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                    Adicionar
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm groups dialog */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar {groups.length} grupos?</AlertDialogTitle>
            <AlertDialogDescription>
              Após a confirmação, os participantes poderão entrar nos grupos (quando "Entrada nos grupos" estiver ativa).
              Você poderá continuar gerenciando os grupos depois.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={confirming}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmGroups} disabled={confirming}>
              {confirming && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
