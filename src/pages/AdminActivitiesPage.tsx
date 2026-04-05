import { useEffect, useState, useCallback, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  CalendarIcon, ClipboardList, Loader2, Pencil, Plus, Trash2,
} from "lucide-react";
import { useTranslation } from "react-i18next";

interface Week {
  id: string;
  number: number;
  title: string;
  is_active: boolean;
}

interface Activity {
  id: string;
  title: string | null;
  description: string | null;
  week_id: string | null;
  deadline: string | null;
  delivery_type: string | null;
  is_required: boolean | null;
  deliveryCount?: number;
}

export default function AdminActivitiesPage() {
  const { t } = useTranslation();

  const DELIVERY_TYPES = useMemo(() => [
    { value: "texto", label: t("adminActivities.deliveryTypes.texto") },
    { value: "link", label: t("adminActivities.deliveryTypes.link") },
    { value: "arquivo", label: t("adminActivities.deliveryTypes.arquivo") },
    { value: "qualquer", label: t("adminActivities.deliveryTypes.qualquer") },
  ], [t]);

  const emptyForm = {
    title: "",
    description: "",
    week_id: "",
    deadline: null as Date | null,
    deadlineTime: "23:59",
    delivery_type: "texto",
    is_required: true,
  };

  const [weeks, setWeeks] = useState<Week[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [deliveryCounts, setDeliveryCounts] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);

  // Form
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<Activity | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [weeksRes, activitiesRes, deliveriesRes] = await Promise.all([
      supabase.from("weeks").select("id, number, title, is_active").order("number"),
      supabase.from("activities").select("*").order("deadline", { ascending: true }),
      supabase.from("deliveries").select("activity_id"),
    ]);
    setWeeks(weeksRes.data ?? []);

    // Count deliveries per activity
    const counts = new Map<string, number>();
    (deliveriesRes.data ?? []).forEach((d) => {
      if (d.activity_id) counts.set(d.activity_id, (counts.get(d.activity_id) ?? 0) + 1);
    });
    setDeliveryCounts(counts);

    setActivities(
      (activitiesRes.data ?? []).map((a) => ({
        ...a,
        deliveryCount: counts.get(a.id) ?? 0,
      }))
    );
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNew = () => {
    setEditId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (a: Activity) => {
    setEditId(a.id);
    const dl = a.deadline ? new Date(a.deadline) : null;
    setForm({
      title: a.title ?? "",
      description: a.description ?? "",
      week_id: a.week_id ?? "",
      deadline: dl,
      deadlineTime: dl ? format(dl, "HH:mm") : "23:59",
      delivery_type: a.delivery_type ?? "texto",
      is_required: a.is_required ?? true,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.description.trim() || !form.week_id) {
      toast({ title: t("common.allFieldsRequired"), variant: "destructive" });
      return;
    }
    setSaving(true);

    let deadline: string | null = null;
    if (form.deadline) {
      const [h, m] = form.deadlineTime.split(":").map(Number);
      const d = new Date(form.deadline);
      d.setHours(h ?? 23, m ?? 59, 0, 0);
      deadline = d.toISOString();
    }

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      week_id: form.week_id,
      deadline,
      delivery_type: form.delivery_type,
      is_required: form.is_required,
    };

    if (editId) {
      const { error } = await supabase.from("activities").update(payload).eq("id", editId);
      if (error) toast({ title: t("common.errorSaving"), description: error.message, variant: "destructive" });
      else toast({ title: t("adminActivities.toastUpdated") });
    } else {
      const { error } = await supabase.from("activities").insert(payload);
      if (error) toast({ title: t("common.errorCreating"), description: error.message, variant: "destructive" });
      else toast({ title: t("adminActivities.toastCreated") });
    }

    setSaving(false);
    setShowForm(false);
    await load();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    // Delete related deliveries first
    await supabase.from("deliveries").delete().eq("activity_id", deleteTarget.id);
    const { error } = await supabase.from("activities").delete().eq("id", deleteTarget.id);
    if (error) toast({ title: t("common.errorRemoving"), description: error.message, variant: "destructive" });
    else toast({ title: t("adminActivities.toastDeleted") });
    setDeleting(false);
    setDeleteTarget(null);
    await load();
  };

  const weekMap = new Map(weeks.map((w) => [w.id, w]));
  const activitiesByWeek = new Map<string, Activity[]>();
  activities.forEach((a) => {
    const wid = a.week_id ?? "none";
    const list = activitiesByWeek.get(wid) ?? [];
    list.push(a);
    activitiesByWeek.set(wid, list);
  });

  return (
    <DashboardLayout title={t("adminActivities.title")}>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-muted-foreground">{t("adminActivities.activitiesCount", { count: activities.length })}</p>
        <Button size="sm" onClick={openNew} className="gap-1.5">
          <Plus className="h-4 w-4" /> {t("adminActivities.newActivity")}
        </Button>
      </div>

      {loading ? (
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card p-6 space-y-3">
              <div className="skeleton-loading h-6 w-40" />
              <div className="skeleton-loading h-16 w-full" />
            </div>
          ))}
        </div>
      ) : weeks.length === 0 ? (
        <div className="glass-card p-8 text-center text-muted-foreground">
          {t("adminActivities.noWeeks")}
        </div>
      ) : (
        <div className="space-y-6">
          {weeks.map((week) => {
            const weekActivities = activitiesByWeek.get(week.id) ?? [];
            return (
              <div key={week.id} className={cn("glass-card overflow-hidden", week.is_active && "ring-1 ring-primary/30")}>
                <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">
                    {t("adminActivities.weekLabel", { number: week.number, title: week.title })}
                  </span>
                  {week.is_active && (
                    <Badge className="bg-primary text-primary-foreground text-xs ml-2">{t("common.active_f")}</Badge>
                  )}
                  <span className="text-xs text-muted-foreground ml-auto">{t("adminActivities.activitiesInWeek", { count: weekActivities.length })}</span>
                </div>
                {weekActivities.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    {t("adminActivities.noActivitiesInWeek")}
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {weekActivities.map((activity) => {
                      const hasDeliveries = (activity.deliveryCount ?? 0) > 0;
                      const isPastDeadline = activity.deadline && new Date(activity.deadline) < new Date();
                      return (
                        <div key={activity.id} className="px-4 py-3 flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium text-foreground">{activity.title}</span>
                              {activity.is_required && (
                                <Badge variant="destructive" className="text-xs">{t("adminActivities.required")}</Badge>
                              )}
                              <Badge variant="secondary" className="text-xs capitalize">
                                {DELIVERY_TYPES.find((t) => t.value === activity.delivery_type)?.label ?? activity.delivery_type}
                              </Badge>
                              {hasDeliveries && (
                                <Badge variant="outline" className="text-xs">
                                  {t("adminActivities.deliveries", { count: activity.deliveryCount })}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{activity.description}</p>
                            {activity.deadline && (
                              <p className={cn("text-xs mt-1", isPastDeadline ? "text-destructive" : "text-muted-foreground")}>
                                {t("adminActivities.deadline", { date: format(new Date(activity.deadline), "dd/MM/yyyy 'às' HH:mm") })}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-1 shrink-0">
                            {!hasDeliveries && (
                              <>
                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(activity)}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setDeleteTarget(activity)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}
                            {hasDeliveries && (
                              <Button size="icon" variant="ghost" className="h-8 w-8 opacity-50 cursor-not-allowed" disabled>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Create / Edit Dialog ── */}
      <Dialog open={showForm} onOpenChange={(o) => !o && setShowForm(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? t("adminActivities.editActivity") : t("adminActivities.createActivity")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">{t("adminActivities.fieldTitle")}</label>
              <Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">{t("adminActivities.fieldDescription")}</label>
              <Textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={3} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">{t("adminActivities.fieldWeek")}</label>
              <Select value={form.week_id} onValueChange={(v) => setForm((p) => ({ ...p, week_id: v }))}>
                <SelectTrigger><SelectValue placeholder={t("adminActivities.selectWeek")} /></SelectTrigger>
                <SelectContent>
                  {weeks.map((w) => (
                    <SelectItem key={w.id} value={w.id}>{t("adminActivities.weekLabel", { number: w.number, title: w.title })}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                    <Calendar
                      mode="single"
                      selected={form.deadline ?? undefined}
                      onSelect={(d) => setForm((p) => ({ ...p, deadline: d ?? null }))}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
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
                <SelectContent>
                  {DELIVERY_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-xs text-muted-foreground font-medium">{t("adminActivities.fieldRequired")}</label>
              <Switch checked={form.is_required} onCheckedChange={(v) => setForm((p) => ({ ...p, is_required: v }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowForm(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editId ? t("common.save") : t("common.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("adminActivities.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("adminActivities.deleteDescription", { title: deleteTarget?.title })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground">
              {deleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {t("common.remove")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
