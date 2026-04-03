import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Lightbulb, Plus, Pencil, Trash2, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
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
}

const CATEGORIES = [
  { value: "produto", label: "Produto" },
  { value: "serviço", label: "Serviço" },
  { value: "tecnologia", label: "Tecnologia" },
  { value: "educação", label: "Educação" },
  { value: "outro", label: "Outro" },
];

const MAX_IDEAS_PER_USER = 2;

export default function IdeasPage() {
  const { user, profile } = useAuth();
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [ideasOpen, setIdeasOpen] = useState(false);
  const [userIdeaCount, setUserIdeaCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIdea, setEditingIdea] = useState<Idea | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [problem, setProblem] = useState("");

  const isAdmin = profile?.role === "admin";

  const fetchData = useCallback(async () => {
    try {
      const [ideasRes, configRes] = await Promise.all([
        supabase
          .from("ideas")
          .select("id, title, description, problem, category, created_by, created_at")
          .order("created_at", { ascending: false }),
        supabase.from("challenge_config").select("ideas_open").limit(1).maybeSingle(),
      ]);

      const rawIdeas = ideasRes.data ?? [];
      setIdeasOpen(configRes.data?.ideas_open ?? false);

      // Get author names
      const authorIds = [...new Set(rawIdeas.map((i) => i.created_by).filter(Boolean))] as string[];
      let nameMap = new Map<string, string>();
      if (authorIds.length > 0) {
        const { data: usersData } = await supabase
          .from("users")
          .select("id, full_name")
          .in("id", authorIds);
        nameMap = new Map((usersData ?? []).map((u) => [u.id, u.full_name]));
      }

      const enriched = rawIdeas.map((i) => ({
        ...i,
        authorName: i.created_by ? nameMap.get(i.created_by) ?? "Desconhecido" : "Desconhecido",
      }));

      setIdeas(enriched);

      // Count user's own ideas
      if (user) {
        setUserIdeaCount(rawIdeas.filter((i) => i.created_by === user.id).length);
      }
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

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setCategory("");
    setProblem("");
    setEditingIdea(null);
  };

  const openNewDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (idea: Idea) => {
    setEditingIdea(idea);
    setTitle(idea.title);
    setDescription(idea.description ?? "");
    setCategory(idea.category ?? "");
    setProblem(idea.problem ?? "");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!title.trim() || !description.trim() || !category) {
      toast({ title: "Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      if (editingIdea) {
        // Admin edit
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
        toast({ title: "Ideia atualizada com sucesso" });
      } else {
        // New idea
        const { error } = await supabase.from("ideas").insert({
          title: title.trim(),
          description: description.trim(),
          category,
          problem: problem.trim() || null,
          created_by: user!.id,
        });

        if (error) throw error;
        toast({ title: "Ideia cadastrada com sucesso" });
      }

      setDialogOpen(false);
      resetForm();
      setLoading(true);
      await fetchData();
    } catch (err: any) {
      toast({ title: "Erro ao salvar ideia", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("ideas").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao remover ideia", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Ideia removida" });
      setIdeas((prev) => prev.filter((i) => i.id !== id));
    }
  };

  const reachedLimit = userIdeaCount >= MAX_IDEAS_PER_USER;

  // Determine sidebar title based on role
  const dashboardTitle = "Ideias";

  return (
    <DashboardLayout title={dashboardTitle}>
      {/* Header with action */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-muted-foreground">
          {ideas.length} {ideas.length === 1 ? "ideia cadastrada" : "ideias cadastradas"}
        </p>

        {ideasOpen ? (
          reachedLimit && !isAdmin ? (
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5" />
              Você já cadastrou 2 ideias
            </p>
          ) : (
            <Button size="sm" onClick={openNewDialog} className="gap-1.5">
              <Plus className="h-4 w-4" />
              Nova Ideia
            </Button>
          )
        ) : (
          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5" />
            Cadastro de ideias encerrado
          </p>
        )}
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
      ) : ideas.length === 0 ? (
        <div className="glass-card p-12 flex flex-col items-center justify-center text-center space-y-3">
          <Lightbulb className="h-10 w-10 text-muted-foreground" />
          <p className="text-muted-foreground">Nenhuma ideia cadastrada ainda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ideas.map((idea) => (
            <div key={idea.id} className="glass-card p-6 space-y-3">
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
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-muted-foreground">por {idea.authorName}</span>
                {isAdmin && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => openEditDialog(idea)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(idea.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) { setDialogOpen(false); resetForm(); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingIdea ? "Editar Ideia" : "Nova Ideia"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Nome da ideia *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
                placeholder="Ex: App de caronas universitárias"
              />
            </div>

            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={280}
                placeholder="Descreva brevemente a ideia"
                rows={3}
              />
              <p className="text-xs text-muted-foreground text-right">
                {description.length}/280
              </p>
            </div>

            <div className="space-y-2">
              <Label>Categoria *</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Problema que resolve</Label>
              <Textarea
                value={problem}
                onChange={(e) => setProblem(e.target.value)}
                maxLength={500}
                placeholder="Opcional"
                rows={2}
              />
              <p className="text-xs text-muted-foreground text-right">
                {problem.length}/500
              </p>
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingIdea ? "Salvar Alterações" : "Cadastrar Ideia"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
