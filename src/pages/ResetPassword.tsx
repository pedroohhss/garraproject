import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function ResetPassword() {
  const { t } = useTranslation();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [checking, setChecking] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsValidSession(true);
        setChecking(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsValidSession(true);
      }
      setChecking(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast.error(t("auth.resetPassword.errorTooShort"));
      return;
    }

    if (password !== confirmPassword) {
      toast.error(t("auth.resetPassword.errorNoMatch"));
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    toast.success(t("auth.resetPassword.successUpdated"));
    await supabase.auth.signOut();
    navigate("/login");
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
      </div>
    );
  }

  if (!isValidSession) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass-card w-full max-w-md p-8 space-y-6 text-center">
          <h1 className="text-2xl font-bold text-foreground">{t("auth.resetPassword.invalidLink")}</h1>
          <p className="text-muted-foreground text-sm">
            {t("auth.resetPassword.invalidLinkDescription")}
          </p>
          <Button onClick={() => navigate("/login")} className="w-full rounded-[10px]">
            {t("auth.resetPassword.backToLogin")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass-card w-full max-w-md p-8 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-foreground">{t("auth.resetPassword.title")}</h1>
          <p className="label-sm">{t("auth.resetPassword.subtitle")}</p>
        </div>

        <form onSubmit={handleReset} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="password" className="label-sm">{t("auth.resetPassword.newPassword")}</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-secondary/50 border-border pr-10"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="label-sm">{t("auth.resetPassword.confirmPassword")}</Label>
            <Input
              id="confirmPassword"
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="bg-secondary/50 border-border"
              placeholder="••••••••"
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full rounded-[10px]">
            {loading && <Loader2 className="animate-spin" />}
            {t("auth.resetPassword.submit")}
          </Button>
        </form>
      </div>
    </div>
  );
}
