import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

interface FieldErrors {
  email?: string;
  password?: string;
}

export default function Login() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const navigate = useNavigate();

  const validate = (): FieldErrors => {
    const errs: FieldErrors = {};
    if (!email.trim()) errs.email = t("auth.login.errorEmailRequired");
    if (!password) errs.password = t("auth.login.errorPasswordRequired");
    return errs;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      if (error.message.toLowerCase().includes("invalid login credentials") || error.message.toLowerCase().includes("invalid credentials")) {
        toast.error(t("auth.login.errorInvalidCredentials"));
      } else if (error.message.toLowerCase().includes("email not confirmed")) {
        toast.error(t("auth.login.errorEmailNotConfirmed"));
      } else if (error.status === 429) {
        toast.error(t("auth.login.errorTooManyRequests"));
      } else {
        toast.error(t("auth.login.errorGeneric"));
      }
      setLoading(false);
      return;
    }

    navigate("/");
    setLoading(false);
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast.error(t("auth.login.errorEmailFirst"));
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(t("auth.login.recoveryEmailSent"));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass-card w-full max-w-md p-8 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-foreground">{t("auth.login.appName")}</h1>
          <p className="label-sm">{t("auth.login.subtitle")}</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5" noValidate>
          <div className="space-y-2">
            <Label htmlFor="email" className="label-sm">
              {t("auth.login.email")} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setErrors((prev) => ({ ...prev, email: undefined })); }}
              className={`bg-secondary/50 border-border ${errors.email ? "border-destructive focus-visible:ring-destructive" : ""}`}
              placeholder="seu@email.com"
            />
            {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="label-sm">
              {t("auth.login.password")} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setErrors((prev) => ({ ...prev, password: undefined })); }}
              className={`bg-secondary/50 border-border ${errors.password ? "border-destructive focus-visible:ring-destructive" : ""}`}
              placeholder="••••••••"
            />
            {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full rounded-[10px]"
          >
            {loading && <Loader2 className="animate-spin" />}
            {t("auth.login.submit")}
          </Button>
        </form>

        <div className="flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={handleForgotPassword}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {t("auth.login.forgotPassword")}
          </button>
          <Link
            to="/cadastro"
            className="text-sm text-primary hover:underline"
          >
            {t("auth.login.createAccount")}
          </Link>
        </div>
      </div>
    </div>
  );
}
