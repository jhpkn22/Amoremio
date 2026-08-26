import Link from "next/link";
import Image from "next/image";
import { CartButton } from "@/components/vitrina/CartButton";

export function HeaderPublico() {
  return (
    <header className="no-print border-b border-border bg-rose-100">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-3.5 lg:max-w-6xl">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/logo.png" alt="Amore Mío" width={56} height={56} className="h-14 w-14 rounded-full object-cover" priority />
          <span
            className="font-display text-[38px] leading-none text-rose-700"
            style={{ WebkitTextStroke: "0.6px var(--color-rose-700)" }}
          >
            Amore Mío
          </span>
        </Link>
        <CartButton />
      </div>
    </header>
  );
}
