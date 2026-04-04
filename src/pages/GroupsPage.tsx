import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Users, UserPlus, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
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

const MAX_PER_GROUP = 5;
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

  const fetchData = useCallback(async () => {
    try {
      const [groupsRes, membersRes, configRes, ideasRes] = await Promise.all([
        supabase.from("groups").select("id, name, idea_id"),
        supabase.from("group_members").select("group_id, user_id, cargo"),
        supabase.from("challenge_config").select("joining_open, groups_confirmed").limit(1).maybeSingle(),
        supabase.from("ideas").select("id, title, description"),
      ]);

      const rawGroups = groupsRes.data ?? [];
      const allMembers = (membersRes.data ?? []) as { group_id: string; user_id: string; cargo: string }[];
      const allIdeas = ideasRes.data ?? [];

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

  return (
    <DashboardLayout title="Grupos">
      <p className="text-sm text-muted-foreground mb-6">
        {groups.length} {groups.length === 1 ? "grupo" : "grupos"}
        {!config?.groups_confirmed && " · Aguardando confirmação dos grupos"}
      </p>

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
                  <Badge variant={isFull ? "secondary" : "default"} className="text-xs shrink-0">
                    {group.members.length}/{MAX_PER_GROUP}
                  </Badge>
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

                {/* Join button */}
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    variant={isMyGroup ? "secondary" : "default"}
                    size="sm"
                    className="h-8 text-xs gap-1.5"
                    onClick={(e) => handleJoinClick(group, e)}
                    disabled={!canJoin || !!userMembership || isFull}
                    title={
                      isMyGroup ? "Você já está neste grupo"
                        : userMembership ? "Você já pertence a outro grupo"
                        : !canJoin ? "Entrada em grupos fechada"
                        : isFull ? "Grupo cheio"
                        : "Entrar neste grupo"
                    }
                  >
                    {isMyGroup ? <Users className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
                    {isMyGroup ? "Meu grupo" : `Entrar`}
                  </Button>

                  {missingRequired.length > 0 && (
                    <span className="text-[10px] text-destructive">
                      Falta: {missingRequired.map((c) => c.charAt(0).toUpperCase() + c.slice(1)).join(", ")}
                    </span>
                  )}
                </div>
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
    </DashboardLayout>
  );
}
