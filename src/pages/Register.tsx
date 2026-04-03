import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const MAX_PARTICIPANTS = 75;

export default function Register() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [count, setCount] = useState<number | null>(null);
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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isFull) return;
    if (password.length < 8) {
      toast.error("A senha deve ter no mínimo 8 caracteres");
      return;
    }

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
        toast.error("Limite de envio de emails atingido. Aguarde alguns minutos e tente novamente.");
      } else if (error.message.includes("invalid")) {
        toast.error("Endereço de email inválido.");
      } else {
        toast.error(error.message);
      }
      setLoading(false);
      return;
    }

    // Check for fake signup (user already exists — Supabase returns 200 with fake user)
    if (data?.user?.identities?.length === 0) {
      toast.error("Este email já está cadastrado. Faça login.");
      setLoading(false);
      return;
    }

    toast.success("Conta criada com sucesso!");
    navigate("/login");
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass-card w-full max-w-md p-8 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Garra Projects</h1>
          <p className="label-sm">Crie sua conta</p>
        </div>

        {/* Vacancy counter */}
        <div className="glass-card p-4 space-y-3">
          <div className="flex justify-between items-baseline">
            <span className="label-sm">Vagas preenchidas</span>
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
            <p className="text-foreground font-semibold">Inscrições encerradas</p>
            <p className="label-sm">Todas as vagas foram preenchidas.</p>
          </div>
        ) : (
          <form onSubmit={handleRegister} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name" className="label-sm">Nome completo</Label>
              <Input
                id="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="bg-secondary/50 border-border"
                placeholder="Seu nome completo"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="label-sm">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-secondary/50 border-border"
                placeholder="seu@email.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="label-sm">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="bg-secondary/50 border-border"
                placeholder="Mínimo 8 caracteres"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full rounded-[10px]"
            >
              {loading && <Loader2 className="animate-spin" />}
              Criar conta
            </Button>
          </form>
        )}

        <div className="text-center">
          <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Já tem uma conta? Entrar
          </Link>
        </div>
      </div>
    </div>
  );
}
