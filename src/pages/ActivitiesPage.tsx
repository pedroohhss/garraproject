import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  AlertTriangle, CheckCircle2, Clock, FileUp, Link2, Loader2, Send, Type, Upload,
} from "lucide-react";
import { useTranslation } from "react-i18next";

interface Activity {
  id: string;
  title: string | null;
  description: string | null;
  week_id: string | null;
  deadline: string | null;
  delivery_type: string | null;
  is_required: boolean | null;
}

interface Delivery {
  id: string;
  activity_id: string | null;
  group_id: string | null;
  submitted_by: string | null;
  submitted_at: string | null;
  content_text: string | null;
  content_link: string | null;
  content_file_url: string | null;
}

type ActivityStatus = "pendente" | "entregue" | "atrasado";

function getStatus(activity: Activity, delivery: Delivery | undefined): ActivityStatus {
  if (delivery) return "entregue";
  if (activity.deadline && new Date(activity.deadline) < new Date()) return "atrasado";
  return "pendente";
}

export default function ActivitiesPage() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const groupId = profile?.group_id;

  const { data, isLoading: loading } = useQuery({
    queryKey: ["activities", groupId],
    queryFn: async () => {
      const { data: weekData } = await supabase
        .from("weeks")
        .select("id, number, title")
        .eq("is_active", true)
        .maybeSingle();

      if (!weekData) return { week: null, activities: [] as Activity[], deliveries: [] as Delivery[] };

      const [activitiesRes, deliveriesRes] = await Promise.all([
        supabase.from("activities").select("*").eq("week_id", weekData.id).order("deadline"),
        groupId
          ? supabase.from("deliveries").select("*").eq("group_id", groupId)
          : Promise.resolve({ data: [] as Delivery[] }),
      ]);
      return {
        week: weekData,
        activities: (activitiesRes.data ?? []) as Activity[],
        deliveries: (deliveriesRes.data ?? []) as Delivery[],
      };
    },
    enabled: !!profile,
  });

  const activities = data?.activities ?? [];
  const deliveries = data?.deliveries ?? [];
  const activeWeekTitle = data?.week
    ? `${t("common.week")} ${data.week.number} — ${data.week.title}`
    : "";

  const [deliverTarget, setDeliverTarget] = useState<Activity | null>(null);
  const [existingDelivery, setExistingDelivery] = useState<Delivery | null>(null);

  const [deliveryType, setDeliveryType] = useState<"texto" | "link" | "arquivo">("texto");
  const [contentText, setContentText] = useState("");
  const [contentLink, setContentLink] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const isRepresentante = profile?.role === "representante";

  const STATUS_CONFIG: Record<ActivityStatus, { label: string; icon: React.ElementType; className: string }> = {
    pendente: { label: t("activities.statusPending"), icon: Clock, className: "bg-secondary text-secondary-foreground" },
    entregue: { label: t("activities.statusDelivered"), icon: CheckCircle2, className: "bg-primary/20 text-primary" },
    atrasado: { label: t("activities.statusLate"), icon: AlertTriangle, className: "bg-destructive/20 text-destructive" },
  };

  const openDeliver = (activity: Activity) => {
    const existing = deliveries.find((d) => d.activity_id === activity.id);
    setDeliverTarget(activity);
    setExistingDelivery(existing ?? null);

    const dt = activity.delivery_type;
    if (dt === "qualquer") {
      setDeliveryType("texto");
    } else if (dt === "texto" || dt === "link" || dt === "arquivo") {
      setDeliveryType(dt);
    } else {
      setDeliveryType("texto");
    }

    setContentText(existing?.content_text ?? "");
    setContentLink(existing?.content_link ?? "");
    setFile(null);
  };

  const handleSubmitDelivery = async () => {
    if (!deliverTarget || !groupId || !profile) return;
    setSubmitting(true);

    try {
      let fileUrl: string | null = existingDelivery?.content_file_url ?? null;

      if (deliveryType === "arquivo" && file) {
        const ext = file.name.split(".").pop();
        const path = `${groupId}/${deliverTarget.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("deliveres")
          .upload(path, file, { upsert: true });
        if (upErr) throw upErr;

        const { data: urlData } = supabase.storage.from("deliveres").getPublicUrl(path);
        fileUrl = urlData.publicUrl;
      }

      const payload = {
        activity_id: deliverTarget.id,
        group_id: groupId,
        submitted_by: profile.id,
        submitted_at: new Date().toISOString(),
        content_text: deliveryType === "texto" ? contentText.trim() || null : null,
        content_link: deliveryType === "link" ? contentLink.trim() || null : null,
        content_file_url: deliveryType === "arquivo" ? fileUrl : null,
      };

      if (existingDelivery) {
        const { error } = await supabase.from("deliveries").update(payload).eq("id", existingDelivery.id);
        if (error) throw error;
        toast({ title: t("activities.toastUpdated") });
      } else {
        const { error } = await supabase.from("deliveries").insert(payload);
        if (error) throw error;
        toast({ title: t("activities.toastSent") });
      }

      setDeliverTarget(null);
      await queryClient.invalidateQueries({ queryKey: ["activities", groupId] });
    } catch (err: any) {
      toast({ title: t("activities.toastError"), description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const canDeliver = (activity: Activity): boolean => {
    if (!isRepresentante) return false;
    const isPastDeadline = activity.deadline && new Date(activity.deadline) < new Date();
    const alreadyDelivered = deliveries.some((d) => d.activity_id === activity.id);
    if (isPastDeadline && !alreadyDelivered) return false;
    if (isPastDeadline && alreadyDelivered) return false;
    return true;
  };

  return (
    <DashboardLayout title={t("activities.title")}>
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card p-6 space-y-3">
              <div className="skeleton-loading h-6 w-48" />
              <div className="skeleton-loading h-4 w-full" />
            </div>
          ))}
        </div>
      ) : !activeWeekTitle ? (
        <div className="glass-card p-8 text-center text-muted-foreground">
          {t("activities.noActiveWeek")}
        </div>
      ) : (
        <>
          <div className="mb-4">
            <Badge className="bg-primary text-primary-foreground text-sm px-3 py-1">{activeWeekTitle}</Badge>
          </div>

          {activities.length === 0 ? (
            <div className="glass-card p-8 text-center text-muted-foreground">
              {t("activities.noActivities")}
            </div>
          ) : (
            <div className="space-y-4">
              {activities.map((activity) => {
                const delivery = deliveries.find((d) => d.activity_id === activity.id);
                const status = getStatus(activity, delivery);
                const cfg = STATUS_CONFIG[status];
                const StatusIcon = cfg.icon;

                return (
                  <div
                    key={activity.id}
                    className={cn(
                      "glass-card p-5 space-y-3",
                      activity.is_required && "border-l-2 border-l-primary"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-foreground font-medium">{activity.title}</h3>
                          {activity.is_required && (
                            <Badge variant="destructive" className="text-xs">{t("activities.required")}</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{activity.description}</p>
                      </div>
                      <Badge className={cn("text-xs gap-1 shrink-0", cfg.className)}>
                        <StatusIcon className="h-3 w-3" /> {cfg.label}
                      </Badge>
                    </div>

                    {activity.deadline && (
                      <p className={cn(
                        "text-xs font-medium",
                        status === "atrasado" ? "text-destructive" : "text-muted-foreground"
                      )}>
                        {t("activities.deadline", { date: format(new Date(activity.deadline), `dd/MM/yyyy '${t("common.at")}' HH:mm`) })}
                      </p>
                    )}

                    {isRepresentante && (
                      <div className="pt-1">
                        {canDeliver(activity) ? (
                          <Button size="sm" onClick={() => openDeliver(activity)} className="gap-1.5">
                            <Send className="h-3.5 w-3.5" />
                            {delivery ? t("activities.resend") : t("activities.deliver")}
                          </Button>
                        ) : status === "entregue" ? (
                          <p className="text-xs text-primary">
                            {t("activities.deliveredAt", { date: delivery?.submitted_at ? format(new Date(delivery.submitted_at), `dd/MM/yyyy '${t("common.at")}' HH:mm`) : "—" })}
                          </p>
                        ) : status === "atrasado" ? (
                          <p className="text-xs text-destructive">{t("activities.deadlinePassed")}</p>
                        ) : null}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── Delivery Modal ── */}
      <Dialog open={!!deliverTarget} onOpenChange={(o) => !o && setDeliverTarget(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {existingDelivery ? t("activities.updateDelivery") : t("activities.deliverActivity")}
            </DialogTitle>
          </DialogHeader>

          <p className="text-sm text-muted-foreground">{deliverTarget?.title}</p>

          {deliverTarget?.delivery_type === "qualquer" && (
            <div className="flex gap-2">
              {(["texto", "link", "arquivo"] as const).map((tp) => (
                <Button
                  key={tp}
                  size="sm"
                  variant={deliveryType === tp ? "default" : "outline"}
                  onClick={() => setDeliveryType(tp)}
                  className="gap-1 capitalize"
                >
                  {tp === "texto" && <Type className="h-3.5 w-3.5" />}
                  {tp === "link" && <Link2 className="h-3.5 w-3.5" />}
                  {tp === "arquivo" && <FileUp className="h-3.5 w-3.5" />}
                  {tp}
                </Button>
              ))}
            </div>
          )}

          <div className="space-y-3">
            {deliveryType === "texto" && (
              <Textarea
                placeholder={t("activities.textPlaceholder")}
                value={contentText}
                onChange={(e) => setContentText(e.target.value)}
                rows={6}
              />
            )}
            {deliveryType === "link" && (
              <Input
                type="url"
                placeholder={t("activities.linkPlaceholder")}
                value={contentLink}
                onChange={(e) => setContentLink(e.target.value)}
              />
            )}
            {deliveryType === "arquivo" && (
              <div className="space-y-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
                <Button
                  variant="outline"
                  onClick={() => fileRef.current?.click()}
                  className="w-full gap-2"
                >
                  <Upload className="h-4 w-4" />
                  {file ? file.name : t("activities.selectFile")}
                </Button>
                {file && file.size > 10 * 1024 * 1024 && (
                  <p className="text-xs text-destructive">{t("activities.fileTooLarge")}</p>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeliverTarget(null)}>{t("common.cancel")}</Button>
            <Button
              onClick={handleSubmitDelivery}
              disabled={
                submitting ||
                (deliveryType === "texto" && !contentText.trim()) ||
                (deliveryType === "link" && !contentLink.trim()) ||
                (deliveryType === "arquivo" && !file && !existingDelivery?.content_file_url) ||
                (deliveryType === "arquivo" && file !== null && file.size > 10 * 1024 * 1024)
              }
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {existingDelivery ? t("common.update") : t("common.send")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
