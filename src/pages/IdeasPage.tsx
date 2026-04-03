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
  groupMemberCount?: number;
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
  const [detailMembers, setDetailMembers] = useState<string[]>([]);
  const [editingIdea, setEditingIdea] = useState<Idea | null>(null);
  const [saving, setSaving] = useState(false);
  const [votingInProgress, setVotingInProgress] = useState<string | null>(null);
  const [joiningGroup, setJoiningGroup] = useState<string | null>(null);

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
      const [ideasRes, configRes, votesRes] = await Promise.all([
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
      ]);

      const rawIdeas = ideasRes.data ?? [];
      const allVotes = votesRes.data ?? [];

      setConfig(configRes.data ? {
        ideas_open: configRes.data.ideas_open ?? false,
        voting_open: configRes.data.voting_open ?? false,
        joining_open: configRes.data.joining_open ?? false,
        groups_confirmed: configRes.data.groups_confirmed ?? false,
      } : null);

      // User's own votes
      if (user) {
        setUserVotes(allVotes.filter((v) => v.user_id === user.id));
        setUserIdeaCount(rawIdeas.filter((i) => i.created_by === user.id).length);
      }

      // Vote counts and averages per idea
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
        const { data: usersData } = await supabase.from("users").select("id, full_name").in("id", authorIds);
        nameMap = new Map((usersData ?? []).map((u) => [u.id, u.full_name]));
      }

      // Groups linked to ideas
      const { data: groupsData } = await supabase.from("groups").select("id, name, idea_id");
      const groupByIdea = new Map((groupsData ?? []).map((g) => [g.idea_id, { id: g.id, name: g.name }]));

      // Member counts per group
      let memberCountMap = new Map<string, number>();
      if (groupsData && groupsData.length > 0) {
        const groupIds = groupsData.map((g) => g.id);
        const { data: membersData } = await supabase
          .from("users")
          .select("group_id")
          .in("group_id", groupIds);
        (membersData ?? []).forEach((m) => {
          if (m.group_id) {
            memberCountMap.set(m.group_id, (memberCountMap.get(m.group_id) ?? 0) + 1);
          }
        });
      }

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
          groupMemberCount: group ? (memberCountMap.get(group.id) ?? 0) : 0,
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

  // Filtered ideas
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

  // Vote helpers
  const totalUserVotes = useMemo(
    () => userVotes.length,
    [userVotes]
  );
  const getUserRating = useCallback(
    (ideaId: string) => {
      const vote = userVotes.find((v) => v.idea_id === ideaId);
      return vote?.quantity ?? 0;
    },
    [userVotes]
  );

  // Form helpers
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
          .update({
            title: title.trim(),
            description: description.trim(),
            category,
            problem: problem.trim() || null,
          })
          .eq("id", editingIdea.id);
        if (error) throw error;
        toast({ title: "Ideia atualizada" });
      } else {
        const { error } = await supabase.from("ideas").insert({
          title: title.trim(),
          description: description.trim(),
          category,
          problem: problem.trim() || null,
          created_by: user!.id,
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

  // Star rating
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
      // Delete existing vote for this idea, then insert new one
      const existingVote = userVotes.find((v) => v.idea_id === ideaId);
      if (existingVote) {
        await supabase.from("votes").delete().eq("id", existingVote.id);
      }
      const { error } = await supabase.from("votes").insert({
        idea_id: ideaId,
        user_id: user.id,
        quantity: rating,
      });
      if (error) throw error;
      await fetchData();
    } catch (err: any) {
      toast({ title: "Erro ao avaliar", description: err.message, variant: "destructive" });
    } finally {
      setVotingInProgress(null);
    }
  };

  // Join group
  const handleJoinGroup = async (idea: Idea, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || !idea.groupId) return;
    if (profile?.group_id) {
      toast({ title: "Você já pertence a um grupo", variant: "destructive" });
      return;
    }
    if ((idea.groupMemberCount ?? 0) >= MAX_PER_GROUP) {
      toast({ title: "Grupo já está cheio (5 membros)", variant: "destructive" });
      return;
    }
    setJoiningGroup(idea.groupId);
    try {
      const { error } = await supabase
        .from("users")
        .update({ group_id: idea.groupId })
        .eq("id", user.id);
      if (error) throw error;
      toast({ title: "Você entrou no grupo!" });
      await fetchData();
    } catch (err: any) {
      toast({ title: "Erro ao entrar no grupo", description: err.message, variant: "destructive" });
    } finally {
      setJoiningGroup(null);
    }
  };

  // Detail modal
  const openDetail = async (idea: Idea) => {
    setDetailIdea(idea);
    setDetailMembers([]);
    if (idea.groupId) {
      const { data } = await supabase
        .from("users")
        .select("full_name")
        .eq("group_id", idea.groupId);
      setDetailMembers((data ?? []).map((u) => u.full_name));
    }
  };

  const reachedLimit = userIdeaCount >= MAX_IDEAS_PER_USER;
  const canJoin = config?.joining_open && config?.groups_confirmed;

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
          <Input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Buscar por nome da ideia..."
            className="pl-9"
          />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas categorias</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
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

            return (
              <div
                key={idea.id}
                className="glass-card p-6 space-y-3 cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all"
                onClick={() => openDetail(idea)}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-foreground font-medium leading-tight">{idea.title}</h3>
                  {idea.category && (
                    <Badge variant="secondary" className="shrink-0 capitalize text-xs">
                      {idea.category}
                    </Badge>
                  )}
                </div>

                {idea.description && (
                  <p className="text-sm text-muted-foreground line-clamp-3">{idea.description}</p>
                )}

                <div className="text-xs text-muted-foreground pt-1">
                  por {idea.authorName}
                </div>

                {/* Star rating + average */}
                <div className="flex items-center gap-3 pt-2 border-t border-border">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        className="p-0.5 disabled:cursor-not-allowed"
                        disabled={votingInProgress === idea.id || isOwnIdea || !config?.voting_open}
                        title={
                          isOwnIdea
                            ? "Não pode avaliar a própria ideia"
                            : !config?.voting_open
                            ? "Votação fechada"
                            : `Avaliar com ${star} estrela${star > 1 ? "s" : ""}`
                        }
                        onClick={(e) => handleStarRate(idea.id, star, e)}
                      >
                        <Star
                          className={`h-5 w-5 transition-colors ${
                            star <= userRating
                              ? "text-yellow-400 fill-yellow-400"
                              : "text-muted-foreground/40 hover:text-yellow-400/60"
                          }`}
                        />
                      </button>
                    ))}
                    {votingInProgress === idea.id && (
                      <Loader2 className="h-4 w-4 animate-spin ml-1 text-muted-foreground" />
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {idea.avgRating > 0
                      ? `${idea.avgRating.toFixed(1)} ★ (${idea.voteCount})`
                      : "Sem avaliações"}
                  </span>
                </div>

                {/* Join group + Admin actions */}
                <div className="flex items-center gap-2">
                  {/* Join group button — always visible */}
                  <Button
                    variant={profile?.group_id === idea.groupId && idea.groupId ? "secondary" : "default"}
                    size="sm"
                    className="h-8 text-xs gap-1.5"
                    onClick={(e) => handleJoinGroup(idea, e)}
                    disabled={
                      !idea.groupId ||
                      !canJoin ||
                      !!profile?.group_id ||
                      (idea.groupMemberCount ?? 0) >= MAX_PER_GROUP ||
                      joiningGroup === idea.groupId
                    }
                    title={
                      !idea.groupId
                        ? "Grupo ainda não formado"
                        : profile?.group_id === idea.groupId
                        ? "Você já está neste grupo"
                        : profile?.group_id
                        ? "Você já pertence a outro grupo"
                        : !canJoin
                        ? "Entrada em grupos fechada"
                        : (idea.groupMemberCount ?? 0) >= MAX_PER_GROUP
                        ? "Grupo cheio"
                        : "Entrar neste grupo"
                    }
                  >
                    {joiningGroup === idea.groupId ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : profile?.group_id === idea.groupId && idea.groupId ? (
                      <Users className="h-3.5 w-3.5" />
                    ) : (
                      <UserPlus className="h-3.5 w-3.5" />
                    )}
                    {!idea.groupId
                      ? "Sem grupo"
                      : profile?.group_id === idea.groupId
                      ? "Meu grupo"
                      : `Entrar (${idea.groupMemberCount}/${MAX_PER_GROUP})`}
                  </Button>

                  {/* Admin actions */}
                  {isAdmin && (
                    <>
                      <Button variant="ghost" size="icon" className="h-8 w-8 ml-auto" onClick={(e) => openEditDialog(idea, e)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={(e) => handleDelete(idea.id, e)}
                      >
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
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
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
                    {detailIdea.created_at
                      ? new Date(detailIdea.created_at).toLocaleDateString("pt-BR")
                      : "—"}
                  </span>
                  <span className="flex items-center gap-1">
                    <ThumbsUp className="h-3.5 w-3.5" /> {detailIdea.voteCount} votos
                  </span>
                </div>

                {detailIdea.groupName && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Grupo: {detailIdea.groupName} ({detailIdea.groupMemberCount}/{MAX_PER_GROUP} membros)
                    </p>
                    {detailMembers.length > 0 && (
                      <ul className="text-sm text-foreground space-y-1">
                        {detailMembers.map((name, idx) => (
                          <li key={idx} className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                            {name}
                          </li>
                        ))}
                      </ul>
                    )}
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
