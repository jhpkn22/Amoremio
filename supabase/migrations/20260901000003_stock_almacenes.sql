-- =====================================================================
-- FASE 3 — Almacenes + libro mayor de stock por almacén.
--
-- El stock de un artículo NUNCA se escribe a mano: es la suma de
-- `stock_movimientos` (compra / venta / ajuste / devolucion /
-- transferencia), aplicada por trigger a `articulo_stock` (una fila por
-- artículo x almacén). Mismo criterio que movimientos_stock del esquema
-- original, pero con almacén.
-- =====================================================================

create table public.almacenes (
  id            uuid primary key default gen_random_uuid(),
  nombre        text not null,
  direccion     text,
  es_principal  boolean not null default false,
  activo        boolean not null default true,
  created_at    timestamptz not null default now(),
  deleted_at    timestamptz
);

-- A lo sumo un almacén principal.
create unique index uq_un_almacen_principal
  on public.almacenes (es_principal) where es_principal = true and deleted_at is null;

alter table public.almacenes enable row level security;
create policy almacenes_all_staff on public.almacenes
  for all to authenticated
  using (public.es_staff_activo()) with check (public.es_staff_activo());

create table public.articulo_stock (
  articulo_id  uuid not null references public.articulos(id) on delete cascade,
  almacen_id   uuid not null references public.almacenes(id) on delete cascade,
  cantidad     int not null default 0,
  primary key (articulo_id, almacen_id)
);

alter table public.articulo_stock enable row level security;
create policy articulo_stock_select on public.articulo_stock
  for select to authenticated using (public.es_staff_activo());
revoke update (cantidad) on public.articulo_stock from authenticated, anon;

create type public.tipo_mov_articulo as enum
  ('compra', 'venta', 'ajuste', 'devolucion', 'transferencia');

create table public.stock_movimientos (
  id                uuid primary key default gen_random_uuid(),
  articulo_id       uuid not null references public.articulos(id),
  almacen_id        uuid not null references public.almacenes(id),
  tipo              public.tipo_mov_articulo not null,
  cantidad          int not null,          -- delta con signo: + entra / - sale
  motivo            text,
  compra_id         uuid,                  -- FK se agrega en Fase 4
  venta_id          uuid,                  -- FK se agrega en Fase 5
  transferencia_id  uuid,                  -- casa los dos asientos de una transferencia
  usuario_id        uuid not null references public.usuarios(id) default auth.uid(),
  created_at        timestamptz not null default now(),
  constraint chk_stock_mov_ajuste_motivo check (tipo <> 'ajuste' or motivo is not null)
);

create index idx_stock_mov_articulo on public.stock_movimientos (articulo_id, created_at desc);
create index idx_stock_mov_almacen on public.stock_movimientos (almacen_id, created_at desc);
create index idx_stock_mov_compra on public.stock_movimientos (compra_id);
create index idx_stock_mov_venta on public.stock_movimientos (venta_id);

alter table public.stock_movimientos enable row level security;
create policy stock_mov_select on public.stock_movimientos
  for select to authenticated using (public.es_staff_activo());
-- Sin insert directo: todo entra por las RPC (ajuste/transferencia acá,
-- compra/venta/devolucion en Fase 4 y 5).

create or replace function public.fn_aplicar_stock_movimiento()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.articulo_stock (articulo_id, almacen_id, cantidad)
  values (new.articulo_id, new.almacen_id, new.cantidad)
  on conflict (articulo_id, almacen_id)
  do update set cantidad = public.articulo_stock.cantidad + excluded.cantidad;
  return new;
end;
$$;

create trigger trg_aplicar_stock_movimiento
  after insert on public.stock_movimientos
  for each row execute function public.fn_aplicar_stock_movimiento();

-- Ajuste manual de stock (delta con signo). Exige motivo.
create or replace function public.ajustar_stock(
  p_articulo_id uuid,
  p_almacen_id uuid,
  p_cantidad int,
  p_motivo text
) returns public.stock_movimientos
language plpgsql security definer set search_path = public as $$
declare v_mov public.stock_movimientos;
begin
  if not public.es_staff_activo() then raise exception 'No autorizado'; end if;
  if coalesce(btrim(p_motivo), '') = '' then raise exception 'Un ajuste necesita un motivo'; end if;
  if p_cantidad = 0 then raise exception 'La cantidad del ajuste no puede ser 0'; end if;

  insert into public.stock_movimientos (articulo_id, almacen_id, tipo, cantidad, motivo, usuario_id)
  values (p_articulo_id, p_almacen_id, 'ajuste', p_cantidad, p_motivo, auth.uid())
  returning * into v_mov;
  return v_mov;
end;
$$;

-- Transferencia entre almacenes: dos asientos con el mismo transferencia_id.
create or replace function public.transferir_stock(
  p_articulo_id uuid,
  p_almacen_origen uuid,
  p_almacen_destino uuid,
  p_cantidad int
) returns void
language plpgsql security definer set search_path = public as $$
declare v_tid uuid := gen_random_uuid();
begin
  if not public.es_staff_activo() then raise exception 'No autorizado'; end if;
  if p_cantidad is null or p_cantidad <= 0 then raise exception 'La cantidad tiene que ser mayor a 0'; end if;
  if p_almacen_origen = p_almacen_destino then raise exception 'El origen y el destino no pueden ser el mismo almacén'; end if;

  insert into public.stock_movimientos (articulo_id, almacen_id, tipo, cantidad, motivo, transferencia_id, usuario_id)
  values (p_articulo_id, p_almacen_origen, 'transferencia', -p_cantidad, 'Transferencia (salida)', v_tid, auth.uid());

  insert into public.stock_movimientos (articulo_id, almacen_id, tipo, cantidad, motivo, transferencia_id, usuario_id)
  values (p_articulo_id, p_almacen_destino, 'transferencia', p_cantidad, 'Transferencia (entrada)', v_tid, auth.uid());
end;
$$;

-- Almacén inicial.
insert into public.almacenes (nombre, es_principal) values ('Local', true);
