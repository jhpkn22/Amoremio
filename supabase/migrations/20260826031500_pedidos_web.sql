-- Pedidos armados desde el carrito de la vitrina pública (checkout por WhatsApp).
-- Cualquiera (anon) puede crear uno al mandar su pedido; solo el staff logueado
-- puede verlos y marcarlos, para decidir si corresponde descontar stock.

create type public.estado_pedido_web as enum ('pendiente', 'procesado', 'descartado');

create table public.pedidos_web (
  id            uuid primary key default gen_random_uuid(),
  items         jsonb not null,   -- [{producto_id, nombre, codigo_interno, cantidad, precio_unitario}]
  total         numeric(12,0) not null,
  estado        public.estado_pedido_web not null default 'pendiente',
  procesado_por uuid references public.usuarios(id),
  procesado_at  timestamptz,
  created_at    timestamptz not null default now()
);

create index idx_pedidos_web_estado on public.pedidos_web (estado, created_at desc);

alter table public.pedidos_web enable row level security;

-- Cualquier visitante puede registrar su pedido (checkout público, sin login).
create policy pedidos_web_insert_publico on public.pedidos_web
  for insert to anon, authenticated with check (true);

-- Solo el staff logueado puede leerlos y marcarlos como procesados.
create policy pedidos_web_select_staff on public.pedidos_web
  for select to authenticated using (public.es_staff_activo());

create policy pedidos_web_update_staff on public.pedidos_web
  for update to authenticated
  using (public.es_staff_activo()) with check (public.es_staff_activo());
