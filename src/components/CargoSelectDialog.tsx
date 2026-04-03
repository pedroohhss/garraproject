import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Lock, Crown, Target, Wrench, Handshake, BarChart3 } from "lucide-react";

export interface CargoInfo {
  value: string;
  label: string;
  description: string;
  required: boolean;
  icon: React.ElementType;
}

export const CARGOS: CargoInfo[] = [
  { value: "fundador", label: "Fundador", description: "Visão geral do projeto e tomada de decisão", required: true, icon: Crown },
  { value: "estrategista", label: "Estrategista de Negócio", description: "Modelo de negócio, viabilidade e posicionamento", required: true, icon: Target },
  { value: "construtor", label: "Construtor", description: "Executa o produto ou serviço usando as ferramentas disponíveis", required: true, icon: Wrench },
  { value: "closer", label: "Closer", description: "Vendas e aquisição dos primeiros clientes", required: false, icon: Handshake },
  { value: "analista", label: "Analista de Mercado", description: "Pesquisa, validação e métricas", required: false, icon: BarChart3 },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  occupiedCargos: string[];
  onConfirm: (cargo: string) => Promise<void>;
  groupName: string;
}

export default function CargoSelectDialog({ open, onOpenChange, occupiedCargos, onConfirm, groupName }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleConfirm = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await onConfirm(selected);
      onOpenChange(false);
      setSelected(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { setSelected(null); } onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Escolha seu cargo — {groupName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 pt-2">
          {CARGOS.map((cargo) => {
            const occupied = occupiedCargos.includes(cargo.value);
            const isSelected = selected === cargo.value;
            const Icon = cargo.icon;
            return (
              <button
                key={cargo.value}
                type="button"
                disabled={occupied}
                onClick={() => setSelected(cargo.value)}
                className={`w-full text-left p-3 rounded-lg border transition-all flex items-start gap-3 ${
                  occupied
                    ? "opacity-50 cursor-not-allowed border-border bg-muted/30"
                    : isSelected
                    ? "border-primary bg-primary/10 ring-1 ring-primary"
                    : "border-border hover:border-primary/40 hover:bg-secondary/30"
                }`}
              >
                <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{cargo.label}</span>
                    {cargo.required ? (
                      <Badge variant="default" className="text-[10px] px-1.5 py-0">Obrigatório</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Opcional</Badge>
                    )}
                    {occupied && <Lock className="h-3.5 w-3.5 text-muted-foreground ml-auto" />}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{cargo.description}</p>
                </div>
              </button>
            );
          })}
        </div>
        <DialogFooter>
          <Button onClick={handleConfirm} disabled={!selected || saving} className="w-full">
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Confirmar entrada
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
