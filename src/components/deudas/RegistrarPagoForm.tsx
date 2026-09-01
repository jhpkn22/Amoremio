"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Field, CampoError, Select } from "@/components/ui/Field";
import { formatGs } from "@/lib/utils";

type FormaPagoCuenta = "efectivo" | "transferencia" | "qr";

/** registrar_pago_cuenta rechaza forma_pago='fiado' — no tiene sentido pagar una deuda con más deuda. */
export function RegistrarPagoForm({ clienteId, saldoActual }: { clienteId: string; saldoActual: number }) {
  const router = useRouter();
  const [monto, setMonto] = useState("");
  const [formaPago, setFormaPago] = useState<FormaPagoCuenta>("efectivo");
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
    const supabase = createClient();
    const { error: errRpc } = await supabase.rpc("registrar_pago_cuenta", {
      p_cliente_id: clienteId,
      p_monto: montoNum,
      p_forma_pago: formaPago,
    });
    setEnviando(false);
    if (errRpc) {
      setError(errRpc.message || "No se pudo registrar el pago.");
      return;
    }
    setMonto("");
    router.refresh();
  }

  return (
    <Card>
      <p className="mb-3 text-[14px] font-bold text-ink-900">Registrar pago</p>
      <form onSubmit={registrar} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <Field className="mb-0 flex-1">
          <Label htmlFor="monto">Monto</Label>
          <Input
            id="monto"
            type="number"
            min={1}
            max={saldoActual}
            inputMode="numeric"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            placeholder="0"
          />
        </Field>
        <Field className="mb-0">
          <Label htmlFor="forma">Forma de pago</Label>
          <Select id="forma" value={formaPago} onChange={(e) => setFormaPago(e.target.value as FormaPagoCuenta)}>
            <option value="efectivo">Efectivo</option>
            <option value="transferencia">Transferencia</option>
            <option value="qr">QR</option>
          </Select>
        </Field>
        <Button type="submit" disabled={enviando}>
          {enviando ? "Guardando…" : "Registrar"}
        </Button>
      </form>
      <CampoError>{error}</CampoError>
      <p className="mt-2 text-[12px] text-ink-600">Saldo actual: {formatGs(saldoActual)}</p>
    </Card>
  );
}
