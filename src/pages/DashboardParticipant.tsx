import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import GlassCard from "@/components/GlassCard";

export default function DashboardParticipant() {
  const { profile } = useAuth();

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            Olá, {profile?.full_name ?? "..."}
          </h1>
        </div>
        <span className="badge-role">{profile?.role ?? "participante"}</span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <GlassCard>
          <p className="section-label mb-2">Semana Atual</p>
          <p className="value-highlight">—</p>
        </GlassCard>
        <GlassCard>
          <p className="section-label mb-2">Grupo</p>
          <p className="value-highlight">—</p>
        </GlassCard>
        <GlassCard>
          <p className="section-label mb-2">Entregas Pendentes</p>
          <p className="value-highlight">—</p>
        </GlassCard>
      </div>

      {/* Weekly section */}
      <div>
        <h2 className="section-label mb-4">O que acontece essa semana</h2>
        <GlassCard className="min-h-[120px] flex items-center justify-center">
          <p className="text-muted-foreground text-sm">Nenhuma atividade esta semana</p>
        </GlassCard>
      </div>
    </DashboardLayout>
  );
}
