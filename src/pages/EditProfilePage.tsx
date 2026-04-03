import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { CARGOS } from "@/components/CargoSelectDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Loader2, Save, Upload, User, X } from "lucide-react";

const ESTADOS_BR = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

const SEXO_OPTIONS = ["Masculino", "Feminino", "Outro", "Prefiro não dizer"];
const ESTADO_CIVIL_OPTIONS = ["Solteiro(a)", "Casado(a)", "Divorciado(a)", "Viúvo(a)", "Outro"];

interface FormData {
  full_name: string;
  bio: string;
  avatar_url: string;
  linkedin_url: string;
  sexo: string;
  idade: string;
  estado_civil: string;
  estado: string;
  cidade: string;
  trabalho_estudo: string;
  habilidades: string;
  objetivos_curto_prazo: string;
  objetivos_longo_prazo: string;
  instagram_url: string;
  cargos_aptos: string[];
}

const EMPTY_FORM: FormData = {
  full_name: "", bio: "", avatar_url: "", linkedin_url: "",
  sexo: "", idade: "", estado_civil: "", estado: "", cidade: "",
  trabalho_estudo: "", habilidades: "",
  objetivos_curto_prazo: "", objetivos_longo_prazo: "",
  instagram_url: "", cargos_aptos: [],
};

