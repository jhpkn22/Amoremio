"use client";

import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Search, UserPlus, X } from "lucide-react";
import type { Cliente } from "@/lib/types/database";
import { Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

/** Selector de cliente para fiado — buscar o crear al vuelo (el brief no exige un CRUD aparte de clientes). */
export function ClientePicker({
  supabase,
  clienteId,
  clienteNombre,
  onSeleccionar,
}: {
  supabase: SupabaseClient;
  clienteId: string | null;
  clienteNombre: string | null;
  onSeleccionar: (id: string | null, nombre: string | null) => void;
}) {
  const [texto, setTexto] = useState("");
  const [resultados, setResultados] = useState<Cliente[]>([]);
  const [creando, setCreando] = useState(false);
  const [nombreNuevo, setNombreNuevo] = useState("");
  const [telefonoNuevo, setTelefonoNuevo] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    const id = setTimeout(async () => {
      if (texto.trim().length < 2) {
        setResultados([]);
        return;
      }
      const { data } = await supabase
        .from("clientes")
        .select("*")
        .is("deleted_at", null)
        .or(`nombre.ilike.%${texto}%,telefono.ilike.%${texto}%`)
        .limit(6);
      setResultados((data as Cliente[]) ?? []);
    }, 300);
    return () => clearTimeout(id);
  }, [texto, supabase]);

  if (clienteId) {
    return (
      <div
        className="flex items-center justify-between rounded-xl border border-border-strong bg-rose-50 px-3.5 py-2.5"
        data-mantiene-foco
      >
        <span className="text-[14px] font-semibold text-ink-900">{clienteNombre}</span>
        <button
          onClick={() => onSeleccionar(null, null)}
          className="rounded-full p-1 text-ink-600 hover:bg-white"
          aria-label="Quitar cliente"
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  async function crearCliente() {
    if (!nombreNuevo.trim()) return;
    setGuardando(true);
    const { data, error } = await supabase
      .from("clientes")
      .insert({ nombre: nombreNuevo.trim(), telefono: telefonoNuevo.trim() || null })
      .select()
      .single();
    setGuardando(false);
    if (!error && data) {
      onSeleccionar(data.id, data.nombre);
      setCreando(false);
      setNombreNuevo("");
      setTelefonoNuevo("");
    }
  }

  return (
    <div data-mantiene-foco>
      {!creando ? (
        <>
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-600" />
            <Input
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Buscar cliente por nombre o teléfono…"
              className="pl-10"
            />
          </div>
          {resultados.length > 0 && (
            <ul className="mt-1.5 max-h-48 overflow-y-auto rounded-xl border border-border">
              {resultados.map((c) => (
                <li key={c.id} className="border-b border-border last:border-0">
                  <button
                    onClick={() => {
                      onSeleccionar(c.id, c.nombre);
                      setTexto("");
                      setResultados([]);
                    }}
                    className="flex w-full flex-col items-start p-2.5 text-left hover:bg-rose-50"
                  >
                    <span className="text-[13.5px] font-semibold text-ink-900">{c.nombre}</span>
                    {c.telefono && <span className="text-[12px] text-ink-600">{c.telefono}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button
            onClick={() => setCreando(true)}
            className="mt-2 flex items-center gap-1.5 text-[13px] font-semibold text-rose-700"
          >
            <UserPlus size={15} /> Cliente nuevo
          </button>
        </>
      ) : (
        <div className="rounded-xl border border-border p-3">
          <Input
            value={nombreNuevo}
            onChange={(e) => setNombreNuevo(e.target.value)}
            placeholder="Nombre"
            className="mb-2"
          />
          <Input
            value={telefonoNuevo}
            onChange={(e) => setTelefonoNuevo(e.target.value)}
            placeholder="Teléfono (para el recordatorio por WhatsApp)"
            className="mb-2.5"
          />
          <div className="flex gap-2">
            <Button onClick={crearCliente} disabled={guardando || !nombreNuevo.trim()} className="flex-1">
              Guardar y elegir
            </Button>
            <Button variante="secundario" onClick={() => setCreando(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
