"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function BotonImprimir() {
  return (
    <Button onClick={() => window.print()} className="no-print">
      <Printer size={18} /> Imprimir etiqueta
    </Button>
  );
}
