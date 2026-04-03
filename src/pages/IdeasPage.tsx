import { useEffect, useState, useCallback, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  Lightbulb, Plus, Pencil, Trash2, Loader2, Lock,
  Star, Search, Users, Calendar as CalendarIcon, UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import CargoSelectDialog, { CARGOS } from "@/components/CargoSelectDialog";

interface Idea {
  id: string;
  title: string;
  description: string | null;
  problem: string | null;
  category: string | null;
  created_by: string | null;
  created_at: string | null;
  authorName?: string;
  voteCount: number;
  avgRating: number;
  groupId?: string | null;
  groupName?: string | null;
  groupMembers: GroupMember[];
}

interface GroupMember {
  user_id: string;
  cargo: string;
  full_name: string;
}

interface VoteRow {
  id: string;
  idea_id: string | null;
  user_id: string | null;
  quantity: number | null;
}

const CATEGORIES = [
  { value: "produto", label: "Produto" },
  { value: "serviço", label: "Serviço" },
  { value: "tecnologia", label: "Tecnologia" },
  { value: "educação", label: "Educação" },
  { value: "outro", label: "Outro" },
];

const MAX_IDEAS_PER_USER = 2;
const MAX_VOTES_PER_USER = 5;
const MAX_PER_GROUP = 5;

export default function IdeasPage() {
  const { user, profile } = useAuth();
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [config, setConfig] = useState<{
    ideas_open: boolean;
    voting_open: boolean;
    joining_open: boolean;
    groups_confirmed: boolean;
  } | null>(null);
  const [userVotes, setUserVotes] = useState<VoteRow[]>([]);
  const [userIdeaCount, setUserIdeaCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [detailIdea, setDetailIdea] = useState<Idea | null>(null);
  const [editingIdea, setEditingIdea] = useState<Idea | null>(null);
  const [saving, setSaving] = useState(false);
  const [votingInProgress, setVotingInProgress] = useState<string | null>(null);

  // Cargo selection
  const [cargoDialogOpen, setCargoDialogOpen] = useState(false);
  const [cargoTargetIdea, setCargoTargetIdea] = useState<Idea | null>(null);

  // User's own membership
  const [userMembership, setUserMembership] = useState<{ group_id: string; cargo: string } | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [problem, setProblem] = useState("");

  // Filter state
  const [searchText, setSearchText] = useState("");
  const [filterCategory, setFilterCategory] = useState("todas");

  const isAdmin = profile?.role === "admin";

  const fetchData = useCallback(async () => {
    try {
      const [ideasRes, configRes, votesRes, membersRes] = await Promise.all([
        supabase
          .from("ideas")
          .select("id, title, description, problem, category, created_by, created_at")
          .order("created_at", { ascending: false }),
        supabase
          .from("challenge_config")
          .select("ideas_open, voting_open, joining_open, groups_confirmed")
          .limit(1)
          .maybeSingle(),
        supabase.from("votes").select("*"),
        supabase.from("group_members").select("group_id, user_id, cargo"),
      ]);

      const rawIdeas = ideasRes.data ?? [];
      const allVotes = votesRes.data ?? [];
      const allMembers = (membersRes.data ?? []) as { group_id: string; user_id: string; cargo: string }[];

      setConfig(configRes.data ? {
        ideas_open: configRes.data.ideas_open ?? false,
        voting_open: configRes.data.voting_open ?? false,
        joining_open: configRes.data.joining_open ?? false,
        groups_confirmed: configRes.data.groups_confirmed ?? false,
      } : null);

      if (user) {
        setUserVotes(allVotes.filter((v) => v.user_id === user.id));
        setUserIdeaCount(rawIdeas.filter((i) => i.created_by === user.id).length);
        const myMembership = allMembers.find((m) => m.user_id === user.id);
        setUserMembership(myMembership ? { group_id: myMembership.group_id, cargo: myMembership.cargo } : null);
      }

      // Vote counts/averages
      const voteCountMap = new Map<string, number>();
      const voteSumMap = new Map<string, number>();
      allVotes.forEach((v) => {
        if (v.idea_id) {
          voteCountMap.set(v.idea_id, (voteCountMap.get(v.idea_id) ?? 0) + 1);
          voteSumMap.set(v.idea_id, (voteSumMap.get(v.idea_id) ?? 0) + (v.quantity ?? 1));
        }
      });

      // Author names + member names
      const authorIds = [...new Set(rawIdeas.map((i) => i.created_by).filter(Boolean))] as string[];
      const memberUserIds = [...new Set(allMembers.map((m) => m.user_id))];
      const allUserIds = [...new Set([...authorIds, ...memberUserIds])];
      let nameMap = new Map<string, string>();
      if (allUserIds.length > 0) {
        const { data: usersData } = await supabase.from("users_public" as any).select("id, full_name").in("id", allUserIds) as { data: { id: string; full_name: string }[] | null };
        nameMap = new Map((usersData ?? []).map((u) => [u.id, u.full_name]));
      }

      // Groups linked to ideas
      const { data: groupsData } = await supabase.from("groups").select("id, name, idea_id");
      const groupByIdea = new Map((groupsData ?? []).map((g) => [g.idea_id, { id: g.id, name: g.name }]));

      // Members per group
      const membersByGroup = new Map<string, GroupMember[]>();
      allMembers.forEach((m) => {
        const list = membersByGroup.get(m.group_id) ?? [];
        list.push({ user_id: m.user_id, cargo: m.cargo, full_name: nameMap.get(m.user_id) ?? "—" });
        membersByGroup.set(m.group_id, list);
      });

      const enriched: Idea[] = rawIdeas.map((i) => {
        const group = groupByIdea.get(i.id);
        const count = voteCountMap.get(i.id) ?? 0;
        const sum = voteSumMap.get(i.id) ?? 0;
        return {
          ...i,
          authorName: i.created_by ? nameMap.get(i.created_by) ?? "Desconhecido" : "Desconhecido",
          voteCount: count,
          avgRating: count > 0 ? sum / count : 0,
          groupId: group?.id ?? null,
          groupName: group?.name ?? null,
          groupMembers: group ? (membersByGroup.get(group.id) ?? []) : [],
        };
      });

      setIdeas(enriched);
    } catch {
      setIdeas([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    const timeout = setTimeout(() => setLoading(false), 8000);
    fetchData().finally(() => clearTimeout(timeout));
  }, [fetchData]);

  const filteredIdeas = useMemo(() => {
    let result = ideas;
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      result = result.filter((i) => i.title.toLowerCase().includes(q));
    }
    if (filterCategory !== "todas") {
      result = result.filter((i) => i.category === filterCategory);
    }
    return result;
  }, [ideas, searchText, filterCategory]);

  const totalUserVotes = useMemo(() => userVotes.length, [userVotes]);
  const getUserRating = useCallback(
    (ideaId: string) => userVotes.find((v) => v.idea_id === ideaId)?.quantity ?? 0,
    [userVotes]
  );

  const resetForm = () => {
    setTitle(""); setDescription(""); setCategory(""); setProblem("");
    setEditingIdea(null);
  };
  const openNewDialog = () => { resetForm(); setFormDialogOpen(true); };
  const openEditDialog = (idea: Idea, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingIdea(idea);
    setTitle(idea.title);
    setDescription(idea.description ?? "");
    setCategory(idea.category ?? "");
    setProblem(idea.problem ?? "");
    setFormDialogOpen(true);
  };

  const handleSave = async () => {
    if (!title.trim() || !description.trim() || !category) {
      toast({ title: "Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      if (editingIdea) {
        const { error } = await supabase
          .from("ideas")
          .update({ title: title.trim(), description: description.trim(), category, problem: problem.trim() || null })
          .eq("id", editingIdea.id);
        if (error) throw error;
        toast({ title: "Ideia atualizada" });
      } else {
        const { error } = await supabase.from("ideas").insert({
          title: title.trim(), description: description.trim(), category,
          problem: problem.trim() || null, created_by: user!.id,
        });
        if (error) throw error;
        toast({ title: "Ideia cadastrada" });
      }
      setFormDialogOpen(false);
      resetForm();
      setLoading(true);
      await fetchData();
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const { error } = await supabase.from("ideas").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao remover", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Ideia removida" });
      setIdeas((prev) => prev.filter((i) => i.id !== id));
    }
  };

  const handleStarRate = async (ideaId: string, rating: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || votingInProgress) return;
    if (!config?.voting_open) {
      toast({ title: "Votação fechada", variant: "destructive" });
      return;
    }
    const isOwnIdea = ideas.find((i) => i.id === ideaId)?.created_by === user.id;
    if (isOwnIdea) {
      toast({ title: "Não pode avaliar a própria ideia", variant: "destructive" });
      return;
    }
    setVotingInProgress(ideaId);
    try {
      const existingVote = userVotes.find((v) => v.idea_id === ideaId);
      if (existingVote) {
        await supabase.from("votes").delete().eq("id", existingVote.id);
      }
      const { error } = await supabase.from("votes").insert({
        idea_id: ideaId, user_id: user.id, quantity: rating,
      });
      if (error) throw error;
      await fetchData();
    } catch (err: any) {
      toast({ title: "Erro ao avaliar", description: err.message, variant: "destructive" });
    } finally {
      setVotingInProgress(null);
    }
  };

  // Open cargo selection dialog
  const handleJoinClick = (idea: Idea, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || !idea.groupId) return;
    if (userMembership) {
      toast({ title: "Você já pertence a um grupo", variant: "destructive" });
      return;
    }
    if (idea.groupMembers.length >= MAX_PER_GROUP) {
      toast({ title: "Grupo já está cheio (5 membros)", variant: "destructive" });
      return;
    }
    setCargoTargetIdea(idea);
    setCargoDialogOpen(true);
  };

  const handleConfirmCargo = async (cargo: string) => {
    if (!user || !cargoTargetIdea?.groupId) return;
    const { error } = await supabase.from("group_members").insert({
      group_id: cargoTargetIdea.groupId,
      user_id: user.id,
      cargo,
    } as any);
    if (error) throw error;
    // Also update legacy group_id on users table
    await supabase.from("users").update({ group_id: cargoTargetIdea.groupId }).eq("id", user.id);
    toast({ title: "Você entrou no grupo!" });
    setLoading(true);
    await fetchData();
  };

  const openDetail = (idea: Idea) => {
    setDetailIdea(idea);
  };

  const reachedLimit = userIdeaCount >= MAX_IDEAS_PER_USER;
  const canJoin = config?.joining_open && config?.groups_confirmed;

  // Cargo badge colors
  const cargoColor = (cargo: string) => {
    const info = CARGOS.find((c) => c.value === cargo);
    return info?.required ? "default" : "secondary";
  };

  return (
    <DashboardLayout title="Ideias">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <p className="text-sm text-muted-foreground">
          {filteredIdeas.length} {filteredIdeas.length === 1 ? "ideia" : "ideias"}
          {totalUserVotes > 0 && config?.voting_open && (
            <span className="ml-2">· {totalUserVotes}/{MAX_VOTES_PER_USER} votos usados</span>
          )}
        </p>
        {config?.ideas_open ? (
          reachedLimit && !isAdmin ? (
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5" /> Você já cadastrou 2 ideias
            </p>
          ) : (
            <Button size="sm" onClick={openNewDialog} className="gap-1.5">
              <Plus className="h-4 w-4" /> Nova Ideia
            </Button>
          )
        ) : (
          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5" /> Cadastro de ideias encerrado
          </p>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Buscar por nome da ideia..." className="pl-9" />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas categorias</SelectItem>
            {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Ideas grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="glass-card p-6 space-y-3">
              <div className="skeleton-loading h-5 w-3/4" />
              <div className="skeleton-loading h-4 w-16" />
              <div className="skeleton-loading h-4 w-full" />
              <div className="skeleton-loading h-3 w-1/3" />
            </div>
          ))}
        </div>
      ) : filteredIdeas.length === 0 ? (
        <div className="glass-card p-12 flex flex-col items-center justify-center text-center space-y-3">
          <Lightbulb className="h-10 w-10 text-muted-foreground" />
          <p className="text-muted-foreground">
            {ideas.length === 0 ? "Nenhuma ideia cadastrada ainda." : "Nenhuma ideia encontrada com esses filtros."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredIdeas.map((idea) => {
            const isOwnIdea = idea.created_by === user?.id;
            const userRating = getUserRating(idea.id);
            const occupiedCargos = idea.groupMembers.map((m) => m.cargo);

            return (
              <div
                key={idea.id}
                className="glass-card p-6 space-y-3 cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all"
                onClick={() => openDetail(idea)}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-foreground font-medium leading-tight">{idea.title}</h3>
                  {idea.category && (
                    <Badge variant="secondary" className="shrink-0 capitalize text-xs">{idea.category}</Badge>
                  )}
                </div>

                {idea.description && (
                  <p className="text-sm text-muted-foreground line-clamp-3">{idea.description}</p>
                )}

                <div className="text-xs text-muted-foreground pt-1">por {idea.authorName}</div>

                {/* Cargo slots */}
                {idea.groupId && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {CARGOS.map((cargo) => {
                      const member = idea.groupMembers.find((m) => m.cargo === cargo.value);
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
                          title={member ? `${cargo.label}: ${member.full_name}` : `${cargo.label}: Vago`}
                        >
                          <Icon className="h-3 w-3" />
                          <span>{member ? member.full_name.split(" ")[0] : "Vago"}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Star rating */}
                <div className="flex items-center gap-3 pt-2 border-t border-border">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        className="p-0.5 disabled:cursor-not-allowed"
                        disabled={votingInProgress === idea.id || isOwnIdea || !config?.voting_open}
                        onClick={(e) => handleStarRate(idea.id, star, e)}
                      >
                        <Star className={`h-5 w-5 transition-colors ${
                          star <= userRating
                            ? "text-yellow-400 fill-yellow-400"
                            : "text-muted-foreground/40 hover:text-yellow-400/60"
                        }`} />
                      </button>
                    ))}
                    {votingInProgress === idea.id && <Loader2 className="h-4 w-4 animate-spin ml-1 text-muted-foreground" />}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {idea.avgRating > 0 ? `${idea.avgRating.toFixed(1)} ★ (${idea.voteCount})` : "Sem avaliações"}
                  </span>
                </div>

                {/* Join group + Admin actions */}
                <div className="flex items-center gap-2">
                  <Button
                    variant={userMembership?.group_id === idea.groupId && idea.groupId ? "secondary" : "default"}
                    size="sm"
                    className="h-8 text-xs gap-1.5"
                    onClick={(e) => handleJoinClick(idea, e)}
                    disabled={
                      !idea.groupId ||
                      !canJoin ||
                      !!userMembership ||
                      idea.groupMembers.length >= MAX_PER_GROUP
                    }
                    title={
                      !idea.groupId ? "Grupo ainda não formado"
                        : userMembership?.group_id === idea.groupId ? "Você já está neste grupo"
                        : userMembership ? "Você já pertence a outro grupo"
                        : !canJoin ? "Entrada em grupos fechada"
                        : idea.groupMembers.length >= MAX_PER_GROUP ? "Grupo cheio"
                        : "Entrar neste grupo"
                    }
                  >
                    {userMembership?.group_id === idea.groupId && idea.groupId ? (
                      <Users className="h-3.5 w-3.5" />
                    ) : (
                      <UserPlus className="h-3.5 w-3.5" />
                    )}
                    {!idea.groupId
                      ? "Sem grupo"
                      : userMembership?.group_id === idea.groupId
                      ? "Meu grupo"
                      : `Entrar (${idea.groupMembers.length}/${MAX_PER_GROUP})`}
                  </Button>

                  {isAdmin && (
                    <>
                      <Button variant="ghost" size="icon" className="h-8 w-8 ml-auto" onClick={(e) => openEditDialog(idea, e)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={(e) => handleDelete(idea.id, e)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cargo selection dialog */}
      {cargoTargetIdea && (
        <CargoSelectDialog
          open={cargoDialogOpen}
          onOpenChange={setCargoDialogOpen}
          occupiedCargos={cargoTargetIdea.groupMembers.map((m) => m.cargo)}
          onConfirm={handleConfirmCargo}
          groupName={cargoTargetIdea.groupName ?? "Grupo"}
        />
      )}

      {/* Create / Edit dialog */}
      <Dialog open={formDialogOpen} onOpenChange={(open) => { if (!open) { setFormDialogOpen(false); resetForm(); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingIdea ? "Editar Ideia" : "Nova Ideia"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Nome da ideia *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} placeholder="Ex: App de caronas universitárias" />
            </div>
            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={280} placeholder="Descreva brevemente a ideia" rows={3} />
              <p className="text-xs text-muted-foreground text-right">{description.length}/280</p>
            </div>
            <div className="space-y-2">
              <Label>Categoria *</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Problema que resolve</Label>
              <Textarea value={problem} onChange={(e) => setProblem(e.target.value)} maxLength={500} placeholder="Opcional" rows={2} />
              <p className="text-xs text-muted-foreground text-right">{problem.length}/500</p>
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editingIdea ? "Salvar Alterações" : "Cadastrar Ideia"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail dialog */}
      <Dialog open={!!detailIdea} onOpenChange={(open) => { if (!open) setDetailIdea(null); }}>
        <DialogContent className="sm:max-w-lg">
          {detailIdea && (
            <>
              <DialogHeader>
                <DialogTitle>{detailIdea.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                {detailIdea.category && (
                  <Badge variant="secondary" className="capitalize">{detailIdea.category}</Badge>
                )}
                {detailIdea.description && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Descrição</p>
                    <p className="text-sm text-foreground">{detailIdea.description}</p>
                  </div>
                )}
                {detailIdea.problem && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Problema que resolve</p>
                    <p className="text-sm text-foreground">{detailIdea.problem}</p>
                  </div>
                )}
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" /> por {detailIdea.authorName}
                  </span>
                  <span className="flex items-center gap-1">
                    <CalendarIcon className="h-3.5 w-3.5" />
                    {detailIdea.created_at ? new Date(detailIdea.created_at).toLocaleDateString("pt-BR") : "—"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" />
                    {detailIdea.avgRating > 0
                      ? `${detailIdea.avgRating.toFixed(1)} (${detailIdea.voteCount} avaliações)`
                      : "Sem avaliações"}
                  </span>
                </div>

                {/* Group members with cargo */}
                {detailIdea.groupName && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">
                      Grupo: {detailIdea.groupName} ({detailIdea.groupMembers.length}/{MAX_PER_GROUP} membros)
                    </p>
                    {detailIdea.groupMembers.length > 0 ? (
                      <div className="space-y-1.5">
                        {detailIdea.groupMembers.map((member) => {
                          const cargoInfo = CARGOS.find((c) => c.value === member.cargo);
                          return (
                            <div key={member.user_id} className="flex items-center gap-2 text-sm">
                              <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                              <span className="text-foreground">{member.full_name}</span>
                              <Badge variant={cargoColor(member.cargo)} className="text-[10px] px-1.5 py-0 capitalize">
                                {cargoInfo?.label ?? member.cargo}
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Nenhum membro ainda.</p>
                    )}

                    {/* Vacant required cargos */}
                    {(() => {
                      const vacant = CARGOS.filter((c) => c.required && !detailIdea.groupMembers.some((m) => m.cargo === c.value));
                      if (vacant.length === 0) return null;
                      return (
                        <div className="mt-2">
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
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
