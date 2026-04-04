import { useEffect, useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import {
  Users, Search, AlertTriangle, ExternalLink, Loader2,
} from "lucide-react";

interface UserRow {
  id: string;
  full_name: string;
  email: string;
  role: string;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string | null;
  group_id: string | null;
  bio: string | null;
  cargos_aptos: string[] | null;
  idade: number | null;
  sexo: string | null;
  estado: string | null;
  cidade: string | null;
  estado_civil: string | null;
  trabalho_estudo: string | null;
  habilidades: string | null;
  objetivos_curto_prazo: string | null;
  objetivos_longo_prazo: string | null;
  instagram_url: string | null;
  linkedin_url: string | null;
  // enriched
  groupName?: string;
  groupCargo?: string;
  profileIncomplete?: boolean;
}

const ROLE_COLORS: Record<string, string> = {
  participante: "bg-secondary text-secondary-foreground",
  representante: "bg-accent/20 text-accent",
  lider: "bg-primary/20 text-primary",
};

const MAX_PARTICIPANTS = 75;

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [updatingRole, setUpdatingRole] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const navigate = useNavigate();

  const loadUsers = async () => {
    setLoading(true);
    try {
      const [usersRes, groupsRes, membersRes] = await Promise.all([
        supabase.from("users").select("*").neq("role", "admin").order("created_at", { ascending: false }),
        supabase.from("groups").select("id, name"),
        supabase.from("group_members").select("user_id, cargo"),
      ]);

      const groupMap = new Map((groupsRes.data ?? []).map((g) => [g.id, g.name]));
      const cargoMap = new Map((membersRes.data ?? []).map((m) => [m.user_id, m.cargo]));

      const enriched: UserRow[] = (usersRes.data ?? []).map((u) => ({
        ...u,
        role: u.role ?? "participante",
        is_active: u.is_active ?? true,
        groupName: u.group_id ? groupMap.get(u.group_id) ?? undefined : undefined,
        groupCargo: cargoMap.get(u.id) ?? undefined,
        profileIncomplete: !u.bio || !u.cargos_aptos || u.cargos_aptos.length === 0,
      }));

      setUsers(enriched);
    } catch {
      toast({ title: "Erro ao carregar usuários", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const filtered = useMemo(() => {
    let list = users;
    if (roleFilter !== "all") list = list.filter((u) => u.role === roleFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((u) => u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    }
    return list;
  }, [users, search, roleFilter]);

  const spotsLeft = Math.max(0, MAX_PARTICIPANTS - users.length);

  const handleRoleChange = async (userId: string, newRole: string) => {
    setUpdatingRole(true);
    const { error } = await supabase.from("users").update({ role: newRole }).eq("id", userId);
    if (error) {
      toast({ title: "Erro ao alterar perfil", description: error.message, variant: "destructive" });
    } else {
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: newRole } : u));
      setSelectedUser((prev) => prev && prev.id === userId ? { ...prev, role: newRole } : prev);
      toast({ title: "Perfil atualizado" });
    }
    setUpdatingRole(false);
  };

  const handleStatusToggle = async (userId: string, active: boolean) => {
    setUpdatingStatus(true);
    const { error } = await supabase.from("users").update({ is_active: active }).eq("id", userId);
    if (error) {
      toast({ title: "Erro ao alterar status", description: error.message, variant: "destructive" });
    } else {
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, is_active: active } : u));
      setSelectedUser((prev) => prev && prev.id === userId ? { ...prev, is_active: active } : prev);
      toast({ title: active ? "Usuário ativado" : "Usuário desativado" });
    }
    setUpdatingStatus(false);
  };

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <DashboardLayout title="Gestão de Usuários">
      {/* Summary */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="glass-card px-4 py-3 flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <span className="text-sm text-muted-foreground">Total:</span>
          <span className="text-sm font-semibold text-foreground">{users.length}</span>
        </div>
        <div className="glass-card px-4 py-3 flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Vagas restantes:</span>
          <span className="text-sm font-semibold text-foreground">{spotsLeft}</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por perfil" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os perfis</SelectItem>
            <SelectItem value="participante">Participante</SelectItem>
            <SelectItem value="representante">Representante</SelectItem>
            <SelectItem value="lider">Líder</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-8 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">Nenhum usuário encontrado.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left px-4 py-3 font-medium">Usuário</th>
                  <th className="text-left px-4 py-3 font-medium">Email</th>
                  <th className="text-left px-4 py-3 font-medium">Perfil</th>
                  <th className="text-left px-4 py-3 font-medium">Grupo</th>
                  <th className="text-left px-4 py-3 font-medium">Cargo</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium">Cadastro</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => (
                  <tr
                    key={user.id}
                    onClick={() => setSelectedUser(user)}
                    className={`border-b border-border last:border-0 hover:bg-secondary/30 transition-colors cursor-pointer ${
                      !user.is_active ? "opacity-50" : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-semibold">
                            {getInitials(user.full_name)}
                          </div>
                        )}
                        <div className="flex items-center gap-1.5">
                          <span className="text-foreground font-medium">{user.full_name}</span>
                          {user.profileIncomplete && (
                            <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" title="Perfil incompleto" />
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                    <td className="px-4 py-3">
                      <Badge className={`text-xs capitalize ${ROLE_COLORS[user.role] ?? ""}`}>
                        {user.role}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{user.groupName ?? "Sem grupo"}</td>
                    <td className="px-4 py-3 text-muted-foreground capitalize">{user.groupCargo ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Badge variant={user.is_active ? "default" : "secondary"} className="text-xs">
                        {user.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(user.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* User Detail Sheet */}
      <Sheet open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <SheetContent className="overflow-y-auto">
          {selectedUser && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-3">
                  {selectedUser.avatar_url ? (
                    <img src={selectedUser.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-semibold">
                      {getInitials(selectedUser.full_name)}
                    </div>
                  )}
                  <span>{selectedUser.full_name}</span>
                </SheetTitle>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Role */}
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Perfil</label>
                  <Select
                    value={selectedUser.role}
                    onValueChange={(val) => handleRoleChange(selectedUser.id, val)}
                    disabled={updatingRole}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="participante">Participante</SelectItem>
                      <SelectItem value="representante">Representante</SelectItem>
                      <SelectItem value="lider">Líder</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Status */}
                <div className="flex items-center justify-between">
                  <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Ativo</label>
                  <Switch
                    checked={selectedUser.is_active}
                    onCheckedChange={(val) => handleStatusToggle(selectedUser.id, val)}
                    disabled={updatingStatus}
                  />
                </div>

                {/* Group info */}
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Grupo</label>
                  <p className="text-sm text-foreground">{selectedUser.groupName ?? "Sem grupo"}</p>
                  {selectedUser.groupCargo && (
                    <p className="text-xs text-muted-foreground capitalize">Cargo: {selectedUser.groupCargo}</p>
                  )}
                </div>

                {/* Personal info */}
                <div className="space-y-3 border-t border-border pt-4">
                  <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Dados pessoais</label>
                  <InfoRow label="Email" value={selectedUser.email} />
                  <InfoRow label="Idade" value={selectedUser.idade?.toString()} />
                  <InfoRow label="Sexo" value={selectedUser.sexo} />
                  <InfoRow label="Estado civil" value={selectedUser.estado_civil} />
                  <InfoRow label="Cidade" value={selectedUser.cidade} />
                  <InfoRow label="Estado" value={selectedUser.estado} />
                  <InfoRow label="Trabalho/Estudo" value={selectedUser.trabalho_estudo} />
                </div>

                {/* Bio */}
                {selectedUser.bio && (
                  <div className="space-y-1 border-t border-border pt-4">
                    <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Bio</label>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{selectedUser.bio}</p>
                  </div>
                )}

                {/* Skills & goals */}
                <div className="space-y-3 border-t border-border pt-4">
                  <InfoRow label="Habilidades" value={selectedUser.habilidades} />
                  <InfoRow label="Objetivos curto prazo" value={selectedUser.objetivos_curto_prazo} />
                  <InfoRow label="Objetivos longo prazo" value={selectedUser.objetivos_longo_prazo} />
                  {selectedUser.cargos_aptos && selectedUser.cargos_aptos.length > 0 && (
                    <div>
                      <span className="text-xs text-muted-foreground">Cargos aptos</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedUser.cargos_aptos.map((c) => (
                          <Badge key={c} variant="secondary" className="text-xs capitalize">{c}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Social */}
                <div className="space-y-2 border-t border-border pt-4">
                  {selectedUser.instagram_url && (
                    <a href={selectedUser.instagram_url} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1">
                      Instagram <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {selectedUser.linkedin_url && (
                    <a href={selectedUser.linkedin_url} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1">
                      LinkedIn <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>

                {/* Profile link */}
                <button
                  onClick={() => navigate(`/perfil/${selectedUser.id}`)}
                  className="w-full mt-2 py-2 rounded-lg bg-secondary text-foreground text-sm hover:bg-secondary/80 transition-colors flex items-center justify-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" /> Ver perfil público
                </button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </DashboardLayout>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <span className="text-xs text-muted-foreground">{label}</span>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  );
}
