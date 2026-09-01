-- =====================================================================
-- FASE 1 — Catálogo real de artículos (separado de `productos`, que
-- queda como "Tienda web": piezas de muestra para la vitrina).
--
-- Un artículo es lo que de verdad se compra, se stockea y se vende en
-- Caja. Trae código de barras (de fábrica, generado o asignado) y su
-- costo vive en una tabla aparte con RLS solo-admin, igual patrón que
-- `producto_costos`.
-- =====================================================================

create sequence if not exists public.articulos_codigo_interno_seq start 1;

-- ART-0001, ART-0002... (mismo criterio que fn_generar_codigo_interno)
create or replace function public.fn_generar_codigo_articulo()
returns text
language sql security definer set search_path = public as $$
  select 'ART-' || lpad(nextval('public.articulos_codigo_interno_seq')::text, 4, '0');
$$;

-- Secuencia para los códigos de barras GENERADOS (EAN-13 de uso interno,
-- prefijo 200-based). Empieza alta para no chocar con nada real.
create sequence if not exists public.articulos_ean_seq start 1;

-- Dígito verificador EAN-13 sobre los primeros 12 dígitos.
create or replace function public.fn_ean13_check(p12 text)
returns text
language plpgsql immutable as $$
declare
  s int := 0;
  i int;
  d int;
begin
  if p12 !~ '^[0-9]{12}$' then
    raise exception 'fn_ean13_check espera 12 dígitos, recibió %', p12;
  end if;
  for i in 1..12 loop
    d := substr(p12, i, 1)::int;
    s := s + d * (case when i % 2 = 0 then 3 else 1 end);
  end loop;
  return ((10 - (s % 10)) % 10)::text;
end;
$$;

create table public.articulos (
  id                     uuid primary key default gen_random_uuid(),
  codigo_interno         text not null unique default public.fn_generar_codigo_articulo(),
  codigo_barras          text unique,
  -- de dónde salió el código de barras:
  --   'fabrica'    -> venía impreso en el producto al crearlo (NO editable)
  --   'generado'   -> lo generó el sistema (editable/regenerable hasta imprimir)
  --   'asignado'   -> se escaneó uno real y se le asignó (bloquea generar)
  --   'sin_codigo' -> todavía no tiene
  codigo_barras_origen   text not null default 'sin_codigo'
    check (codigo_barras_origen in ('fabrica', 'generado', 'asignado', 'sin_codigo')),
  -- una vez que se imprimió la etiqueta, ya no se puede regenerar/reasignar
  codigo_barras_impreso  boolean not null default false,
  nombre                 text not null,
  categoria_id           uuid references public.categorias(id),
  precio_venta           numeric(12,0) not null check (precio_venta >= 0),
  -- descuento de la pestaña "Inteligencia": precio_lista guarda el precio
  -- base para poder revertir; precio_venta siempre es el precio efectivo.
  precio_lista           numeric(12,0),
  descuento_pct          int not null default 0 check (descuento_pct between 0 and 90),
  stock_minimo           int not null default 0,
  activo                 boolean not null default true,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  deleted_at             timestamptz
);

create index idx_articulos_codigo_barras on public.articulos (codigo_barras) where deleted_at is null;
create index idx_articulos_categoria on public.articulos (categoria_id) where deleted_at is null;
create index idx_articulos_nombre_trgm on public.articulos using gin (nombre gin_trgm_ops);

comment on column public.articulos.codigo_barras_origen is
  'fabrica = no editable; generado = editable hasta imprimir; asignado = bloquea generar; sin_codigo = todavía no tiene.';

-- Costo del artículo: 1 a 1, RLS solo-admin (calco de producto_costos).
create table public.articulo_costos (
  articulo_id   uuid primary key references public.articulos(id) on delete cascade,
  precio_costo  numeric(12,0) not null check (precio_costo >= 0),
  updated_at    timestamptz not null default now(),
  updated_by    uuid references public.usuarios(id)
);

alter table public.articulos enable row level security;
alter table public.articulo_costos enable row level security;

create policy articulos_select_staff on public.articulos
  for select to authenticated using (public.es_staff_activo());
