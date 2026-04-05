import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  AlertTriangle, ArrowLeft, BookOpen, CalendarIcon, CheckCircle2, ClipboardCheck,
  ClipboardList, Clock, ExternalLink, FileText, FileUp, Link2, Loader2,
  MessageSquare, Pencil, Plus, Send, Trash2, Trophy, Type, Upload,
} from "lucide-react";
import { useTranslation } from "react-i18next";

// ─── Types ───
interface Week { id: string; number: number; title: string; theme: string | null; starts_at: string | null; ends_at: string | null; is_active: boolean }
interface Activity { id: string; title: string | null; description: string | null; week_id: string | null; deadline: string | null; delivery_type: string | null; is_required: boolean | null }
interface Delivery { id: string; activity_id: string | null; group_id: string | null; submitted_by: string | null; submitted_at: string | null; content_text: string | null; content_link: string | null; content_file_url: string | null; admin_feedback: string | null; admin_score: number | null }
interface Criterion { id: string; week_id: string | null; description: string | null; points: number | null }
interface ChecklistEntry { id: string; criterion_id: string | null; group_id: string | null; completed: boolean | null; note: string | null; submitted_by: string | null; submitted_at: string | null }
interface Material { id: string; week_id: string | null; title: string | null; description: string | null; type: string | null; url: string | null; is_required: boolean | null }
interface GroupInfo { id: string; name: string }

type ActivityStatus = "pendente" | "entregue" | "atrasado";
function getActivityStatus(a: Activity, d: Delivery | undefined): ActivityStatus {
  if (d) return "entregue";
  if (a.deadline && new Date(a.deadline) < new Date()) return "atrasado";
  return "pendente";
}

