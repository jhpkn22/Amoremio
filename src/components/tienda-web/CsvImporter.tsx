"use client";

import { useState } from "react";
import Papa from "papaparse";
import { useRouter } from "next/navigation";
import { FileUp, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatGs } from "@/lib/utils";
import { importarProductosCsv, type FilaCsv } from "@/app/panel/tienda-web/actions";

type FilaCruda = Record<string, string>;

function aBooleano(v: string | undefined): boolean {
  return ["si", "sí", "true", "1", "x"].includes((v ?? "").trim().toLowerCase());
}

function aNumero(v: string | undefined): number | undefined {
  if (!v?.trim()) return undefined;
  const n = Number(v.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : undefined;
}

export function CsvImporter({ esAdmin }: { esAdmin: boolean }) {
  const router = useRouter();
  const [filas, setFilas] = useState<FilaCsv[]>([]);
  const [nombreArchivo, setNombreArchivo] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{ creados: number; errores: string[] } | null>(null);
  const [importando, setImportando] = useState(false);
  const [errorLectura, setErrorLectura] = useState<string | null>(null);

  function onArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    setNombreArchivo(archivo.name);
    setResultado(null);
    setErrorLectura(null);

    Papa.parse<FilaCruda>(archivo, {
      header: true,
      skipEmptyLines: true,
      complete: (resultados) => {
        if (!resultados.data.length) {
          setErrorLectura("El archivo no tiene filas para importar.");
          return;
        }
        const mapeadas: FilaCsv[] = resultados.data.map((r) => ({
          nombre: r.nombre ?? "",
          categoria: r.categoria,
          proveedor: r.proveedor,
          precio_venta: aNumero(r.precio_venta) ?? 0,
          precio_costo: aNumero(r.precio_costo),
          es_a_pedido: aBooleano(r.a_pedido),
        }));
        setFilas(mapeadas);
      },
      error: () => setErrorLectura("No pudimos leer el archivo. Revisá que sea un CSV válido."),
    });
  }

  async function confirmarImportacion() {
    setImportando(true);
    const res = await importarProductosCsv(filas);
    setImportando(false);
    setResultado(res);
    if (res.creados > 0) router.refresh();
  }

  return (
    <div>
      <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border text-center hover:border-border-strong">
        <FileUp size={24} className="text-rose-400" />
        <span className="text-[14px] font-semibold text-ink-900">
          {nombreArchivo ?? "Elegí un archivo .csv"}
        </span>
        <span className="max-w-xs text-[12.5px] text-ink-600">
          Columnas: nombre, categoria, proveedor, precio_venta{esAdmin ? ", precio_costo" : ""}, a_pedido
        </span>
        <input type="file" accept=".csv,text/csv" className="hidden" onChange={onArchivo} />
      </label>

      {errorLectura && <p className="mt-3 text-[13px] font-medium text-alert">{errorLectura}</p>}

      {filas.length > 0 && !resultado && (
        <div className="mt-5">
          <p className="mb-2 text-[13.5px] font-semibold text-ink-900">
            Se van a crear {filas.length} producto{filas.length === 1 ? "" : "s"}:
          </p>
          <div className="max-h-72 overflow-y-auto rounded-xl border border-border">
            <table className="w-full text-left text-[13px]">
              <thead className="sticky top-0 bg-rose-50 text-[11px] uppercase tracking-wide text-ink-600">
                <tr>
                  <th className="px-3 py-2">Nombre</th>
                  <th className="px-3 py-2">Categoría</th>
                  <th className="px-3 py-2 text-right">Precio</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((f, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="px-3 py-2">{f.nombre || <span className="text-alert">falta el nombre</span>}</td>
                    <td className="px-3 py-2 text-ink-600">{f.categoria || "—"}</td>
                    <td className="tabular px-3 py-2 text-right">{formatGs(f.precio_venta)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button className="mt-3" onClick={confirmarImportacion} disabled={importando}>
            {importando ? "Importando…" : `Importar ${filas.length} productos`}
          </Button>
        </div>
      )}

      {resultado && (
        <div className="mt-5 space-y-2">
          <p className="flex items-center gap-2 text-[14px] font-semibold text-success">
            <CheckCircle2 size={18} /> Se crearon {resultado.creados} productos.
          </p>
          {resultado.errores.length > 0 && (
            <div className="rounded-xl border border-alert bg-alert-soft p-3">
              <p className="mb-1 flex items-center gap-1.5 text-[13px] font-semibold text-alert">
                <AlertCircle size={16} /> {resultado.errores.length} fila(s) con problemas
              </p>
              <ul className="list-inside list-disc text-[12.5px] text-alert">
                {resultado.errores.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}
          <Button href="/panel/tienda-web" variante="secundario">Ver la tienda web</Button>
        </div>
      )}
    </div>
  );
}
