-- =====================================================================
-- FASE 4 — Compras: es lo que HABILITA un artículo en el stock.
--
-- Una compra confirmada, de forma atómica:
--   1. crea compras + compra_items
--   2. suma stock en el almacén elegido (stock_movimientos tipo='compra')
--   3. guarda el último costo por artículo (articulo_costos)
--   4. si vino precio_venta_nuevo, actualiza el precio del artículo
--   5. si es a crédito, anota la deuda con el proveedor
-- =====================================================================

create type public.estado_compra as enum ('confirmada', 'anulada');
create type public.condicion_compra as enum ('contado', 'credito');

create sequence public.compras_numero_seq start 1;

create table public.compras (
  id              uuid primary key default gen_random_uuid(),
  numero          int not null default nextval('public.compras_numero_seq') unique,
  proveedor_id    uuid not null references public.proveedores(id),
  almacen_id      uuid not null references public.almacenes(id),
  condicion       public.condicion_compra not null,
  total           numeric(12,0) not null default 0,
  estado          public.estado_compra not null default 'confirmada',
  usuario_id      uuid not null references public.usuarios(id) default auth.uid(),
  created_at      timestamptz not null default now(),
  anulada_motivo  text,
  anulada_por     uuid references public.usuarios(id),
  anulada_at      timestamptz
);

create index idx_compras_proveedor on public.compras (proveedor_id, created_at desc);
create index idx_compras_fecha on public.compras (created_at desc);

create table public.compra_items (
  id                  uuid primary key default gen_random_uuid(),
  compra_id           uuid not null references public.compras(id) on delete cascade,
  articulo_id         uuid not null references public.articulos(id),
  cantidad            int not null check (cantidad > 0),
  costo_unitario      numeric(12,0) not null check (costo_unitario >= 0),
  precio_venta_nuevo  numeric(12,0)          -- opcional; si viene, pisa articulos.precio_venta
);

create index idx_compra_items_compra on public.compra_items (compra_id);
create index idx_compra_items_articulo on public.compra_items (articulo_id);

alter table public.stock_movimientos
  add constraint fk_stock_mov_compra foreign key (compra_id) references public.compras(id);
alter table public.proveedor_movimientos
  add constraint fk_prov_mov_compra foreign key (compra_id) references public.compras(id);

alter table public.compras enable row level security;
alter table public.compra_items enable row level security;

create policy compras_select on public.compras
  for select to authenticated using (public.es_staff_activo());
create policy compra_items_select on public.compra_items
  for select to authenticated using (public.es_staff_activo());
-- Sin insert/update directo: todo por las RPC de abajo.

-- p_items = [{"articulo_id":"...","cantidad":10,"costo_unitario":25000,"precio_venta_nuevo":40000|null}]
create or replace function public.confirmar_compra(
  p_proveedor_id uuid,
  p_almacen_id uuid,
  p_condicion public.condicion_compra,
  p_items jsonb
) returns public.compras
language plpgsql security definer set search_path = public as $$
declare
  v_compra public.compras;
  v_item record;
  v_total numeric := 0;
begin
  if not public.es_staff_activo() then raise exception 'No autorizado'; end if;
  if jsonb_array_length(coalesce(p_items, '[]'::jsonb)) = 0 then
    raise exception 'La compra no tiene items';
  end if;

  insert into public.compras (proveedor_id, almacen_id, condicion, usuario_id)
  values (p_proveedor_id, p_almacen_id, p_condicion, auth.uid())
  returning * into v_compra;

  for v_item in
    select * from jsonb_to_recordset(p_items)
      as x(articulo_id uuid, cantidad int, costo_unitario numeric, precio_venta_nuevo numeric)
  loop
    insert into public.compra_items (compra_id, articulo_id, cantidad, costo_unitario, precio_venta_nuevo)
    values (v_compra.id, v_item.articulo_id, v_item.cantidad, v_item.costo_unitario, v_item.precio_venta_nuevo);

    v_total := v_total + (v_item.cantidad * v_item.costo_unitario);

    -- entra al stock del almacén elegido
    insert into public.stock_movimientos (articulo_id, almacen_id, tipo, cantidad, compra_id, usuario_id)
    values (v_item.articulo_id, p_almacen_id, 'compra', v_item.cantidad, v_compra.id, auth.uid());

    -- último costo conocido
    insert into public.articulo_costos (articulo_id, precio_costo, updated_by)
    values (v_item.articulo_id, v_item.costo_unitario, auth.uid())
    on conflict (articulo_id)
    do update set precio_costo = excluded.precio_costo, updated_at = now(), updated_by = excluded.updated_by;

    -- precio de venta nuevo (si vino) — resetea el descuento de Inteligencia
    if v_item.precio_venta_nuevo is not null then
      update public.articulos
        set precio_venta = v_item.precio_venta_nuevo, precio_lista = null, descuento_pct = 0
        where id = v_item.articulo_id;
    end if;
  end loop;

  update public.compras set total = v_total where id = v_compra.id returning * into v_compra;

  -- compra a crédito -> deuda con el proveedor
  if p_condicion = 'credito' then
    insert into public.proveedor_movimientos (proveedor_id, tipo, monto, compra_id, saldo_resultante, usuario_id, notas)
    values (
      p_proveedor_id, 'deuda', v_total, v_compra.id,
      coalesce((select saldo from public.proveedores where id = p_proveedor_id), 0) + v_total,
      auth.uid(), 'Compra Nº ' || v_compra.numero
    );
  end if;

  return v_compra;
end;
$$;

create or replace function public.anular_compra(p_compra_id uuid, p_motivo text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_compra public.compras;
  v_item record;
begin
  if not public.es_admin() then raise exception 'Solo la administradora puede anular una compra'; end if;

  select * into v_compra from public.compras where id = p_compra_id;
  if not found then raise exception 'La compra no existe'; end if;
  if v_compra.estado = 'anulada' then raise exception 'La compra ya estaba anulada'; end if;

  update public.compras
    set estado = 'anulada', anulada_motivo = p_motivo, anulada_por = auth.uid(), anulada_at = now()
    where id = p_compra_id;

  -- saca del stock lo que había entrado
  for v_item in select articulo_id, cantidad from public.compra_items where compra_id = p_compra_id loop
    insert into public.stock_movimientos (articulo_id, almacen_id, tipo, cantidad, motivo, compra_id, usuario_id)
    values (v_item.articulo_id, v_compra.almacen_id, 'devolucion', -v_item.cantidad,
            'Anulación de compra Nº ' || v_compra.numero, p_compra_id, auth.uid());
  end loop;

  -- si era a crédito, revierte la deuda con un movimiento 'pago'
  if v_compra.condicion = 'credito' then
    insert into public.proveedor_movimientos (proveedor_id, tipo, monto, compra_id, saldo_resultante, usuario_id, notas)
    values (
      v_compra.proveedor_id, 'pago', v_compra.total, p_compra_id,
      coalesce((select saldo from public.proveedores where id = v_compra.proveedor_id), 0) - v_compra.total,
      auth.uid(), 'Reverso por anulación de compra Nº ' || v_compra.numero
    );
  end if;
end;
$$;
