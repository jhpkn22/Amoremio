import { cn } from "@/lib/utils";

type Tono = "neutral" | "alerta" | "exito" | "marca";

const tonos: Record<Tono, string> = {
  neutral: "bg-rose-50 text-ink-600",
  alerta: "bg-alert-soft text-alert",
  exito: "bg-success-soft text-success",
  marca: "bg-rose-600 text-ink-900",
};

export function Badge({ tono = "neutral", children }: { tono?: Tono; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-bold tracking-wide",
        tonos[tono]
      )}
    >
      {children}
    </span>
  );
}
