import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { CARGOS } from "@/components/CargoSelectDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MapPin, Calendar as CalendarIcon, Briefcase, Instagram, Linkedin,
  User, Heart, Target, Sparkles, Pencil, Loader2,
} from "lucide-react";

interface ProfileData {
  id: string;
  full_name: string;
  bio: string | null;
  avatar_url: string | null;
  linkedin_url: string | null;
  sexo: string | null;
  idade: number | null;
  estado_civil: string | null;
  estado: string | null;
  cidade: string | null;
  trabalho_estudo: string | null;
  habilidades: string | null;
  objetivos_curto_prazo: string | null;
  objetivos_longo_prazo: string | null;
  instagram_url: string | null;
  cargos_aptos: string[] | null;
  created_at: string | null;
}

export default function ProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  const isOwnProfile = user?.id === userId;

  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("users_public" as any)
        .select("*")
        .eq("id", userId)
        .maybeSingle() as { data: ProfileData | null };
      setProfile(data);
      setLoading(false);
    };
    load();
  }, [userId]);

  if (loading) {
    return (
      <DashboardLayout title="Perfil">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!profile) {
    return (
      <DashboardLayout title="Perfil">
        <div className="glass-card p-12 text-center">
          <User className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Usuário não encontrado.</p>
        </div>
      </DashboardLayout>
    );
  }

  const location = [profile.cidade, profile.estado].filter(Boolean).join(", ");
  const habilidadesList = profile.habilidades?.split(",").map((h) => h.trim()).filter(Boolean) ?? [];
  const cargosList = (profile.cargos_aptos ?? []).map((c) => CARGOS.find((cargo) => cargo.value === c)).filter(Boolean);
  const joinDate = profile.created_at ? new Date(profile.created_at).toLocaleDateString("pt-BR", { month: "long", year: "numeric" }) : null;

  const infoItems = [
    profile.sexo && { icon: User, label: profile.sexo },
    profile.idade && { icon: CalendarIcon, label: `${profile.idade} anos` },
    profile.estado_civil && { icon: Heart, label: profile.estado_civil },
    profile.trabalho_estudo && { icon: Briefcase, label: profile.trabalho_estudo },
  ].filter(Boolean) as { icon: React.ElementType; label: string }[];

  return (
    <DashboardLayout title="Perfil">
      {/* Banner + Avatar */}
      <div className="glass-card overflow-hidden">
        <div className="h-28 bg-gradient-to-r from-primary/30 via-primary/10 to-transparent" />
        <div className="px-6 pb-6 -mt-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
            <div className="w-20 h-20 rounded-full bg-secondary border-4 border-background flex items-center justify-center overflow-hidden shrink-0">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
              ) : (
                <User className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-medium text-foreground">{profile.full_name}</h2>
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-1">
                {location && (
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{location}</span>
                )}
                {joinDate && (
                  <span className="flex items-center gap-1"><CalendarIcon className="h-3 w-3" />Membro desde {joinDate}</span>
                )}
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              {profile.instagram_url && (
                <a href={profile.instagram_url.startsWith("http") ? profile.instagram_url : `https://instagram.com/${profile.instagram_url.replace("@", "")}`} target="_blank" rel="noopener noreferrer">
                  <Button variant="ghost" size="icon" className="h-8 w-8"><Instagram className="h-4 w-4" /></Button>
                </a>
              )}
              {profile.linkedin_url && (
                <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer">
                  <Button variant="ghost" size="icon" className="h-8 w-8"><Linkedin className="h-4 w-4" /></Button>
                </a>
              )}
              {isOwnProfile && (
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => navigate("/perfil/editar")}>
                  <Pencil className="h-3.5 w-3.5" /> Editar
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Info badges */}
      {infoItems.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-4">
          {infoItems.map((item, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground px-3 py-1.5 rounded-full border border-border bg-secondary/30">
              <item.icon className="h-3 w-3" /> {item.label}
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        {/* Bio */}
        {profile.bio && (
          <div className="glass-card p-5 space-y-2 lg:col-span-2">
            <p className="section-label">Sobre</p>
            <p className="text-sm text-foreground leading-relaxed">{profile.bio}</p>
          </div>
        )}

        {/* Objectives */}
        {(profile.objetivos_curto_prazo || profile.objetivos_longo_prazo) && (
          <>
            {profile.objetivos_curto_prazo && (
              <div className="glass-card p-5 space-y-2">
                <div className="flex items-center gap-1.5">
                  <Target className="h-3.5 w-3.5 text-primary" />
                  <p className="section-label">Objetivo de Curto Prazo</p>
                </div>
                <p className="text-sm text-foreground">{profile.objetivos_curto_prazo}</p>
              </div>
            )}
            {profile.objetivos_longo_prazo && (
              <div className="glass-card p-5 space-y-2">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  <p className="section-label">Objetivo de Longo Prazo</p>
                </div>
                <p className="text-sm text-foreground">{profile.objetivos_longo_prazo}</p>
              </div>
            )}
          </>
        )}

        {/* Skills */}
        {habilidadesList.length > 0 && (
          <div className="glass-card p-5 space-y-2">
            <p className="section-label">Habilidades</p>
            <div className="flex flex-wrap gap-1.5">
              {habilidadesList.map((h, i) => (
                <Badge key={i} variant="secondary" className="text-xs">{h}</Badge>
              ))}
            </div>
          </div>
        )}

        {/* Cargos aptos */}
        {cargosList.length > 0 && (
          <div className="glass-card p-5 space-y-2">
            <p className="section-label">Cargos que melhor me representam</p>
            <div className="space-y-2">
              {cargosList.map((cargo) => {
                if (!cargo) return null;
                const Icon = cargo.icon;
                return (
                  <div key={cargo.value} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-secondary/30 border border-border">
                    <Icon className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{cargo.label}</p>
                      <p className="text-xs text-muted-foreground">{cargo.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