export default function WeekDetailPage() {
  const { t } = useTranslation();
  const { weekId } = useParams<{ weekId: string }>();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const isAdmin = profile?.role === "admin";
  const isLider = profile?.role === "lider";
  const isRepresentante = profile?.role === "representante";
  const groupId = profile?.group_id;
  const rolePrefix = isAdmin ? "/admin" : isLider ? "/lider" : "/participante";

  const [week, setWeek] = useState<Week | null>(null);
  const [loading, setLoading] = useState(true);

  // Shared data
  const [activities, setActivities] = useState<Activity[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [checklistEntries, setChecklistEntries] = useState<ChecklistEntry[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [deliveryCounts, setDeliveryCounts] = useState<Map<string, number>>(new Map());
  const [hasChecklistSubmissions, setHasChecklistSubmissions] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    if (!weekId) return;
    setLoading(true);
    const [weekRes, activitiesRes, deliveriesRes, criteriaRes, entriesRes, materialsRes, groupsRes] = await Promise.all([
      supabase.from("weeks").select("*").eq("id", weekId).maybeSingle(),
      supabase.from("activities").select("*").eq("week_id", weekId).order("deadline"),
      supabase.from("deliveries").select("*"),
      supabase.from("checklist_criteria").select("*").eq("week_id", weekId).order("description"),
      supabase.from("checklist_entries").select("*"),
      supabase.from("materials").select("*").eq("week_id", weekId).order("title"),
      supabase.from("groups").select("id, name").order("name"),
    ]);

    setWeek(weekRes.data);
    setActivities(activitiesRes.data ?? []);
    setDeliveries((deliveriesRes.data ?? []) as Delivery[]);
    setCriteria(criteriaRes.data ?? []);
    setChecklistEntries((entriesRes.data ?? []) as ChecklistEntry[]);
    setMaterials(materialsRes.data ?? []);
    setGroups(groupsRes.data ?? []);

    // Delivery counts per activity
    const counts = new Map<string, number>();
    (deliveriesRes.data ?? []).forEach((d: any) => {
      if (d.activity_id) counts.set(d.activity_id, (counts.get(d.activity_id) ?? 0) + 1);
    });
    setDeliveryCounts(counts);

    // Checklist submissions
    const subIds = new Set<string>();
    (entriesRes.data ?? []).forEach((e: any) => { if (e.criterion_id) subIds.add(e.criterion_id); });
    setHasChecklistSubmissions(subIds);

    setLoading(false);
  }, [weekId]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <DashboardLayout title={t("common.week")}>
        <div className="space-y-4">
          <div className="skeleton-loading h-8 w-48" />
          <div className="skeleton-loading h-64 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!week) {
    return (
      <DashboardLayout title={t("common.week")}>
        <div className="glass-card p-8 text-center text-muted-foreground">{t("weeks.notFound")}</div>
      </DashboardLayout>
    );
  }

  const showDeliveries = isAdmin || isLider;

  return (
    <DashboardLayout title={t("weeks.weekDetailTitle", { number: week.number, title: week.title })} breadcrumbLabel={t("weeks.weekDetailTitle", { number: week.number, title: week.title })}>
      <Button variant="ghost" size="sm" onClick={() => navigate(`${rolePrefix}/semanas`)} className="gap-1.5 mb-4">
        <ArrowLeft className="h-4 w-4" /> {t("common.back")}
      </Button>

      {week.theme && (
        <p className="text-sm text-muted-foreground mb-4">{t("adminWeeks.fieldTheme")}: {week.theme}</p>
      )}

      <Tabs defaultValue="materiais" className="space-y-4">
        <TabsList className="w-full justify-start flex-wrap h-auto gap-1 bg-secondary/30 p-1">
          <TabsTrigger value="materiais" className="gap-1.5 text-xs"><BookOpen className="h-3.5 w-3.5" /> {t("weeks.tabs.materials")}</TabsTrigger>
          <TabsTrigger value="atividades" className="gap-1.5 text-xs"><ClipboardList className="h-3.5 w-3.5" /> {t("weeks.tabs.activities")}</TabsTrigger>
          <TabsTrigger value="checklist" className="gap-1.5 text-xs"><ClipboardCheck className="h-3.5 w-3.5" /> {t("weeks.tabs.checklist")}</TabsTrigger>
          {showDeliveries && (
            <TabsTrigger value="entregas" className="gap-1.5 text-xs"><Send className="h-3.5 w-3.5" /> {t("weeks.tabs.deliveries")}</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="materiais">
          <MaterialsTab weekId={week.id} materials={materials} isAdmin={isAdmin} onReload={load} />
        </TabsContent>
        <TabsContent value="atividades">
          <ActivitiesTab
            weekId={week.id}
            activities={activities}
            deliveries={deliveries}
            deliveryCounts={deliveryCounts}
            isAdmin={isAdmin}
            isRepresentante={isRepresentante ?? false}
            groupId={groupId ?? null}
            profileId={profile?.id ?? null}
            onReload={load}
          />
        </TabsContent>
        <TabsContent value="checklist">
          <ChecklistTab
            weekId={week.id}
            criteria={criteria}
            entries={checklistEntries}
            hasSubmissions={hasChecklistSubmissions}
            isAdmin={isAdmin}
            isRepresentante={isRepresentante ?? false}
            groupId={groupId ?? null}
            profileId={profile?.id ?? null}
            onReload={load}
          />
        </TabsContent>
        {showDeliveries && (
          <TabsContent value="entregas">
            <DeliveriesTab
              activities={activities}
              deliveries={deliveries}
              groups={groups}
              isAdmin={isAdmin}
              onReload={load}
            />
          </TabsContent>
        )}
      </Tabs>
    </DashboardLayout>
  );
}

// ─── MATERIALS TAB ───
function MaterialsTab({ weekId, materials, isAdmin, onReload }: { weekId: string; materials: Material[]; isAdmin: boolean; onReload: () => Promise<void> }) {
  const { t } = useTranslation();
  
  const MATERIAL_TYPES = useMemo(() => [
    { value: "leitura", label: t("materials.types.leitura") },
    { value: "video", label: t("materials.types.video") },
    { value: "template", label: t("materials.types.template") },
    { value: "ferramenta", label: t("materials.types.ferramenta") },
  ], [t]);

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", description: "", type: "leitura", url: "", is_required: false });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Material | null>(null);

  const openNew = () => { setEditId(null); setForm({ title: "", description: "", type: "leitura", url: "", is_required: false }); setShowForm(true); };
  const openEdit = (m: Material) => {
    setEditId(m.id);
    setForm({ title: m.title ?? "", description: m.description ?? "", type: m.type ?? "leitura", url: m.url ?? "", is_required: m.is_required ?? false });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { toast({ title: t("materials.errorTitleRequired"), variant: "destructive" }); return; }
    setSaving(true);
    const payload = { week_id: weekId, title: form.title.trim(), description: form.description.trim() || null, type: form.type, url: form.url.trim() || null, is_required: form.is_required };
    if (editId) {
      await supabase.from("materials").update(payload).eq("id", editId);
      toast({ title: t("materials.toastUpdated") });
    } else {
      await supabase.from("materials").insert(payload);
      toast({ title: t("materials.toastCreated") });
    }
    setSaving(false);
    setShowForm(false);
    await onReload();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await supabase.from("materials").delete().eq("id", deleteTarget.id);
    toast({ title: t("materials.toastDeleted") });
    setDeleteTarget(null);
    await onReload();
  };

  const required = materials.filter((m) => m.is_required);
  const optional = materials.filter((m) => !m.is_required);

  return (
    <>
      {isAdmin && (
        <div className="flex justify-end mb-4">
          <Button size="sm" onClick={openNew} className="gap-1.5"><Plus className="h-4 w-4" /> {t("materials.publishMaterial")}</Button>
        </div>
      )}

      {materials.length === 0 ? (
        <div className="glass-card p-8 text-center text-muted-foreground">{t("materials.noMaterials")}</div>
      ) : (
        <div className="space-y-3">
          {required.length > 0 && (
            <>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{t("common.required_plural")}</p>
              {required.map((m) => <MaterialCard key={m.id} material={m} isAdmin={isAdmin} onEdit={openEdit} onDelete={setDeleteTarget} />)}
            </>
          )}
          {optional.length > 0 && (
            <>
              {required.length > 0 && <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mt-4">{t("common.optional_plural")}</p>}
              {optional.map((m) => <MaterialCard key={m.id} material={m} isAdmin={isAdmin} onEdit={openEdit} onDelete={setDeleteTarget} />)}
            </>
          )}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={(o) => !o && setShowForm(false)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? t("materials.editMaterial") : t("materials.publishMaterial")}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">{t("materials.fieldTitle")} *</label>
              <Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">{t("materials.fieldDescription")}</label>
              <Textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={2} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">{t("materials.fieldType")}</label>
              <Select value={form.type} onValueChange={(v) => setForm((p) => ({ ...p, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MATERIAL_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">{t("materials.fieldUrl")}</label>
              <Input value={form.url} onChange={(e) => setForm((p) => ({ ...p, url: e.target.value }))} placeholder="https://..." />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-xs text-muted-foreground font-medium">{t("materials.fieldRequired")}</label>
              <Switch checked={form.is_required} onCheckedChange={(v) => setForm((p) => ({ ...p, is_required: v }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowForm(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleSave} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}{editId ? t("common.save") : t("common.publish")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("materials.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("materials.deleteDescription", { title: deleteTarget?.title })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">{t("common.remove")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function MaterialCard({ material, isAdmin, onEdit, onDelete }: { material: Material; isAdmin: boolean; onEdit: (m: Material) => void; onDelete: (m: Material) => void }) {
  const { t } = useTranslation();
  return (
    <div className={cn("glass-card p-4 flex items-start gap-3", material.is_required && "border-l-2 border-l-primary")}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-foreground">{material.title}</span>
          <Badge variant="secondary" className="text-xs capitalize">{t(`materials.types.${material.type}`)}</Badge>
          {material.is_required && <Badge variant="destructive" className="text-xs">{t("common.required")}</Badge>}
        </div>
        {material.description && <p className="text-xs text-muted-foreground mt-1">{material.description}</p>}
        {material.url && (
          <a href={material.url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1 mt-1">
            <ExternalLink className="h-3 w-3" /> {t("common.access")}
          </a>
        )}
      </div>
      {isAdmin && (
        <div className="flex gap-1 shrink-0">
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onEdit(material)}><Pencil className="h-3.5 w-3.5" /></Button>
          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => onDelete(material)}><Trash2 className="h-3.5 w-3.5" /></Button>
        </div>
      )}
    </div>
  );
}

// ─── ACTIVITIES TAB ───
function ActivitiesTab({ weekId, activities, deliveries, deliveryCounts, isAdmin, isRepresentante, groupId, profileId, onReload }: {
  weekId: string; activities: Activity[]; deliveries: Delivery[]; deliveryCounts: Map<string, number>;
  isAdmin: boolean; isRepresentante: boolean; groupId: string | null; profileId: string | null; onReload: () => Promise<void>;
}) {
  const { t } = useTranslation();
  
  const DELIVERY_TYPES = useMemo(() => [
    { value: "texto", label: t("adminActivities.deliveryTypes.texto") },
    { value: "link", label: t("adminActivities.deliveryTypes.link") },
    { value: "arquivo", label: t("adminActivities.deliveryTypes.arquivo") },
    { value: "qualquer", label: t("adminActivities.deliveryTypes.qualquer") },
  ], [t]);

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const emptyForm = { title: "", description: "", deadline: null as Date | null, deadlineTime: "23:59", delivery_type: "texto", is_required: true };
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Activity | null>(null);

  // Delivery modal
  const [deliverTarget, setDeliverTarget] = useState<Activity | null>(null);
  const [existingDelivery, setExistingDelivery] = useState<Delivery | null>(null);
  const [deliveryType, setDeliveryType] = useState<"texto" | "link" | "arquivo">("texto");
  const [contentText, setContentText] = useState("");
  const [contentLink, setContentLink] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const openNewActivity = () => { setEditId(null); setForm(emptyForm); setShowForm(true); };
  const openEditActivity = (a: Activity) => {
    setEditId(a.id);
    const dl = a.deadline ? new Date(a.deadline) : null;
    setForm({ title: a.title ?? "", description: a.description ?? "", deadline: dl, deadlineTime: dl ? format(dl, "HH:mm") : "23:59", delivery_type: a.delivery_type ?? "texto", is_required: a.is_required ?? true });
    setShowForm(true);
  };

  const handleSaveActivity = async () => {
    if (!form.title.trim() || !form.description.trim()) { toast({ title: t("common.allFieldsRequired"), variant: "destructive" }); return; }
    setSaving(true);
    let deadline: string | null = null;
    if (form.deadline) {
      const [h, m] = form.deadlineTime.split(":").map(Number);
      const d = new Date(form.deadline);
      d.setHours(h ?? 23, m ?? 59, 0, 0);
      deadline = d.toISOString();
    }
    const payload = { title: form.title.trim(), description: form.description.trim(), week_id: weekId, deadline, delivery_type: form.delivery_type, is_required: form.is_required };
    if (editId) { await supabase.from("activities").update(payload).eq("id", editId); toast({ title: t("adminActivities.toastUpdated") }); }
    else { await supabase.from("activities").insert(payload); toast({ title: t("adminActivities.toastCreated") }); }
    setSaving(false); setShowForm(false); await onReload();
  };

  const handleDeleteActivity = async () => {
    if (!deleteTarget) return;
    await supabase.from("deliveries").delete().eq("activity_id", deleteTarget.id);
    await supabase.from("activities").delete().eq("id", deleteTarget.id);
    toast({ title: t("adminActivities.toastDeleted") }); setDeleteTarget(null); await onReload();
  };

  const openDeliver = (activity: Activity) => {
    const existing = deliveries.find((d) => d.activity_id === activity.id && d.group_id === groupId);
    setDeliverTarget(activity);
    setExistingDelivery(existing ?? null);
    const dt = activity.delivery_type;
    setDeliveryType(dt === "link" ? "link" : dt === "arquivo" ? "arquivo" : "texto");
    setContentText(existing?.content_text ?? "");
    setContentLink(existing?.content_link ?? "");
    setFile(null);
  };

  const handleSubmitDelivery = async () => {
    if (!deliverTarget || !groupId || !profileId) return;
    setSubmitting(true);
    try {
      let fileUrl: string | null = existingDelivery?.content_file_url ?? null;
      if (deliveryType === "arquivo" && file) {
        const ext = file.name.split(".").pop();
        const path = `${groupId}/${deliverTarget.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("deliveres").upload(path, file, { upsert: true });
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from("deliveres").getPublicUrl(path);
        fileUrl = urlData.publicUrl;
      }
      const payload = {
        activity_id: deliverTarget.id, group_id: groupId, submitted_by: profileId,
        submitted_at: new Date().toISOString(),
        content_text: deliveryType === "texto" ? contentText.trim() || null : null,
        content_link: deliveryType === "link" ? contentLink.trim() || null : null,
        content_file_url: deliveryType === "arquivo" ? fileUrl : null,
      };
      if (existingDelivery) { await supabase.from("deliveries").update(payload).eq("id", existingDelivery.id); toast({ title: t("adminActivities.toastUpdated") }); }
      else { await supabase.from("deliveries").insert(payload); toast({ title: t("adminActivities.toastCreated") }); }
      setDeliverTarget(null); await onReload();
    } catch (err: any) { toast({ title: t("common.error"), description: err.message, variant: "destructive" }); }
    finally { setSubmitting(false); }
  };

  const canDeliver = (a: Activity) => {
    if (!isRepresentante) return false;
    const past = a.deadline && new Date(a.deadline) < new Date();
    if (past) return false;
    return true;
  };

  const groupDeliveries = deliveries.filter((d) => d.group_id === groupId);

  return (
    <>
      {isAdmin && (
        <div className="flex justify-end mb-4">
          <Button size="sm" onClick={openNewActivity} className="gap-1.5"><Plus className="h-4 w-4" /> {t("adminActivities.newActivity")}</Button>
        </div>
      )}

      {activities.length === 0 ? (
        <div className="glass-card p-8 text-center text-muted-foreground">{t("adminActivities.noActivitiesInWeek")}</div>
      ) : (
        <div className="space-y-3">
          {activities.map((activity) => {
            const delivery = groupDeliveries.find((d) => d.activity_id === activity.id);
            const status = getActivityStatus(activity, delivery);
            const hasDeliveries = (deliveryCounts.get(activity.id) ?? 0) > 0;

            return (
              <div key={activity.id} className={cn("glass-card p-4 space-y-2", activity.is_required && "border-l-2 border-l-primary")}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-foreground">{activity.title}</span>
                      {activity.is_required && <Badge variant="destructive" className="text-xs">{t("adminActivities.required")}</Badge>}
                      <Badge variant="secondary" className="text-xs capitalize">
                        {DELIVERY_TYPES.find((t) => t.value === activity.delivery_type)?.label ?? activity.delivery_type}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{activity.description}</p>
                    {activity.deadline && (
                      <p className={cn("text-xs mt-1", status === "atrasado" ? "text-destructive" : "text-muted-foreground")}>
                        {t("adminActivities.deadline", { date: format(new Date(activity.deadline), `dd/MM/yyyy '${t("common.at")}' HH:mm`) })}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {!isAdmin && (
                      <Badge className={cn("text-xs gap-1",
                        status === "entregue" ? "bg-primary/20 text-primary" : status === "atrasado" ? "bg-destructive/20 text-destructive" : "bg-secondary text-muted-foreground"
                      )}>
                        {status === "entregue" && <><CheckCircle2 className="h-3 w-3" /> {t("deliveries.statusEntregue")}</>}
                        {status === "pendente" && <><Clock className="h-3 w-3" /> {t("deliveries.statusPendente")}</>}
                        {status === "atrasado" && <><AlertTriangle className="h-3 w-3" /> {t("deliveries.statusAtrasado")}</>}
                      </Badge>
                    )}
                    {isAdmin && !hasDeliveries && (
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEditActivity(activity)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setDeleteTarget(activity)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    )}
                    {isAdmin && hasDeliveries && (
                      <Badge variant="outline" className="text-xs">{t("adminActivities.deliveries", { count: deliveryCounts.get(activity.id) })}</Badge>
                    )}
                  </div>
                </div>

                {isRepresentante && (
                  <div>
                    {canDeliver(activity) ? (
                      <Button size="sm" onClick={() => openDeliver(activity)} className="gap-1.5">
                        <Send className="h-3.5 w-3.5" /> {delivery ? t("common.resubmit") : t("common.deliver")}
                      </Button>
                    ) : delivery ? (
                      <p className="text-xs text-primary">{t("deliveries.submittedAt", { date: format(new Date(delivery.submitted_at!), `dd/MM/yyyy '${t("common.at")}' HH:mm`) })}</p>
                    ) : status === "atrasado" ? (
                      <p className="text-xs text-destructive">{t("adminActivities.deadlinePassed")}</p>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Activity Form Dialog */}
      <Dialog open={showForm} onOpenChange={(o) => !o && setShowForm(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editId ? t("adminActivities.editActivity") : t("adminActivities.newActivity")}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">{t("adminActivities.fieldTitle")} *</label>
              <Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">{t("adminActivities.fieldDescription")} *</label>
              <Textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-medium">{t("adminActivities.fieldDeadlineDate")}</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !form.deadline && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.deadline ? format(form.deadline, "dd/MM/yyyy") : t("adminActivities.selectDate")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={form.deadline ?? undefined} onSelect={(d) => setForm((p) => ({ ...p, deadline: d ?? null }))} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-medium">{t("adminActivities.fieldDeadlineTime")}</label>
                <Input type="time" value={form.deadlineTime} onChange={(e) => setForm((p) => ({ ...p, deadlineTime: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">{t("adminActivities.fieldDeliveryType")}</label>
              <Select value={form.delivery_type} onValueChange={(v) => setForm((p) => ({ ...p, delivery_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DELIVERY_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-xs text-muted-foreground font-medium">{t("adminActivities.fieldRequired")}</label>
              <Switch checked={form.is_required} onCheckedChange={(v) => setForm((p) => ({ ...p, is_required: v }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowForm(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleSaveActivity} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}{editId ? t("common.save") : t("common.create")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Activity */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>{t("adminActivities.deleteTitle")}</AlertDialogTitle><AlertDialogDescription>{t("adminActivities.deleteDescription", { title: deleteTarget?.title })}</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel><AlertDialogAction onClick={handleDeleteActivity} className="bg-destructive text-destructive-foreground">{t("common.remove")}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delivery Modal */}
      <Dialog open={!!deliverTarget} onOpenChange={(o) => !o && setDeliverTarget(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{existingDelivery ? t("deliveries.updateDelivery") : t("deliveries.submitActivity")}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">{deliverTarget?.title}</p>
          {deliverTarget?.delivery_type === "qualquer" && (
            <div className="flex gap-2">
              {(["texto", "link", "arquivo"] as const).map((ti) => (
                <Button key={ti} size="sm" variant={deliveryType === ti ? "default" : "outline"} onClick={() => setDeliveryType(ti)} className="gap-1 capitalize">
                  {ti === "texto" && <Type className="h-3.5 w-3.5" />}{ti === "link" && <Link2 className="h-3.5 w-3.5" />}{ti === "arquivo" && <FileUp className="h-3.5 w-3.5" />}{t(`adminActivities.deliveryTypes.${ti}`)}
                </Button>
              ))}
            </div>
          )}
          <div className="space-y-3">
            {deliveryType === "texto" && <Textarea placeholder={t("deliveries.textPlaceholder")} value={contentText} onChange={(e) => setContentText(e.target.value)} rows={6} />}
            {deliveryType === "link" && <Input type="url" placeholder="https://..." value={contentLink} onChange={(e) => setContentLink(e.target.value)} />}
            {deliveryType === "arquivo" && (
              <div className="space-y-2">
                <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                <Button variant="outline" onClick={() => fileRef.current?.click()} className="w-full gap-2">
                  <Upload className="h-4 w-4" />{file ? file.name : t("deliveries.filePlaceholder")}
                </Button>
                {file && file.size > 10 * 1024 * 1024 && <p className="text-xs text-destructive">{t("deliveries.errorFileTooLarge")}</p>}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeliverTarget(null)}>{t("common.cancel")}</Button>
            <Button onClick={handleSubmitDelivery} disabled={submitting || (deliveryType === "texto" && !contentText.trim()) || (deliveryType === "link" && !contentLink.trim()) || (deliveryType === "arquivo" && !file && !existingDelivery?.content_file_url)}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}{existingDelivery ? t("common.update") : t("common.send")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── CHECKLIST TAB ───
function ChecklistTab({ weekId, criteria, entries, hasSubmissions, isAdmin, isRepresentante, groupId, profileId, onReload }: {
  weekId: string; criteria: Criterion[]; entries: ChecklistEntry[]; hasSubmissions: Set<string>;
  isAdmin: boolean; isRepresentante: boolean; groupId: string | null; profileId: string | null; onReload: () => Promise<void>;
}) {
  const { t } = useTranslation();
  // Admin CRUD
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Criterion | null>(null);
  const [formDesc, setFormDesc] = useState("");
  const [formPoints, setFormPoints] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Criterion | null>(null);

  // Representante state
  const groupEntries = entries.filter((e) => e.group_id === groupId && criteria.some((c) => c.id === e.criterion_id));
  const submitted = groupEntries.length > 0;
  const [toggles, setToggles] = useState<Map<string, boolean>>(new Map());
  const [notes, setNotes] = useState<Map<string, string>>(new Map());
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const tMap = new Map<string, boolean>();
    const nMap = new Map<string, string>();
    groupEntries.forEach((e) => {
      if (e.criterion_id) { tMap.set(e.criterion_id, e.completed ?? false); nMap.set(e.criterion_id, e.note ?? ""); }
    });
    if (tMap.size === 0) { criteria.forEach((c) => { tMap.set(c.id, false); nMap.set(c.id, ""); }); }
    setToggles(tMap);
    setNotes(nMap);
  }, [criteria, entries, groupId]);

  const totalPoints = criteria.reduce((s, c) => (toggles.get(c.id) ? s + (c.points ?? 0) : s), 0);
  const maxPoints = criteria.reduce((s, c) => s + (c.points ?? 0), 0);

  // Admin handlers
  const openCreate = () => { setEditing(null); setFormDesc(""); setFormPoints(""); setDialogOpen(true); };
  const openEdit = (c: Criterion) => { setEditing(c); setFormDesc(c.description ?? ""); setFormPoints(String(c.points ?? "")); setDialogOpen(true); };

  const handleSaveCriterion = async () => {
    if (!formDesc.trim() || !formPoints.trim()) { toast({ title: t("common.allFieldsRequired"), variant: "destructive" }); return; }
    setSaving(true);
    if (editing) { await supabase.from("checklist_criteria").update({ description: formDesc.trim(), points: parseInt(formPoints) }).eq("id", editing.id); toast({ title: t("adminChecklist.toastUpdated") }); }
    else { await supabase.from("checklist_criteria").insert({ week_id: weekId, description: formDesc.trim(), points: parseInt(formPoints) }); toast({ title: t("adminChecklist.toastCreated") }); }
    setSaving(false); setDialogOpen(false); await onReload();
  };

  const handleDeleteCriterion = async () => {
    if (!deleteTarget) return;
    await supabase.from("checklist_criteria").delete().eq("id", deleteTarget.id);
    toast({ title: t("adminChecklist.toastDeleted") }); setDeleteTarget(null); await onReload();
  };

  // Representante submit
  const handleSubmitChecklist = async () => {
    if (!groupId || !profileId) return;
    setSubmitting(true);
    try {
      for (const c of criteria) {
        const existing = groupEntries.find((e) => e.criterion_id === c.id);
        const payload = { criterion_id: c.id, group_id: groupId, completed: toggles.get(c.id) ?? false, note: notes.get(c.id)?.trim() || null, submitted_by: profileId, submitted_at: new Date().toISOString() };
        if (existing) { await supabase.from("checklist_entries").update(payload).eq("id", existing.id); }
        else { await supabase.from("checklist_entries").insert(payload); }
      }
      toast({ title: t("adminChecklist.toastChecklistSent", { points: totalPoints, max: maxPoints }) });
      await onReload();
    } catch (err: any) { toast({ title: t("common.error"), description: err.message, variant: "destructive" }); }
    finally { setSubmitting(false); }
  };

  if (isAdmin) {
    return (
      <>
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-muted-foreground">{t("adminChecklist.criteriaCount", { count: criteria.length, max: maxPoints })}</span>
          <Button size="sm" onClick={openCreate} className="gap-1.5"><Plus className="h-4 w-4" /> {t("adminChecklist.newCriterion")}</Button>
        </div>
        {criteria.length === 0 ? (
          <div className="glass-card p-8 text-center text-muted-foreground">{t("adminChecklist.noCriteria")}</div>
        ) : (
          <div className="space-y-3">
            {criteria.map((c) => {
              const locked = hasSubmissions.has(c.id);
              return (
                <div key={c.id} className="glass-card p-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{c.description}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t("common.points", { count: c.points })}</p>
                  </div>
                  {locked && <Badge variant="outline" className="text-xs text-muted-foreground shrink-0">{t("adminChecklist.hasDeliveries")}</Badge>}
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(c)} disabled={locked} className={cn(locked && "opacity-40")}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? t("adminChecklist.editCriterion") : t("adminChecklist.newCriterion")}</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div><label className="text-sm font-medium text-foreground mb-1.5 block">{t("adminChecklist.fieldDescription")}</label><Input value={formDesc} onChange={(e) => setFormDesc(e.target.value)} placeholder={t("adminChecklist.descriptionPlaceholder")} /></div>
              <div><label className="text-sm font-medium text-foreground mb-1.5 block">{t("adminChecklist.fieldPoints")}</label><Input type="number" value={formPoints} onChange={(e) => setFormPoints(e.target.value)} placeholder="10" min={1} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>{t("common.cancel")}</Button>
              <Button onClick={handleSaveCriterion} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}{editing ? t("common.save") : t("common.create")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>{t("adminChecklist.deleteCriterionTitle")}</AlertDialogTitle><AlertDialogDescription>{t("adminChecklist.deleteCriterionDescription", { description: deleteTarget?.description })}</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel><AlertDialogAction onClick={handleDeleteCriterion}>{t("common.delete")}</AlertDialogAction></AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  // Participant / Representante view
  return (
    <>
      {criteria.length === 0 ? (
        <div className="glass-card p-8 text-center text-muted-foreground">{t("adminChecklist.noCriteria")}</div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-muted-foreground">{totalPoints}/{maxPoints} {t("common.points_plural")}</span>
          </div>
          <div className="space-y-3">
            {criteria.map((c) => {
              const checked = toggles.get(c.id) ?? false;
              const note = notes.get(c.id) ?? "";
              return (
                <div key={c.id} className={cn("glass-card p-4 space-y-3 transition-all", checked && "ring-1 ring-primary/30 bg-primary/5")}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-sm text-foreground font-medium">{c.description}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{t("common.points", { count: c.points })}</p>
                    </div>
                    {isRepresentante && !submitted ? (
                      <Switch checked={checked} onCheckedChange={(v) => setToggles((prev) => new Map(prev).set(c.id, v))} />
                    ) : (
                      <Badge className={cn("text-xs", checked ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground")}>
                        {checked ? <><CheckCircle2 className="h-3 w-3 mr-1" /> {t("adminChecklist.done")}</> : t("adminChecklist.notDone")}
                      </Badge>
                    )}
                  </div>
                  {isRepresentante && !submitted ? (
                    <Textarea placeholder={t("adminChecklist.notePlaceholder")} value={note} onChange={(e) => setNotes((prev) => new Map(prev).set(c.id, e.target.value))} rows={2} className="text-sm" />
                  ) : note ? (
                    <p className="text-xs text-muted-foreground bg-secondary/30 rounded p-2">{note}</p>
                  ) : null}
                </div>
              );
            })}
          </div>
          {isRepresentante && (
            <div className="mt-6">
              {submitted ? (
                <div className="glass-card p-4 flex items-center gap-2 text-primary">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-sm">{t("adminChecklist.submitted")}</span>
                </div>
              ) : (
                <Button onClick={handleSubmitChecklist} disabled={submitting} className="w-full gap-1.5">
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  <ClipboardCheck className="h-4 w-4" /> {t("adminChecklist.submitButton", { points: totalPoints, max: maxPoints })}
                </Button>
              )}
            </div>
          )}
        </>
      )}
    </>
  );
}

// ─── DELIVERIES TAB ───
function DeliveriesTab({ activities, deliveries, groups, isAdmin, onReload }: {
  activities: Activity[]; deliveries: Delivery[]; groups: GroupInfo[]; isAdmin: boolean; onReload: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<GroupInfo | null>(null);
  const [feedback, setFeedback] = useState("");
  const [score, setScore] = useState("");
  const [savingFeedback, setSavingFeedback] = useState(false);

  const getDelivery = (aId: string, gId: string) => deliveries.find((d) => d.activity_id === aId && d.group_id === gId);
  const getCellStatus = (a: Activity, d: Delivery | undefined) => {
    if (d) return "entregue";
    if (a.deadline && new Date(a.deadline) < new Date()) return "atrasado";
    return "pendente";
  };

  const openDetail = (a: Activity, g: GroupInfo) => {
    const del = getDelivery(a.id, g.id);
    setSelectedActivity(a); setSelectedGroup(g); setSelectedDelivery(del ?? null); setFeedback(del?.admin_feedback ?? ""); setScore(del?.admin_score != null ? String(del.admin_score) : "");
  };

  const handleSaveFeedback = async () => {
    if (!selectedDelivery) return;
    const parsedScore = score.trim() === "" ? null : parseInt(score, 10);
    if (parsedScore !== null && (isNaN(parsedScore) || parsedScore < 0 || parsedScore > 100)) {
      toast({ title: t("deliveries.errorScoreRange"), variant: "destructive" }); return;
    }
    setSavingFeedback(true);
    await supabase.from("deliveries").update({ admin_feedback: feedback.trim() || null, admin_score: parsedScore }).eq("id", selectedDelivery.id);
    toast({ title: t("deliveries.toastFeedbackSaved") }); setSavingFeedback(false); await onReload();
  };

  const hasLate = (gId: string) => activities.some((a) => getCellStatus(a, getDelivery(a.id, gId)) === "atrasado");

  const CELL_STYLES: Record<string, string> = {
    entregue: "bg-primary/10 text-primary",
    pendente: "bg-secondary text-muted-foreground",
    atrasado: "bg-destructive/10 text-destructive",
  };

  if (activities.length === 0) return <div className="glass-card p-8 text-center text-muted-foreground">{t("adminActivities.noActivitiesInWeek")}</div>;
  if (groups.length === 0) return <div className="glass-card p-8 text-center text-muted-foreground">{t("groups.noGroupsYet")}</div>;

  return (
    <>
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground sticky left-0 bg-card z-10">{t("common.group")}</th>
                {activities.map((a) => (
                  <th key={a.id} className="text-center px-3 py-3 font-medium text-muted-foreground min-w-[120px]">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-xs">{a.title}</span>
                      {a.is_required && <Badge variant="destructive" className="text-[10px] px-1">{t("adminActivities.requiredShort")}</Badge>}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => {
                const late = hasLate(g.id);
                return (
                  <tr key={g.id} className={cn("border-b border-border last:border-0", late && "bg-destructive/5")}>
                    <td className={cn("px-4 py-3 font-medium text-foreground sticky left-0 bg-card z-10", late && "bg-destructive/5")}>
                      <div className="flex items-center gap-1.5">
                        {late && <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />}
                        <span className="truncate">{g.name}</span>
                      </div>
                    </td>
                    {activities.map((a) => {
                      const del = getDelivery(a.id, g.id);
                      const status = getCellStatus(a, del);
                      return (
                        <td key={a.id} className="px-3 py-3 text-center">
                          <button onClick={() => openDetail(a, g)} className={cn("inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full transition-colors hover:opacity-80", CELL_STYLES[status])}>
                            {status === "entregue" && <CheckCircle2 className="h-3 w-3" />}
                            {status === "pendente" && <Clock className="h-3 w-3" />}
                            {status === "atrasado" && <AlertTriangle className="h-3 w-3" />}
                            {status === "entregue" ? (del?.admin_score != null ? `${del.admin_score}pts` : t("deliveries.statusEntregue")) : status === "pendente" ? t("deliveries.statusPendente") : t("deliveries.statusAtrasado")}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Sheet open={!!selectedActivity && !!selectedGroup} onOpenChange={(o) => { if (!o) { setSelectedActivity(null); setSelectedGroup(null); setSelectedDelivery(null); } }}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader><SheetTitle>{selectedGroup?.name}</SheetTitle></SheetHeader>
          <div className="mt-4 space-y-4">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{t("adminActivities.title")}</p>
              <p className="text-sm text-foreground font-medium mt-1">{selectedActivity?.title}</p>
              <p className="text-xs text-muted-foreground mt-1">{selectedActivity?.description}</p>
            </div>
            {selectedDelivery ? (
              <>
                <div className="border-t border-border pt-4 space-y-3">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{t("weeks.tabs.deliveries")}</p>
                  <p className="text-xs text-muted-foreground">{t("deliveries.submittedAt", { date: format(new Date(selectedDelivery.submitted_at!), `dd/MM/yyyy '${t("common.at")}' HH:mm`) })}</p>
                  {selectedDelivery.content_text && <div className="bg-secondary/50 rounded-lg p-3"><p className="text-sm text-foreground whitespace-pre-wrap">{selectedDelivery.content_text}</p></div>}
                  {selectedDelivery.content_link && <a href={selectedDelivery.content_link} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1"><ExternalLink className="h-3.5 w-3.5" /> {selectedDelivery.content_link}</a>}
                  {selectedDelivery.content_file_url && <a href={selectedDelivery.content_file_url} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> {t("common.viewFile")}</a>}
                </div>
                {isAdmin && (
                  <div className="border-t border-border pt-4 space-y-3">
                    <div>
                      <div className="flex items-center gap-1.5 mb-1.5"><Trophy className="h-3.5 w-3.5 text-primary" /><p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{t("deliveries.fieldScore")} (0–100)</p></div>
                      <Input type="number" min={0} max={100} value={score} onChange={(e) => setScore(e.target.value)} placeholder="Ex: 85" className="w-32" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 mb-1.5"><MessageSquare className="h-3.5 w-3.5 text-muted-foreground" /><p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{t("deliveries.fieldFeedback")}</p></div>
                      <Textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder={t("deliveries.feedbackPlaceholder")} rows={4} />
                    </div>
                    <Button size="sm" onClick={handleSaveFeedback} disabled={savingFeedback} className="gap-1">
                      {savingFeedback && <Loader2 className="h-3.5 w-3.5 animate-spin" />}<Send className="h-3.5 w-3.5" /> {t("deliveries.saveFeedback")}
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="border-t border-border pt-4"><p className="text-sm text-muted-foreground">{t("deliveries.noDeliveriesYet")}</p></div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
