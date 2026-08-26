import { ShoppingCart } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatGs } from "@/lib/utils";
import { AccionesPedidoWeb } from "@/components/panel/AccionesPedidoWeb";

interface ItemPedidoWeb {
  producto_id: string;
  nombre: string;
  codigo_interno: string;
  cantidad: number;
  precio_unitario: number;
}

interface PedidoWeb {
  id: string;
  items: ItemPedidoWeb[];
  total: number;
  estado: "pendiente" | "procesado" | "descartado";
  created_at: string;
}

export default async function PedidosWebPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("pedidos_web")
    .select("id, items, total, estado, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  const pedidos = (data ?? []) as PedidoWeb[];
  const pendientes = pedidos.filter((p) => p.estado === "pendiente");
  const resueltos = pedidos.filter((p) => p.estado !== "pendiente");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[20px] font-bold text-ink-900">Pedidos web</h1>
        <p className="mt-0.5 text-[13px] text-ink-600">
          Carritos armados desde la página y enviados por WhatsApp. Revisá cada uno y decidí si descontás el stock.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-[14px] font-bold text-ink-900">Pendientes ({pendientes.length})</h2>
        {pendientes.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border py-8 text-center text-[13px] text-ink-600">
            No hay pedidos pendientes.
          </p>
        ) : (
          pendientes.map((pedido) => <TarjetaPedido key={pedido.id} pedido={pedido} />)
        )}
      </section>

      {resueltos.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-[14px] font-bold text-ink-900">Resueltos</h2>
          {resueltos.map((pedido) => (
            <TarjetaPedido key={pedido.id} pedido={pedido} />
          ))}
        </section>
      )}
    </div>
  );
}

function TarjetaPedido({ pedido }: { pedido: PedidoWeb }) {
  const fecha = new Date(pedido.created_at).toLocaleString("es-PY", { dateStyle: "short", timeStyle: "short" });

  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShoppingCart size={16} className="text-rose-700" />
          <span className="text-[12.5px] font-semibold text-ink-600">{fecha}</span>
        </div>
        <span className="tabular text-[15px] font-bold text-rose-700">{formatGs(pedido.total)}</span>
      </div>

      <ul className="mt-3 flex flex-col gap-1">
        {pedido.items.map((item) => (
          <li key={item.producto_id} className="flex items-center justify-between text-[13px] text-ink-900">
            <span>
              {item.cantidad}x {item.nombre}{" "}
              <span className="text-ink-600">({item.codigo_interno})</span>
            </span>
            <span className="tabular font-semibold">{formatGs(item.cantidad * item.precio_unitario)}</span>
          </li>
        ))}
      </ul>

      {pedido.estado === "pendiente" ? (
        <div className="mt-3 border-t border-border pt-3">
          <AccionesPedidoWeb pedidoId={pedido.id} />
        </div>
      ) : (
        <p className="mt-3 border-t border-border pt-3 text-[12.5px] font-semibold text-ink-600">
          {pedido.estado === "procesado" ? "Procesado" : "Descartado"}
        </p>
      )}
    </div>
  );
}
