import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  children: ReactNode;
  className?: string;
}

export default function GlassCard({ children, className }: Props) {
  return (
    <div className={cn("glass-card p-6", className)}>
      {children}
    </div>
  );
}
