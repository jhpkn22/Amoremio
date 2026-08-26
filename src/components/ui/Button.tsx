import { cn } from "@/lib/utils";
import Link from "next/link";
import type { ButtonHTMLAttributes } from "react";

type Variante = "primario" | "secundario" | "peligro" | "fantasma";

const estilos: Record<Variante, string> = {
  // rose-600 decorativo: SIEMPRE con texto ink-900, nunca blanco (falla AA — ver plan de diseño)
  primario: "bg-rose-600 text-ink-900 hover:bg-rose-700 hover:text-white",
  secundario: "bg-surface border border-border-strong text-rose-700 hover:bg-rose-50",
  peligro: "bg-alert text-white hover:opacity-90",
  fantasma: "text-ink-600 hover:bg-rose-50 hover:text-ink-900",
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
  href?: string;
  tamaño?: "normal" | "grande";
}

export function Button({
  variante = "primario",
  tamaño = "normal",
  className,
  href,
  children,
  ...props
}: Props) {
  const clases = cn(
    "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors",
    "min-h-11 px-4", // 44px de alto mínimo — zona táctil del brief
    tamaño === "grande" && "min-h-14 px-6 text-base",
    tamaño === "normal" && "text-sm",
    "disabled:opacity-50 disabled:pointer-events-none",
    estilos[variante],
    className
  );

  if (href) {
    return (
      <Link href={href} className={clases}>
        {children}
      </Link>
    );
  }

  return (
    <button className={clases} {...props}>
      {children}
    </button>
  );
}
