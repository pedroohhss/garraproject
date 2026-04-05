import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

const MAX_PARTICIPANTS = 75;

interface FieldErrors {
  fullName?: string;
  email?: string;
  password?: string;
}

export default function Register() {
  const { t } = useTranslation();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCount = async () => {
      const { data, error } = await supabase.rpc("get_participant_count");
      if (error) {
        console.error("[Register] Error fetching count:", error.message);
        setCount(0);
      } else {
        setCount(data ?? 0);
      }
    };
    fetchCount();
  }, []);

  const isFull = count !== null && count >= MAX_PARTICIPANTS;

  const validate = (): FieldErrors => {
    const errs: FieldErrors = {};
    if (!fullName.trim()) errs.fullName = t("auth.register.errorNameRequired");
    if (!email.trim()) errs.email = t("auth.register.errorEmailRequired");
    if (!password) errs.password = t("auth.register.errorPasswordRequired");
    else if (password.length < 8) errs.password = t("auth.register.errorPasswordTooShort");
    return errs;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isFull) return;

    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      if (error.status === 429) {
        toast.error(t("auth.register.errorRateLimit"));
      } else if (error.message.toLowerCase().includes("already registered") || error.message.toLowerCase().includes("already been registered")) {
        toast.error(t("auth.register.errorEmailInUse"));
      } else if (error.message.toLowerCase().includes("invalid") || error.message.toLowerCase().includes("email")) {
        toast.error(t("auth.register.errorInvalidEmail"));
      } else if (error.message.toLowerCase().includes("password")) {
        toast.error(t("auth.register.errorWeakPassword"));
      } else {
        toast.error(t("auth.register.errorGeneric"));
      }
      setLoading(false);
      return;
    }

    if (data?.user?.identities?.length === 0) {
      toast.error(t("auth.register.errorEmailInUse"));
      setLoading(false);
      return;
    }

    toast.success(t("auth.register.successCreated"));
    navigate("/login");
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass-card w-full max-w-md p-8 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-foreground">{t("auth.register.appName")}</h1>
          <p className="label-sm">{t("auth.register.subtitle")}</p>
        </div>

        {/* Vacancy counter */}
        <div className="glass-card p-4 space-y-3">
          <div className="flex justify-between items-baseline">
            <span className="label-sm">{t("auth.register.slotsFull")}</span>
            <span className="text-foreground font-semibold text-lg">
              {count !== null ? count : "—"} de {MAX_PARTICIPANTS}
            </span>
          </div>
          <Progress
            value={count !== null ? (count / MAX_PARTICIPANTS) * 100 : 0}
            className="h-2 bg-secondary"
          />
        </div>

        {isFull ? (
          <div className="glass-card p-6 text-center space-y-2">
            <p className="text-foreground font-semibold">{t("auth.register.registrationClosed")}</p>
            <p className="label-sm">{t("auth.register.allSlotsFilled")}</p>
          </div>
        ) : (
          <form onSubmit={handleRegister} className="space-y-5" noValidate>
            <div className="space-y-2">
              <Label htmlFor="name" className="label-sm">
                {t("auth.register.fullName")} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={fullName}
                onChange={(e) => { setFullName(e.target.value); setErrors((prev) => ({ ...prev, fullName: undefined })); }}
                className={`bg-secondary/50 border-border ${errors.fullName ? "border-destructive focus-visible:ring-destructive" : ""}`}
                placeholder={t("auth.register.fullNamePlaceholder")}
              />
              {errors.fullName && <p className="text-xs text-destructive">{errors.fullName}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="label-sm">
                {t("auth.register.email")} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setErrors((prev) => ({ ...prev, email: undefined })); }}
                className={`bg-secondary/50 border-border ${errors.email ? "border-destructive focus-visible:ring-destructive" : ""}`}
                placeholder={t("auth.register.emailPlaceholder")}
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="label-sm">
                {t("auth.register.password")} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setErrors((prev) => ({ ...prev, password: undefined })); }}
                className={`bg-secondary/50 border-border ${errors.password ? "border-destructive focus-visible:ring-destructive" : ""}`}
                placeholder={t("auth.register.passwordPlaceholder")}
              />
              {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full rounded-[10px]"
            >
              {loading && <Loader2 className="animate-spin" />}
              {t("auth.register.submit")}
            </Button>
          </form>
        )}

        <div className="text-center">
          <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            {t("auth.register.alreadyHaveAccount")}
          </Link>
        </div>
      </div>
    </div>
  );
}