export default function EditProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("users")
        .select("full_name, bio, avatar_url, linkedin_url, sexo, idade, estado_civil, estado, cidade, trabalho_estudo, habilidades, objetivos_curto_prazo, objetivos_longo_prazo, instagram_url, cargos_aptos")
        .eq("id", user.id)
        .maybeSingle();
      if (data) {
        setForm({
          full_name: data.full_name ?? "",
          bio: data.bio ?? "",
          avatar_url: data.avatar_url ?? "",
          linkedin_url: data.linkedin_url ?? "",
          sexo: data.sexo ?? "",
          idade: data.idade?.toString() ?? "",
          estado_civil: data.estado_civil ?? "",
          estado: data.estado ?? "",
          cidade: data.cidade ?? "",
          trabalho_estudo: data.trabalho_estudo ?? "",
          habilidades: data.habilidades ?? "",
          objetivos_curto_prazo: data.objetivos_curto_prazo ?? "",
          objetivos_longo_prazo: data.objetivos_longo_prazo ?? "",
          instagram_url: data.instagram_url ?? "",
          cargos_aptos: (data.cargos_aptos as string[]) ?? [],
        });
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const set = (key: keyof FormData, value: string | string[]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const toggleCargo = (cargo: string) => {
    setForm((prev) => {
      const current = prev.cargos_aptos;
      if (current.includes(cargo)) {
        return { ...prev, cargos_aptos: current.filter((c) => c !== cargo) };
      }
      if (current.length >= 2) {
        toast({ title: "Máximo de 2 cargos", variant: "destructive" });
        return prev;
      }
      return { ...prev, cargos_aptos: [...current, cargo] };
    });
  };

  const handleSave = async () => {
    if (!user) return;
    if (!form.full_name.trim()) {
      toast({ title: "Nome completo é obrigatório", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("users")
        .update({
          full_name: form.full_name.trim(),
          bio: form.bio.trim() || null,
          avatar_url: form.avatar_url.trim() || null,
          linkedin_url: form.linkedin_url.trim() || null,
          sexo: form.sexo || null,
          idade: form.idade ? parseInt(form.idade) : null,
          estado_civil: form.estado_civil || null,
          estado: form.estado || null,
          cidade: form.cidade.trim() || null,
          trabalho_estudo: form.trabalho_estudo.trim() || null,
          habilidades: form.habilidades.trim() || null,
          objetivos_curto_prazo: form.objetivos_curto_prazo.trim() || null,
          objetivos_longo_prazo: form.objetivos_longo_prazo.trim() || null,
          instagram_url: form.instagram_url.trim() || null,
          cargos_aptos: form.cargos_aptos.length > 0 ? form.cargos_aptos : null,
        } as any)
        .eq("id", user.id);
      if (error) throw error;
      toast({ title: "Perfil atualizado!" });
      navigate(`/perfil/${user.id}`);
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Editar Perfil">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Editar Perfil">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Informações Pessoais */}
        <div className="glass-card p-5 space-y-4">
          <p className="section-label">Informações Pessoais</p>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Nome completo *</Label>
              <Input value={form.full_name} onChange={(e) => set("full_name", e.target.value)} maxLength={100} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Bio</Label>
              <Textarea value={form.bio} onChange={(e) => set("bio", e.target.value)} maxLength={500} rows={3} placeholder="Conte um pouco sobre você..." />
              <p className="text-[10px] text-muted-foreground text-right">{form.bio.length}/500</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Sexo</Label>
                <Select value={form.sexo} onValueChange={(v) => set("sexo", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {SEXO_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Idade</Label>
                <Input type="number" min={10} max={99} value={form.idade} onChange={(e) => set("idade", e.target.value)} placeholder="Ex: 25" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Estado civil</Label>
              <Select value={form.estado_civil} onValueChange={(v) => set("estado_civil", v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {ESTADO_CIVIL_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Localização */}
        <div className="glass-card p-5 space-y-4">
          <p className="section-label">Localização</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Estado</Label>
              <Select value={form.estado} onValueChange={(v) => set("estado", v)}>
                <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                <SelectContent>
                  {ESTADOS_BR.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Cidade</Label>
              <Input value={form.cidade} onChange={(e) => set("cidade", e.target.value)} maxLength={100} placeholder="Ex: São Paulo" />
            </div>
          </div>
        </div>

        {/* Profissional */}
        <div className="glass-card p-5 space-y-4">
          <p className="section-label">Profissional</p>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Com o que trabalha ou estuda</Label>
              <Input value={form.trabalho_estudo} onChange={(e) => set("trabalho_estudo", e.target.value)} maxLength={150} placeholder="Ex: Estudante de Engenharia" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Habilidades</Label>
              <Input value={form.habilidades} onChange={(e) => set("habilidades", e.target.value)} maxLength={300} placeholder="Separadas por vírgula: Design, Marketing, Python" />
            </div>
          </div>
        </div>

        {/* Objetivos */}
        <div className="glass-card p-5 space-y-4">
          <p className="section-label">Objetivos</p>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Objetivo de curto prazo</Label>
              <Textarea value={form.objetivos_curto_prazo} onChange={(e) => set("objetivos_curto_prazo", e.target.value)} maxLength={300} rows={2} placeholder="O que quer alcançar nos próximos meses?" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Objetivo de longo prazo</Label>
              <Textarea value={form.objetivos_longo_prazo} onChange={(e) => set("objetivos_longo_prazo", e.target.value)} maxLength={300} rows={2} placeholder="Onde quer chegar em 3-5 anos?" />
            </div>
          </div>
        </div>

        {/* Redes Sociais */}
        <div className="glass-card p-5 space-y-4">
          <p className="section-label">Redes Sociais</p>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Instagram</Label>
              <Input value={form.instagram_url} onChange={(e) => set("instagram_url", e.target.value)} maxLength={200} placeholder="@seuusuario ou URL completa" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">LinkedIn</Label>
              <Input value={form.linkedin_url} onChange={(e) => set("linkedin_url", e.target.value)} maxLength={200} placeholder="URL do perfil LinkedIn" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">URL do avatar</Label>
              <Input value={form.avatar_url} onChange={(e) => set("avatar_url", e.target.value)} maxLength={500} placeholder="URL de imagem" />
            </div>
          </div>
        </div>

        {/* Cargos */}
        <div className="glass-card p-5 space-y-4">
          <p className="section-label">Cargos que melhor me representam</p>
          <p className="text-xs text-muted-foreground">Selecione até 2 cargos.</p>
          <div className="space-y-2">
            {CARGOS.map((cargo) => {
              const Icon = cargo.icon;
              const isSelected = form.cargos_aptos.includes(cargo.value);
              return (
                <button
                  key={cargo.value}
                  type="button"
                  onClick={() => toggleCargo(cargo.value)}
                  className={`w-full text-left p-3 rounded-lg border transition-all flex items-start gap-3 ${
                    isSelected
                      ? "border-primary bg-primary/10 ring-1 ring-primary"
                      : "border-border hover:border-primary/40 hover:bg-secondary/30"
                  }`}
                >
                  <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                  <div>
                    <p className="text-sm font-medium text-foreground">{cargo.label}</p>
                    <p className="text-xs text-muted-foreground">{cargo.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full gap-1.5">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar Perfil
        </Button>
      </div>
    </DashboardLayout>
  );
}
