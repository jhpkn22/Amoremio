-- =====================================================================
-- FASE 2 — Proveedores + su cuenta corriente (lo que le debemos).
--
-- Mismo patrón que clientes/cuenta_movimientos: `saldo` lo mantiene un
-- trigger a partir de `proveedor_movimientos` (deuda / pago), nunca se
-- escribe a mano. saldo > 0 = les debemos.
-- =====================================================================

create type public.tipo_mov_proveedor as enum ('deuda', 'pago');

create table public.proveedores (
  id           uuid primary key default gen_random_uuid(),
  nombre       text not null,
  ruc          text,
  telefono     text,
  descripcion  text,                                  -- qué vende (opcional)
  saldo        numeric(12,0) not null default 0,      -- >0 = les debemos; lo mantiene el trigger
  activo       boolean not null default true,
  created_at   timestamptz not null default now(),
  deleted_at   timestamptz
);

create index idx_proveedores_nombre_trgm on public.proveedores using gin (nombre gin_trgm_ops);
create index idx_proveedores_saldo on public.proveedores (saldo) where deleted_at is null and saldo > 0;

alter table public.proveedores enable row level security;

create policy proveedores_all_staff on public.proveedores
  for all to authenticated
  using (public.es_staff_activo()) with check (public.es_staff_activo());

revoke update (saldo) on public.proveedores from authenticated, anon;

create table public.proveedor_movimientos (
  id                uuid primary key default gen_random_uuid(),
  proveedor_id      uuid not null references public.proveedores(id),
  tipo              public.tipo_mov_proveedor not null,
  monto             numeric(12,0) not null check (monto > 0),
  compra_id         uuid,                              -- FK se agrega en Fase 4 (deuda por compra a crédito)
  forma_pago        public.forma_pago,                 -- si tipo='pago'
  saldo_resultante  numeric(12,0) not null,            -- snapshot, lo calcula quien inserta
  usuario_id        uuid not null references public.usuarios(id) default auth.uid(),
  notas             text,
  created_at        timestamptz not null default now(),
  constraint chk_prov_mov_pago_no_fiado check (tipo <> 'pago' or forma_pago is null or forma_pago <> 'fiado')
);

create index idx_prov_mov_proveedor on public.proveedor_movimientos (proveedor_id, created_at desc);

alter table public.proveedor_movimientos enable row level security;

create policy prov_mov_select on public.proveedor_movimientos
  for select to authenticated using (public.es_staff_activo());
-- Sin insert directo: solo por las RPC de abajo y por confirmar_compra() (Fase 4).

create or replace function public.fn_actualizar_saldo_proveedor()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.proveedores set saldo = new.saldo_resultante where id = new.proveedor_id;
  return new;
end;
$$;

create trigger trg_actualizar_saldo_proveedor
  after insert on public.proveedor_movimientos
  for each row execute function public.fn_actualizar_saldo_proveedor();

-- Registrar un pago a un proveedor (descuenta de lo que le debemos).
-- Ej: deuda 300.000, se paga 100.000 -> saldo 200.000.
create or replace function public.registrar_pago_proveedor(
  p_proveedor_id uuid,
  p_monto numeric,
  p_forma_pago public.forma_pago,
  p_notas text default null
) returns public.proveedor_movimientos
language plpgsql security definer set search_path = public as $$
declare v_mov public.proveedor_movimientos;
begin
  if not public.es_staff_activo() then raise exception 'No autorizado'; end if;
  if p_monto is null or p_monto <= 0 then raise exception 'El monto tiene que ser mayor a 0'; end if;
  if p_forma_pago = 'fiado' then raise exception 'Un pago a proveedor no puede ser "fiado"'; end if;

  insert into public.proveedor_movimientos (proveedor_id, tipo, monto, forma_pago, saldo_resultante, usuario_id, notas)
  values (
    p_proveedor_id, 'pago', p_monto, p_forma_pago,
    coalesce((select saldo from public.proveedores where id = p_proveedor_id), 0) - p_monto,
    auth.uid(), p_notas
  )
  returning * into v_mov;

  return v_mov;
end;
$$;

-- Anotar una deuda con un proveedor a mano (compra vieja, ajuste, etc.).
-- Las deudas por compras a crédito las genera confirmar_compra() en Fase 4.
create or replace function public.registrar_deuda_proveedor(
  p_proveedor_id uuid,
  p_monto numeric,
  p_notas text default null
) returns public.proveedor_movimientos
language plpgsql security definer set search_path = public as $$
declare v_mov public.proveedor_movimientos;
begin
  if not public.es_staff_activo() then raise exception 'No autorizado'; end if;
  if p_monto is null or p_monto <= 0 then raise exception 'El monto tiene que ser mayor a 0'; end if;

  insert into public.proveedor_movimientos (proveedor_id, tipo, monto, saldo_resultante, usuario_id, notas)
  values (
    p_proveedor_id, 'deuda', p_monto,
    coalesce((select saldo from public.proveedores where id = p_proveedor_id), 0) + p_monto,
    auth.uid(), p_notas
  )
  returning * into v_mov;

  return v_mov;
end;
$$;
