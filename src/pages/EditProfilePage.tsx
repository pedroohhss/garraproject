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
import { useTranslation } from "react-i18next";

const ESTADOS_BR = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];


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
  const { t } = useTranslation();
  const sexoOptions = t("editProfile.genderOptions", { returnObjects: true }) as string[];
  const estadoCivilOptions = t("editProfile.maritalStatusOptions", { returnObjects: true }) as string[];
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<{ full_name?: string }>({});
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        toast({ title: t("editProfile.rolesMax"), variant: "destructive" });
        return prev;
      }
      return { ...prev, cargos_aptos: [...current, cargo] };
    });
  };

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      toast({ title: t("editProfile.errorOnlyJpgPng"), variant: "destructive" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: t("editProfile.errorImageTooBig"), variant: "destructive" });
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const removeAvatarPreview = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSave = async () => {
    if (!user) return;
    if (!form.full_name.trim()) {
      setFormErrors({ full_name: t("editProfile.errorNameRequired") });
      return;
    }
    setFormErrors({});
    setSaving(true);
    try {
      let avatarUrl = form.avatar_url.trim() || null;

      if (avatarFile) {
        setUploadingAvatar(true);
        const ext = avatarFile.name.split(".").pop() ?? "jpg";
        const filePath = `${user.id}/avatar.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(filePath, avatarFile, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
        avatarUrl = urlData.publicUrl;
        setUploadingAvatar(false);
      }

      const { error } = await supabase
        .from("users")
        .update({
          full_name: form.full_name.trim(),
          bio: form.bio.trim() || null,
          avatar_url: avatarUrl,
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
      toast({ title: t("editProfile.successSaved") });
      navigate(`/perfil/${user.id}`);
    } catch (err: any) {
      toast({ title: t("editProfile.errorSaving"), description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title={t("editProfile.title")}>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={t("editProfile.title")}>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Informações Pessoais */}
        <div className="glass-card p-5 space-y-4">
          <p className="section-label">{t("editProfile.personalInfo")}</p>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">
                {t("editProfile.fullName")} <span className="text-destructive">*</span>
              </Label>
              <Input
                value={form.full_name}
                onChange={(e) => { set("full_name", e.target.value); setFormErrors((p) => ({ ...p, full_name: undefined })); }}
                maxLength={100}
                className={formErrors.full_name ? "border-destructive focus-visible:ring-destructive" : ""}
              />
              {formErrors.full_name && <p className="text-xs text-destructive">{formErrors.full_name}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("editProfile.bio")}</Label>
              <Textarea value={form.bio} onChange={(e) => set("bio", e.target.value)} maxLength={500} rows={3} placeholder={t("editProfile.bioPlaceholder")} />
              <p className="text-[10px] text-muted-foreground text-right">{form.bio.length}/500</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">{t("editProfile.gender")}</Label>
                <Select value={form.sexo || undefined} onValueChange={(v) => set("sexo", v)}>
                  <SelectTrigger><SelectValue placeholder={t("editProfile.select")} /></SelectTrigger>
                  <SelectContent>
                    {sexoOptions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t("editProfile.age")}</Label>
                <Input type="number" min={10} max={99} value={form.idade} onChange={(e) => set("idade", e.target.value)} placeholder="Ex: 25" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("editProfile.maritalStatus")}</Label>
              <Select value={form.estado_civil || undefined} onValueChange={(v) => set("estado_civil", v)}>
                <SelectTrigger><SelectValue placeholder={t("editProfile.select")} /></SelectTrigger>
                <SelectContent>
                  {estadoCivilOptions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Localização */}
        <div className="glass-card p-5 space-y-4">
          <p className="section-label">{t("editProfile.location")}</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{t("editProfile.state")}</Label>
              <Select value={form.estado || undefined} onValueChange={(v) => set("estado", v)}>
                <SelectTrigger><SelectValue placeholder={t("editProfile.stateAbbr")} /></SelectTrigger>
                <SelectContent>
                  {ESTADOS_BR.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("editProfile.city")}</Label>
              <Input value={form.cidade} onChange={(e) => set("cidade", e.target.value)} maxLength={100} placeholder={t("editProfile.cityPlaceholder")} />
            </div>
          </div>
        </div>

        {/* Profissional */}
        <div className="glass-card p-5 space-y-4">
          <p className="section-label">{t("editProfile.professional")}</p>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{t("editProfile.workStudy")}</Label>
              <Input value={form.trabalho_estudo} onChange={(e) => set("trabalho_estudo", e.target.value)} maxLength={150} placeholder={t("editProfile.workStudyPlaceholder")} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("editProfile.skills")}</Label>
              <Input value={form.habilidades} onChange={(e) => set("habilidades", e.target.value)} maxLength={300} placeholder={t("editProfile.skillsPlaceholder")} />
            </div>
          </div>
        </div>

        {/* Objetivos */}
        <div className="glass-card p-5 space-y-4">
          <p className="section-label">{t("editProfile.goals")}</p>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{t("editProfile.shortTermGoal")}</Label>
              <Textarea value={form.objetivos_curto_prazo} onChange={(e) => set("objetivos_curto_prazo", e.target.value)} maxLength={300} rows={2} placeholder={t("editProfile.shortTermGoalPlaceholder")} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("editProfile.longTermGoal")}</Label>
              <Textarea value={form.objetivos_longo_prazo} onChange={(e) => set("objetivos_longo_prazo", e.target.value)} maxLength={300} rows={2} placeholder={t("editProfile.longTermGoalPlaceholder")} />
            </div>
          </div>
        </div>

        {/* Redes Sociais */}
        <div className="glass-card p-5 space-y-4">
          <p className="section-label">{t("editProfile.socialMedia")}</p>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{t("editProfile.instagram")}</Label>
              <Input value={form.instagram_url} onChange={(e) => set("instagram_url", e.target.value)} maxLength={200} placeholder={t("editProfile.instagramPlaceholder")} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("editProfile.linkedin")}</Label>
              <Input value={form.linkedin_url} onChange={(e) => set("linkedin_url", e.target.value)} maxLength={200} placeholder={t("editProfile.linkedinPlaceholder")} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">{t("editProfile.profilePhoto")}</Label>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-secondary border border-border flex items-center justify-center overflow-hidden shrink-0">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : form.avatar_url ? (
                    <img src={form.avatar_url} alt="Avatar atual" className="w-full h-full object-cover" />
                  ) : (
                    <User className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png"
                    className="hidden"
                    onChange={handleAvatarSelect}
                  />
                  <Button type="button" variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="h-3.5 w-3.5" />
                    {form.avatar_url || avatarPreview ? t("editProfile.changePhoto") : t("editProfile.uploadPhoto")}
                  </Button>
                  {avatarPreview && (
                    <Button type="button" variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground" onClick={removeAvatarPreview}>
                      <X className="h-3 w-3" /> {t("editProfile.removePhoto")}
                    </Button>
                  )}
                  <p className="text-[10px] text-muted-foreground">{t("editProfile.photoHint")}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Cargos */}
        <div className="glass-card p-5 space-y-4">
          <p className="section-label">{t("editProfile.roles")}</p>
          <p className="text-xs text-muted-foreground">{t("editProfile.rolesHint")}</p>
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
                    <p className="text-sm font-medium text-foreground">{t(cargo.labelKey)}</p>
                    <p className="text-xs text-muted-foreground">{t(cargo.descriptionKey)}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full gap-1.5">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {t("editProfile.submit")}
        </Button>
      </div>
    </DashboardLayout>
  );
}