create policy articulos_insert_staff on public.articulos
  for insert to authenticated with check (public.es_staff_activo());
create policy articulos_update_staff on public.articulos
  for update to authenticated
  using (public.es_staff_activo()) with check (public.es_staff_activo());

-- El código de barras, su origen y el flag de impreso solo se tocan por
-- las RPC de abajo (SECURITY DEFINER), nunca por un UPDATE directo.
revoke update (codigo_barras, codigo_barras_origen, codigo_barras_impreso)
  on public.articulos from authenticated, anon;

create policy costos_articulo_solo_admin on public.articulo_costos
  for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

-- updated_at
create or replace function public.fn_touch_articulo()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
create trigger trg_touch_articulo
  before update on public.articulos
  for each row execute function public.fn_touch_articulo();

-- ---------------------------------------------------------------------
-- RPC del ciclo de vida del código de barras
-- ---------------------------------------------------------------------

-- Genera un EAN-13 interno. Solo si el artículo todavía no tiene código
-- y nunca se imprimió una etiqueta.
create or replace function public.generar_codigo_barras_articulo(p_articulo_id uuid)
returns public.articulos
language plpgsql security definer set search_path = public as $$
declare
  v_art public.articulos;
  v_base text;
  v_codigo text;
begin
  if not public.es_staff_activo() then raise exception 'No autorizado'; end if;

  select * into v_art from public.articulos where id = p_articulo_id;
  if not found then raise exception 'El artículo no existe'; end if;
  if v_art.codigo_barras_impreso then
    raise exception 'La etiqueta ya se imprimió; el código de barras quedó fijo.';
  end if;
  if v_art.codigo_barras_origen in ('fabrica', 'asignado') then
    raise exception 'Este artículo ya tiene un código de barras propio.';
  end if;

  loop
    v_base := '200' || lpad(nextval('public.articulos_ean_seq')::text, 9, '0');
    v_codigo := v_base || public.fn_ean13_check(v_base);
    exit when not exists (select 1 from public.articulos where codigo_barras = v_codigo);
  end loop;

  update public.articulos
    set codigo_barras = v_codigo, codigo_barras_origen = 'generado'
    where id = p_articulo_id
    returning * into v_art;
  return v_art;
end;
$$;

-- Asigna un código real escaneado. Bloquea la generación futura.
create or replace function public.asignar_codigo_barras_articulo(p_articulo_id uuid, p_codigo text)
returns public.articulos
language plpgsql security definer set search_path = public as $$
declare
  v_art public.articulos;
  v_limpio text := nullif(btrim(p_codigo), '');
begin
  if not public.es_staff_activo() then raise exception 'No autorizado'; end if;
  if v_limpio is null then raise exception 'Código vacío'; end if;

  select * into v_art from public.articulos where id = p_articulo_id;
  if not found then raise exception 'El artículo no existe'; end if;
  if v_art.codigo_barras_impreso then
    raise exception 'La etiqueta ya se imprimió; el código de barras quedó fijo.';
  end if;
  if v_art.codigo_barras_origen = 'fabrica' then
    raise exception 'Este artículo se creó con un código de fábrica; no se puede cambiar.';
  end if;
  if exists (select 1 from public.articulos where codigo_barras = v_limpio and id <> p_articulo_id) then
    raise exception 'Ese código de barras ya está en uso por otro artículo.';
  end if;

  update public.articulos
    set codigo_barras = v_limpio, codigo_barras_origen = 'asignado'
    where id = p_articulo_id
    returning * into v_art;
  return v_art;
end;
$$;

-- Marca la etiqueta como impresa -> congela el código de barras.
create or replace function public.marcar_codigo_impreso_articulo(p_articulo_id uuid)
returns public.articulos
language plpgsql security definer set search_path = public as $$
declare v_art public.articulos;
begin
  if not public.es_staff_activo() then raise exception 'No autorizado'; end if;
  update public.articulos set codigo_barras_impreso = true
    where id = p_articulo_id and codigo_barras is not null
    returning * into v_art;
  if not found then
    raise exception 'El artículo no existe o todavía no tiene código de barras.';
  end if;
  return v_art;
end;
$$;
