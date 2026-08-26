import { MessageCircle } from "lucide-react";
import { linkWhatsApp, formatearTelefonoPY } from "@/lib/whatsapp";

export function FooterPublico({ numeroWhatsApp }: { numeroWhatsApp: string }) {
  return (
    <footer className="no-print mt-auto border-t border-border bg-surface">
      <div className="mx-auto max-w-3xl px-5 py-9 text-[13.5px] text-ink-600 lg:max-w-6xl">
        <p className="font-display mb-1.5 text-[26px] leading-none text-rose-700">Amore Mío</p>
        <p>Regalos personalizados</p>
        <p>Coronel Bogado, Itapúa — Paraguay</p>
        <p className="mt-1">Lunes a sábado, 8:00 a 19:00</p>
        <a
          href={linkWhatsApp(numeroWhatsApp, "Hola! Te escribo desde la página de Amore Mío.")}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 font-semibold text-rose-700 hover:underline"
        >
          <MessageCircle size={16} /> {formatearTelefonoPY(numeroWhatsApp)}
        </a>
      </div>
    </footer>
  );
}
