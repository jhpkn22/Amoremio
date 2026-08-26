import { cn } from "@/lib/utils";

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-5", className)}>
      {children}
    </div>
  );
}
