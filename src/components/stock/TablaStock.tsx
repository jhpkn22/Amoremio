"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SlidersHorizontal, ArrowLeftRight, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label, Field, Select, CampoError } from "@/components/ui/Field";
import { cn } from "@/lib/utils";
import { ajustarStock, transferirStock } from "@/app/panel/stock/actions";
import type { Almacen } from "@/lib/types/database";

export interface FilaStock {
  id: string;
  nombre: string;
  codigo_interno: string;
  stock_minimo: number;
  enAlmacen: number;
  total: number;
}

type Accion = { tipo: "ajuste" | "transferencia"; fila: FilaStock } | null;

export function TablaStock({
  filas,
  almacenId,
  almacenes,
}: {
  filas: FilaStock[];
  almacenId: string;
  almacenes: Almacen[];
}) {
  const [accion, setAccion] = useState<Accion>(null);

  return (
    <>
      <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full min-w-[520px] text-left text-[13.5px]">
          <thead className="bg-rose-50 text-[11px] uppercase tracking-wide text-ink-600">
            <tr>
              <th className="px-4 py-2.5">Artículo</th>
              <th className="px-4 py-2.5 text-right">Acá</th>
              <th className="px-4 py-2.5 text-right">Total</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => {
              const bajo = f.enAlmacen <= f.stock_minimo;
              return (
                <tr key={f.id} className="border-t border-border">
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-ink-900">{f.nombre}</p>
                    <p className="font-mono text-[11.5px] text-ink-600">{f.codigo_interno}</p>
                  </td>
                  <td className={cn("tabular px-4 py-2.5 text-right font-bold", bajo ? "text-alert" : "text-ink-900")}>
                    {f.enAlmacen}
                  </td>
                  <td className="tabular px-4 py-2.5 text-right text-ink-600">{f.total}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex justify-end gap-1.5">
                      <button
                        onClick={() => setAccion({ tipo: "ajuste", fila: f })}
                        className="rounded-lg border border-border p-1.5 text-ink-600 hover:bg-rose-50"
                        aria-label={`Ajustar ${f.nombre}`}
                        title="Ajustar"
                      >
                        <SlidersHorizontal size={15} />
                      </button>
                      <button
                        onClick={() => setAccion({ tipo: "transferencia", fila: f })}
                        className="rounded-lg border border-border p-1.5 text-ink-600 hover:bg-rose-50"
                        aria-label={`Transferir ${f.nombre}`}
                        title="Transferir"
                      >
                        <ArrowLeftRight size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {accion && (
        <ModalAccion
          accion={accion}
          almacenId={almacenId}
          almacenes={almacenes}
          onCerrar={() => setAccion(null)}
        />
      )}
    </>
  );
}

function ModalAccion({
  accion,
  almacenId,
  almacenes,
  onCerrar,
}: {
  accion: NonNullable<Accion>;
  almacenId: string;
  almacenes: Almacen[];
  onCerrar: () => void;
}) {
  const router = useRouter();
  const { fila } = accion;
  const [cantidad, setCantidad] = useState("");
  const [motivo, setMotivo] = useState("");
  const [destino, setDestino] = useState(almacenes.find((a) => a.id !== almacenId)?.id ?? "");
  const [signo, setSigno] = useState<"mas" | "menos">("mas");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmar(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(cantidad);
    if (!n || n <= 0) {
      setError("Ingresá una cantidad válida.");
      return;
    }
    setEnviando(true);
    setError(null);
    let res;
    if (accion.tipo === "ajuste") {
      if (!motivo.trim()) {
        setEnviando(false);
        setError("Un ajuste necesita un motivo.");
        return;
      }
      res = await ajustarStock(fila.id, almacenId, signo === "mas" ? n : -n, motivo.trim());
    } else {
      if (!destino) {
        setEnviando(false);
        setError("Elegí el almacén de destino.");
        return;
      }
      res = await transferirStock(fila.id, almacenId, destino, n);
    }
    setEnviando(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.refresh();
    onCerrar();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      <button className="absolute inset-0 bg-ink-900/40" aria-label="Cerrar" onClick={onCerrar} />
      <div className="relative w-full max-w-md rounded-t-2xl bg-surface p-5 sm:rounded-2xl">
        <div className="mb-3 flex items-start justify-between">
          <div>
            <p className="text-[15px] font-bold text-ink-900">
              {accion.tipo === "ajuste" ? "Ajustar stock" : "Transferir stock"}
            </p>
            <p className="text-[12.5px] text-ink-600">
              {fila.nombre} · acá hay {fila.enAlmacen}
            </p>
          </div>
          <button onClick={onCerrar} className="rounded-full p-1 text-ink-600 hover:bg-rose-50" aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={confirmar} className="space-y-1">
          {accion.tipo === "ajuste" && (
            <div className="mb-3 flex gap-1.5">
              {(["mas", "menos"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSigno(s)}
                  className={cn(
                    "min-h-9 flex-1 rounded-xl border text-[13px] font-semibold",
                    signo === s ? "border-rose-700 bg-rose-50 text-rose-700" : "border-border text-ink-600"
                  )}
                >
                  {s === "mas" ? "Sumar" : "Restar"}
                </button>
              ))}
            </div>
          )}

          {accion.tipo === "transferencia" && (
            <Field>
              <Label htmlFor="destino">Almacén de destino</Label>
              <Select id="destino" value={destino} onChange={(e) => setDestino(e.target.value)}>
                {almacenes
                  .filter((a) => a.id !== almacenId)
                  .map((a) => (
                    <option key={a.id} value={a.id}>{a.nombre}</option>
                  ))}
              </Select>
            </Field>
          )}

          <Field>
            <Label htmlFor="cantidad">Cantidad</Label>
            <Input
              id="cantidad"
              type="number"
              min={1}
              inputMode="numeric"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              autoFocus
            />
          </Field>

          {accion.tipo === "ajuste" && (
            <Field>
              <Label htmlFor="motivo">Motivo</Label>
              <Input
                id="motivo"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Recuento, rotura, faltante…"
              />
            </Field>
          )}

          <CampoError>{error}</CampoError>

          <Button type="submit" tamaño="grande" className="mt-2 w-full" disabled={enviando}>
            {enviando ? "Guardando…" : "Confirmar"}
          </Button>
        </form>
      </div>
    </div>
  );
}
