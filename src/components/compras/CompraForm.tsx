"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Label, Field, Select, CampoError } from "@/components/ui/Field";
import { cn, formatGs } from "@/lib/utils";
import { confirmarCompra, buscarArticulos } from "@/app/panel/compras/actions";
import type { Almacen, Proveedor } from "@/lib/types/database";

interface ArticuloBusqueda {
  id: string;
  nombre: string;
  codigo_interno: string;
  codigo_barras: string | null;
  precio_venta: number;
}

interface FilaItem {
  articulo_id: string;
  nombre: string;
  codigo_interno: string;
  cantidad: number;
  costo_unitario: number;
  precio_venta_nuevo: string; // "" = no cambiar
}

export function CompraForm({
  proveedores,
  almacenes,
}: {
  proveedores: Proveedor[];
  almacenes: Almacen[];
}) {
  const router = useRouter();
  const [proveedorId, setProveedorId] = useState(proveedores[0]?.id ?? "");
  const [almacenId, setAlmacenId] = useState(
    almacenes.find((a) => a.es_principal)?.id ?? almacenes[0]?.id ?? ""
  );
  const [condicion, setCondicion] = useState<"contado" | "credito">("contado");
  const [items, setItems] = useState<FilaItem[]>([]);
  const [texto, setTexto] = useState("");
  const [resultados, setResultados] = useState<ArticuloBusqueda[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = items.reduce((acc, i) => acc + i.cantidad * i.costo_unitario, 0);

  async function buscar(t: string) {
    setTexto(t);
    if (t.trim().length < 2) {
      setResultados([]);
      return;
    }
    setBuscando(true);
    const r = (await buscarArticulos(t)) as ArticuloBusqueda[];
    setBuscando(false);
    setResultados(r);
  }

  function agregar(a: ArticuloBusqueda) {
    setTexto("");
    setResultados([]);
    if (items.some((i) => i.articulo_id === a.id)) return;
    setItems((prev) => [
      ...prev,
      {
        articulo_id: a.id,
        nombre: a.nombre,
        codigo_interno: a.codigo_interno,
        cantidad: 1,
        costo_unitario: 0,
        precio_venta_nuevo: "",
      },
    ]);
  }

  function actualizar(idx: number, campo: keyof FilaItem, valor: string) {
    setItems((prev) =>
      prev.map((it, i) =>
        i === idx
          ? {
              ...it,
              [campo]:
                campo === "cantidad" || campo === "costo_unitario"
                  ? Math.max(0, Number(valor) || 0)
                  : valor,
            }
          : it
      )
    );
  }

  async function confirmar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!proveedorId) return setError("Elegí un proveedor.");
    if (!almacenId) return setError("Elegí un almacén.");
    if (items.length === 0) return setError("Agregá al menos un artículo.");
    if (items.some((i) => i.cantidad <= 0)) return setError("Todas las cantidades tienen que ser mayores a 0.");

    setEnviando(true);
    const res = await confirmarCompra({
      proveedor_id: proveedorId,
      almacen_id: almacenId,
      condicion,
      items: items.map((i) => ({
        articulo_id: i.articulo_id,
        cantidad: i.cantidad,
        costo_unitario: i.costo_unitario,
        precio_venta_nuevo: i.precio_venta_nuevo.trim() ? Number(i.precio_venta_nuevo) : null,
      })),
    });
    setEnviando(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.push(res.id ? `/panel/compras/${res.id}` : "/panel/compras");
  }

  return (
    <form onSubmit={confirmar} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field className="mb-0">
          <Label htmlFor="proveedor">Proveedor</Label>
          <Select id="proveedor" value={proveedorId} onChange={(e) => setProveedorId(e.target.value)}>
            {proveedores.length === 0 && <option value="">— cargá un proveedor primero —</option>}
            {proveedores.map((p) => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </Select>
        </Field>
        <Field className="mb-0">
          <Label htmlFor="almacen">Ingresa al almacén</Label>
          <Select id="almacen" value={almacenId} onChange={(e) => setAlmacenId(e.target.value)}>
            {almacenes.map((a) => (
              <option key={a.id} value={a.id}>{a.nombre}</option>
            ))}
          </Select>
        </Field>
      </div>

      <div>
        <Label>Condición</Label>
        <div className="flex gap-1.5">
          {(["contado", "credito"] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCondicion(c)}
              className={cn(
                "min-h-10 flex-1 rounded-xl border text-[13px] font-semibold",
                condicion === c ? "border-rose-700 bg-rose-50 text-rose-700" : "border-border text-ink-600"
              )}
            >
              {c === "contado" ? "Al contado" : "A crédito (queda como deuda)"}
            </button>
          ))}
        </div>
      </div>

      {/* buscador de artículos */}
      <div>
        <Label>Artículos</Label>
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-600" />
          <input
            value={texto}
            onChange={(e) => buscar(e.target.value)}
            placeholder="Buscar artículo por nombre o código…"
            className="min-h-11 w-full rounded-xl border border-border bg-surface pl-10 pr-3.5 text-[15px] focus:border-border-strong focus:outline-none"
          />
        </div>
        {(resultados.length > 0 || buscando) && (
          <ul className="mt-1.5 max-h-56 overflow-y-auto rounded-xl border border-border">
            {buscando && <li className="p-2.5 text-[13px] text-ink-600">Buscando…</li>}
            {resultados.map((a) => (
              <li key={a.id} className="border-b border-border last:border-0">
                <button
                  type="button"
                  onClick={() => agregar(a)}
                  className="flex w-full items-center justify-between gap-2 p-2.5 text-left hover:bg-rose-50"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[13.5px] font-semibold text-ink-900">{a.nombre}</span>
                    <span className="font-mono text-[11.5px] text-ink-600">{a.codigo_interno}</span>
                  </span>
                  <Plus size={16} className="shrink-0 text-rose-700" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {items.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[560px] text-left text-[13px]">
            <thead className="bg-rose-50 text-[11px] uppercase tracking-wide text-ink-600">
              <tr>
                <th className="px-3 py-2">Artículo</th>
                <th className="px-3 py-2 text-right">Cant.</th>
                <th className="px-3 py-2 text-right">Costo unit.</th>
                <th className="px-3 py-2 text-right">Precio venta nuevo</th>
                <th className="px-3 py-2 text-right">Subtotal</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {items.map((it, idx) => (
                <tr key={it.articulo_id} className="border-t border-border">
                  <td className="px-3 py-2">
                    <p className="font-medium text-ink-900">{it.nombre}</p>
                    <p className="font-mono text-[11px] text-ink-600">{it.codigo_interno}</p>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <input
                      type="number"
                      min={1}
                      value={it.cantidad}
                      onChange={(e) => actualizar(idx, "cantidad", e.target.value)}
                      className="w-16 rounded-lg border border-border bg-surface px-2 py-1 text-right"
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <input
                      type="number"
                      min={0}
                      step={500}
                      value={it.costo_unitario || ""}
                      onChange={(e) => actualizar(idx, "costo_unitario", e.target.value)}
                      className="w-24 rounded-lg border border-border bg-surface px-2 py-1 text-right"
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <input
                      type="number"
                      min={0}
                      step={500}
                      placeholder="—"
                      value={it.precio_venta_nuevo}
                      onChange={(e) => actualizar(idx, "precio_venta_nuevo", e.target.value)}
                      className="w-24 rounded-lg border border-border bg-surface px-2 py-1 text-right"
                    />
                  </td>
                  <td className="tabular px-3 py-2 text-right font-semibold">
                    {formatGs(it.cantidad * it.costo_unitario)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                      className="rounded-lg p-1 text-ink-600 hover:bg-alert-soft hover:text-alert"
                      aria-label="Quitar"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-border pt-3">
        <span className="text-[15px] font-bold text-ink-900">TOTAL</span>
        <span className="tabular text-[22px] font-bold text-rose-700">{formatGs(total)}</span>
      </div>

      <CampoError>{error}</CampoError>

      <Button
        type="submit"
        tamaño="grande"
        className="w-full sm:w-auto"
        disabled={enviando || items.length === 0 || !proveedorId || !almacenId}
      >
        {enviando ? "Confirmando…" : "Confirmar compra"}
      </Button>
    </form>
  );
}
