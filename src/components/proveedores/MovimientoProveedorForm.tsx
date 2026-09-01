"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Field, CampoError, Select } from "@/components/ui/Field";
import { cn, formatGs } from "@/lib/utils";
import { registrarPagoProveedor, registrarDeudaProveedor } from "@/app/panel/proveedores/actions";

type Forma = "efectivo" | "transferencia" | "qr";

export function MovimientoProveedorForm({ proveedorId, saldo }: { proveedorId: string; saldo: number }) {
  const router = useRouter();
  const [modo, setModo] = useState<"pago" | "deuda">("pago");
  const [monto, setMonto] = useState("");
  const [forma, setForma] = useState<Forma>("efectivo");
  const [notas, setNotas] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function registrar(e: React.FormEvent) {
    e.preventDefault();
    const montoNum = Number(monto);
    if (!montoNum || montoNum <= 0) {
      setError("Ingresá un monto válido.");
      return;
    }
    setEnviando(true);
    setError(null);
    const res =
      modo === "pago"
        ? await registrarPagoProveedor(proveedorId, montoNum, forma, notas.trim() || null)
        : await registrarDeudaProveedor(proveedorId, montoNum, notas.trim() || null);
    setEnviando(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setMonto("");
    setNotas("");
    router.refresh();
  }

  return (
    <Card>
      <div className="mb-3 flex gap-1.5">
        {(["pago", "deuda"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setModo(m)}
            className={cn(
              "min-h-9 flex-1 rounded-xl border text-[13px] font-semibold",
              modo === m ? "border-rose-700 bg-rose-50 text-rose-700" : "border-border text-ink-600"
            )}
          >
            {m === "pago" ? "Registrar pago" : "Anotar deuda"}
          </button>
        ))}
      </div>

      <form onSubmit={registrar} className="flex flex-col gap-3">
        <Field className="mb-0">
          <Label htmlFor="monto">Monto</Label>
          <Input
            id="monto"
            type="number"
            min={1}
            inputMode="numeric"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            placeholder="0"
          />
        </Field>

        {modo === "pago" && (
          <Field className="mb-0">
            <Label htmlFor="forma">Forma de pago</Label>
            <Select id="forma" value={forma} onChange={(e) => setForma(e.target.value as Forma)}>
              <option value="efectivo">Efectivo</option>
              <option value="transferencia">Transferencia</option>
              <option value="qr">QR</option>
            </Select>
          </Field>
        )}

        <Field className="mb-0">
          <Label htmlFor="notas" opcional>Notas</Label>
          <Input id="notas" value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Factura 001-002-…" />
        </Field>

        <Button type="submit" disabled={enviando}>
          {enviando ? "Guardando…" : modo === "pago" ? "Registrar pago" : "Anotar deuda"}
        </Button>
      </form>

      <CampoError>{error}</CampoError>
      <p className="mt-2 text-[12px] text-ink-600">
        Saldo actual: <span className="font-semibold">{formatGs(saldo)}</span>{" "}
        {saldo > 0 ? "(les debemos)" : ""}
      </p>
    </Card>
  );
}
