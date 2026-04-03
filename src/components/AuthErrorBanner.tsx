import { useAuth } from "@/hooks/useAuth";
import { AlertTriangle } from "lucide-react";

export default function AuthErrorBanner() {
  const { error } = useAuth();

  if (!error) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-destructive/90 text-destructive-foreground px-4 py-3 flex items-center justify-center gap-2 text-sm backdrop-blur-sm">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span>{error}</span>
      <button
        onClick={() => window.location.reload()}
        className="ml-4 underline hover:no-underline font-medium"
      >
        Recarregar
      </button>
    </div>
  );
}
