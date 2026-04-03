import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import GlassCard from "@/components/GlassCard";

export default function DashboardLeader() {
  const { profile } = useAuth();

  return (
    <DashboardLayout>
      <div className="flex items-center gap-4 mb-8">
        <h1 className="text-xl font-semibold text-foreground">
          Olá, {profile?.full_name ?? "..."}
        </h1>
        <span className="badge-role">Líder</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <GlassCard>
          <p className="section-label mb-2">Total de Grupos</p>
          <p className="value-highlight">—</p>
        </GlassCard>
        <GlassCard>
          <p className="section-label mb-2">Entregas Pendentes</p>
          <p className="value-highlight">—</p>
        </GlassCard>
        <GlassCard>
          <p className="section-label mb-2">Checklists Pendentes</p>
          <p className="value-highlight">—</p>
        </GlassCard>
      </div>

      {/* Groups table placeholder */}
      <div>
        <h2 className="section-label mb-4">Seus grupos</h2>
        <GlassCard>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 label-sm font-semibold">Grupo</th>
                  <th className="text-left py-3 px-4 label-sm font-semibold">Membros</th>
                  <th className="text-left py-3 px-4 label-sm font-semibold">Entrega</th>
                  <th className="text-left py-3 px-4 label-sm font-semibold">Checklist</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={4} className="text-center py-8 text-muted-foreground">
                    Nenhum grupo atribuído
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </GlassCard>
      </div>
    </DashboardLayout>
  );
}
