-- =====================================================================
-- AMORE MÍO — Esquema de base de datos (Supabase / Postgres) + RLS
-- Paso 3 del plan: arquitectura y diseño ya aprobados.
-- Pensado para correr como una única migración inicial
-- (supabase/migrations/00000000000000_init.sql) o dividirse luego
-- en migraciones más chicas si preferís ese flujo.
--
-- Convenciones que se repiten en todo el archivo:
--   · Nada se borra físicamente: las tablas con baja lógica tienen
--     deleted_at timestamptz, nunca hay política de DELETE.
--   · Toda venta es reconstruible: los precios y costos se copian
--     ("snapshot") al momento de la venta, nunca se referencia el
--     precio actual del producto.
--   · Lo que ve solo la dueña (costo, margen) vive en tablas
--     separadas con su propia RLS — no es una columna escondida en
--     el frontend, es una tabla que una vendedora no puede leer ni
--     golpeando la API de Supabase directamente.
--   · El stock nunca se escribe a mano: siempre es la suma de
--     movimientos_stock, mantenida por trigger. Se protege también
--     a nivel de columna (REVOKE) para que ni admin la pise directo.
--   · Ninguna tabla usa FORCE ROW LEVEL SECURITY a propósito: las
--     funciones es_admin()/es_staff_activo()/rol_actual() son
--     SECURITY DEFINER y necesitan leer public.usuarios como dueñas
--     de la función para decidir el rol — si usuarios forzara RLS,
--     esa misma lectura interna volvería a evaluar la policy de
--     usuarios, que a su vez llama a es_staff_activo(), y entra en
--     recursión infinita. El tráfico real de la app nunca pasa por
--     el rol dueño de las tablas (siempre es 'authenticated' o
--     'anon', vía la API de Supabase), así que RLS sin FORCE ya
--     cubre todo lo que hace falta cubrir.
-- =====================================================================

create extension if not exists pgcrypto;   -- gen_random_uuid()
create extension if not exists pg_trgm;    -- búsqueda por nombre (ILIKE rápido)

-- =====================================================================
-- 1. ENUMS
-- =====================================================================

create type rol_usuario as enum ('admin', 'vendedora');
create type tipo_movimiento_stock as enum ('entrada', 'salida', 'ajuste', 'devolucion');
create type forma_pago as enum ('efectivo', 'transferencia', 'qr', 'fiado');
create type estado_venta as enum ('confirmada', 'anulada');
create type estado_turno as enum ('abierto', 'cerrado');
create type tipo_movimiento_cuenta as enum ('deuda', 'pago');

-- =====================================================================
-- 2. USUARIOS (perfil sobre auth.users de Supabase)
-- =====================================================================

create table public.usuarios (
  id            uuid primary key references auth.users(id) on delete restrict,
  nombre        text not null,
  rol           rol_usuario not null default 'vendedora',
  activo        boolean not null default true,
  telefono      text,
  created_at    timestamptz not null default now()
);

comment on table public.usuarios is
  'Perfil de cada persona que usa el sistema. rol=admin es la dueña; rol=vendedora es el mostrador. Nunca se borra: se desactiva con activo=false para que las ventas históricas sigan mostrando "Vend: Ana".';

-- Función auxiliar: SECURITY DEFINER para poder leer el rol propio
-- sin caer en recursión de RLS (una policy de usuarios que consulte
-- usuarios se muerde la cola). Se usa en TODAS las policies del resto
-- del esquema.
create or replace function public.rol_actual()
returns rol_usuario
language sql stable security definer set search_path = public as $$
  select rol from public.usuarios where id = auth.uid();
$$;

create or replace function public.es_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select rol = 'admin' from public.usuarios where id = auth.uid()), false);
$$;

create or replace function public.es_staff_activo()
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select activo from public.usuarios where id = auth.uid()), false);
$$;

-- Alta automática de perfil cuando alguien se registra en Supabase Auth.
-- Entra siempre como vendedora; la primera cuenta (la dueña) se
-- promueve a mano una sola vez (ver nota al final del archivo).
create or replace function public.fn_alta_usuario()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.usuarios (id, nombre, rol)
  values (new.id, coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email, '@', 1)), 'vendedora');
  return new;
end;
$$;

create trigger trg_alta_usuario
  after insert on auth.users
  for each row execute function public.fn_alta_usuario();

alter table public.usuarios enable row level security;

create policy usuarios_select on public.usuarios
  for select to authenticated
  using (public.es_staff_activo());

create policy usuarios_update_propio_nombre on public.usuarios
  for update to authenticated
  using (id = auth.uid() or public.es_admin())
  with check (id = auth.uid() or public.es_admin());

-- OJO: la policy de arriba es a nivel de fila, no de columna — sin esto,
-- cualquier vendedora podría hacer PATCH a su propia fila y poner
-- rol='admin' o activo=true después de que la dueña la desactive. El
-- privilegio de columna se revisa aparte de RLS, así que este REVOKE
-- bloquea el cambio de rol/activo pase lo que pase la policy de arriba
-- — el único camino para tocar esas dos columnas es la función de abajo.
revoke update (rol, activo) on public.usuarios from authenticated;

create or replace function public.actualizar_rol_usuario(p_usuario_id uuid, p_rol rol_usuario, p_activo boolean)
returns public.usuarios
language plpgsql security definer set search_path = public as $$
declare v_usuario public.usuarios;
begin
  if not public.es_admin() then
    raise exception 'Solo la administradora puede cambiar roles o activar/desactivar usuarios';
  end if;
  update public.usuarios set rol = p_rol, activo = p_activo where id = p_usuario_id
  returning * into v_usuario;
  if not found then
    raise exception 'El usuario % no existe', p_usuario_id;
  end if;
  return v_usuario;
end;
$$;

-- =====================================================================
-- 3. CATEGORÍAS
-- =====================================================================

create table public.categorias (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null,
  slug        text not null unique,
  orden       int not null default 0,
  activa      boolean not null default true,
  deleted_at  timestamptz
);

alter table public.categorias enable row level security;

create policy categorias_select_publico on public.categorias
  for select to anon, authenticated
  using (deleted_at is null);

create policy categorias_write_staff on public.categorias
  for insert to authenticated with check (public.es_staff_activo());

create policy categorias_update_staff on public.categorias
  for update to authenticated
  using (public.es_staff_activo()) with check (public.es_staff_activo());

-- =====================================================================
-- 4. PRODUCTOS, VARIANTES, FOTOS, COSTOS (split para ocultar margen)
-- =====================================================================

create sequence public.productos_codigo_interno_seq start 1;

-- Genera AM-0001, AM-0002... Se llama desde el default de la columna,
-- así que "generar código interno" (punto 6 del brief) queda resuelto
-- solo, sin que la vendedora tenga que pedirlo aparte.
-- security definer para que nextval() no choque con permisos de
-- secuencia: la llama 'authenticated' al insertar un producto, pero
-- corre como dueña de la secuencia (mismo motivo que las funciones
-- de rol de la sección 2).
create or replace function public.fn_generar_codigo_interno()
returns text
language sql security definer set search_path = public as $$
  select 'AM-' || lpad(nextval('public.productos_codigo_interno_seq')::text, 4, '0');
$$;

create table public.productos (
  id                  uuid primary key default gen_random_uuid(),
  codigo_interno      text not null unique default public.fn_generar_codigo_interno(),
  codigo_barras       text unique,                 -- código de fábrica, si lo trae
  nombre              text not null,
  descripcion         text,
  categoria_id        uuid references public.categorias(id),
  proveedor           text,
  precio_venta        numeric(12,0) not null check (precio_venta >= 0),  -- Gs., sin decimales
  stock_actual        int not null default 0,       -- solo la escribe el trigger (sección 6)
  stock_minimo        int not null default 0,
  tiene_variantes     boolean not null default false,
  visible_en_vitrina  boolean not null default true,
  es_a_pedido         boolean not null default false,
  dias_demora         int,                           -- si es_a_pedido = true
  opciones_personalizacion jsonb not null default '[]'::jsonb, -- ["texto a grabar","color","talle","foto del cliente"]
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  deleted_at          timestamptz
);

comment on column public.productos.stock_actual is
  'NO escribir directo: es la suma de movimientos_stock, mantenida por trigger. Columna protegida con REVOKE (sección 6).';

create index idx_productos_categoria on public.productos (categoria_id) where deleted_at is null;
create index idx_productos_codigo_barras on public.productos (codigo_barras) where deleted_at is null;
create index idx_productos_vitrina on public.productos (visible_en_vitrina) where deleted_at is null and visible_en_vitrina = true;
create index idx_productos_nombre_trgm on public.productos using gin (nombre gin_trgm_ops);

-- Costo y proveedor: tabla aparte, 1 a 1, con RLS solo-admin.
-- Esto es lo que de verdad impide que una vendedora vea el costo,
-- no una columna oculta en el frontend: aunque llame a la REST API
-- de Supabase directo para "productos", esta tabla ni existe para ella.
create table public.producto_costos (
  producto_id   uuid primary key references public.productos(id) on delete cascade,
  precio_costo  numeric(12,0) not null check (precio_costo >= 0),
  updated_at    timestamptz not null default now(),
  updated_by    uuid references public.usuarios(id)
);

create table public.variantes (
  id               uuid primary key default gen_random_uuid(),
  producto_id      uuid not null references public.productos(id) on delete cascade,
  talle            text,
  color            text,
  modelo           text,
  codigo_interno   text unique,        -- AM-0001-A, se arma en el trigger de abajo
  stock_actual     int not null default 0,
  stock_minimo     int not null default 0,
  precio_venta     numeric(12,0),      -- null = usa el precio del producto
  deleted_at       timestamptz,
  unique (producto_id, talle, color, modelo)
);

create or replace function public.fn_codigo_variante()
returns trigger language plpgsql as $$
declare
  base text;
  letra text;
  n int;
begin
  select codigo_interno into base from public.productos where id = new.producto_id;
  select count(*) into n from public.variantes where producto_id = new.producto_id;
  letra := chr(65 + n); -- A, B, C...
  new.codigo_interno := base || '-' || letra;
  return new;
end;
$$;

create trigger trg_codigo_variante
  before insert on public.variantes
  for each row when (new.codigo_interno is null)
  execute function public.fn_codigo_variante();

create table public.producto_fotos (
  id              uuid primary key default gen_random_uuid(),
  producto_id     uuid not null references public.productos(id) on delete cascade,
  path_original   text not null,   -- ruta en Supabase Storage
  path_thumbnail  text,            -- generada al subir (obligatorio por el brief, punto 3)
  orden           int not null default 0,
  created_at      timestamptz not null default now()
);

alter table public.productos enable row level security;
alter table public.producto_costos enable row level security;
alter table public.variantes enable row level security;
alter table public.producto_fotos enable row level security;

-- Vitrina pública: solo lo visible, sin login.
create policy productos_select_publico on public.productos
  for select to anon, authenticated
  using (deleted_at is null and (visible_en_vitrina = true or public.es_staff_activo()));

create policy productos_write_staff on public.productos
  for insert to authenticated with check (public.es_staff_activo());

create policy productos_update_staff on public.productos
  for update to authenticated
  using (public.es_staff_activo()) with check (public.es_staff_activo());

-- Nadie puede escribir stock_actual desde la API: solo el trigger,
-- que corre con privilegios de dueño de tabla.
revoke update (stock_actual) on public.productos from authenticated, anon;

create policy costos_solo_admin on public.producto_costos
  for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

create policy variantes_select on public.variantes
  for select to anon, authenticated using (deleted_at is null);
create policy variantes_write_staff on public.variantes
  for insert to authenticated with check (public.es_staff_activo());
create policy variantes_update_staff on public.variantes
  for update to authenticated using (public.es_staff_activo()) with check (public.es_staff_activo());
revoke update (stock_actual) on public.variantes from authenticated, anon;

create policy fotos_select on public.producto_fotos for select to anon, authenticated using (true);
create policy fotos_write_staff on public.producto_fotos for insert to authenticated with check (public.es_staff_activo());
create policy fotos_delete_staff on public.producto_fotos for delete to authenticated using (public.es_staff_activo());

-- =====================================================================
-- 5. CLIENTES (cuentas corrientes)
-- =====================================================================

create table public.clientes (
  id              uuid primary key default gen_random_uuid(),
  nombre          text not null,
  telefono        text,                 -- para el link directo a WhatsApp
  documento       text,
  notas           text,
  limite_credito  numeric(12,0),        -- null = sin límite definido
  saldo_actual    numeric(12,0) not null default 0,  -- mantenido por trigger, ver sección 8
  created_at      timestamptz not null default now(),
  deleted_at      timestamptz
);

create index idx_clientes_nombre_trgm on public.clientes using gin (nombre gin_trgm_ops);
create index idx_clientes_saldo on public.clientes (saldo_actual) where deleted_at is null and saldo_actual > 0;

alter table public.clientes enable row level security;

create policy clientes_all_staff on public.clientes
  for all to authenticated
  using (public.es_staff_activo()) with check (public.es_staff_activo());

revoke update (saldo_actual) on public.clientes from authenticated, anon;

-- =====================================================================
-- 6. STOCK — libro mayor inmutable + trigger que actualiza el total
-- =====================================================================

create table public.movimientos_stock (
  id            uuid primary key default gen_random_uuid(),
  producto_id   uuid not null references public.productos(id),
  variante_id   uuid references public.variantes(id),
  tipo          tipo_movimiento_stock not null,
  cantidad      int not null,     -- delta con signo: + entrada/devolución, - salida/ajuste negativo
  motivo        text,             -- obligatorio para 'ajuste', se valida en el trigger
  venta_id      uuid,             -- se linkea cuando tipo='salida' viene de una venta (FK más abajo)
  usuario_id    uuid not null references public.usuarios(id) default auth.uid(),
  created_at    timestamptz not null default now(),
  constraint chk_ajuste_con_motivo check (tipo <> 'ajuste' or motivo is not null)
  -- que variante_id pertenezca a producto_id no se puede expresar como FK
  -- compuesto simple acá (variantes no tiene producto_id en su PK); se
  -- valida en el trigger fn_aplicar_movimiento_stock de abajo.
);

create index idx_mov_stock_producto on public.movimientos_stock (producto_id, created_at desc);
create index idx_mov_stock_venta on public.movimientos_stock (venta_id);

create or replace function public.fn_aplicar_movimiento_stock()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.variante_id is not null then
    if not exists (select 1 from public.variantes where id = new.variante_id and producto_id = new.producto_id) then
      raise exception 'La variante % no pertenece al producto %', new.variante_id, new.producto_id;
    end if;
    update public.variantes set stock_actual = stock_actual + new.cantidad where id = new.variante_id;
  else
    update public.productos set stock_actual = stock_actual + new.cantidad, updated_at = now() where id = new.producto_id;
  end if;
  return new;
end;
$$;

create trigger trg_aplicar_movimiento_stock
  after insert on public.movimientos_stock
  for each row execute function public.fn_aplicar_movimiento_stock();

alter table public.movimientos_stock enable row level security;

-- Libro mayor: se lee y se inserta, nunca se edita ni se borra
-- (ni siquiera admin — una corrección se hace con un nuevo movimiento
-- tipo 'ajuste', para que el historial quede completo).
create policy mov_stock_select on public.movimientos_stock
  for select to authenticated using (public.es_staff_activo());
create policy mov_stock_insert on public.movimientos_stock
  for insert to authenticated with check (public.es_staff_activo() and usuario_id = auth.uid());

-- =====================================================================
-- 7. CAJA — turnos y ventas
-- =====================================================================

create table public.cajas_turno (
  id                    uuid primary key default gen_random_uuid(),
  usuario_id            uuid not null references public.usuarios(id),
  monto_inicial         numeric(12,0) not null,
  monto_final_esperado  numeric(12,0),   -- calculado al cerrar (sección 9)
  monto_final_contado   numeric(12,0),
  diferencia            numeric(12,0) generated always as (monto_final_contado - monto_final_esperado) stored,
  estado                estado_turno not null default 'abierto',
  abierto_at            timestamptz not null default now(),
  cerrado_at            timestamptz
);

create unique index uq_un_turno_abierto_por_usuario
  on public.cajas_turno (usuario_id) where estado = 'abierto';

alter table public.cajas_turno enable row level security;

create policy turnos_select on public.cajas_turno for select to authenticated using (public.es_staff_activo());
create policy turnos_insert on public.cajas_turno for insert to authenticated
  with check (public.es_staff_activo() and usuario_id = auth.uid());
-- El cierre (UPDATE) se hace únicamente a través de la función cerrar_turno()
-- de la sección 9, que corre como SECURITY DEFINER, así que no hace falta
-- una policy de UPDATE abierta acá.

create sequence public.ventas_numero_ticket_seq start 1;

create table public.ventas (
  id                 uuid primary key default gen_random_uuid(),
  numero_ticket      int not null default nextval('public.ventas_numero_ticket_seq') unique,
  client_uuid        uuid unique,     -- idempotencia: la Caja offline genera este uuid
                                       -- ANTES de tener conexión; si la cola reintenta el
                                       -- envío, el unique constraint evita una venta duplicada.
  caja_turno_id      uuid not null references public.cajas_turno(id),
  usuario_id         uuid not null references public.usuarios(id),
  cliente_id         uuid references public.clientes(id),   -- obligatorio si forma_pago='fiado'
  forma_pago         forma_pago not null,
  subtotal           numeric(12,0) not null,
  descuento_total    numeric(12,0) not null default 0,
  total              numeric(12,0) not null,
  efectivo_recibido  numeric(12,0),
  vuelto             numeric(12,0),
  estado             estado_venta not null default 'confirmada',
  anulada_motivo     text,
  anulada_por        uuid references public.usuarios(id),
  anulada_at         timestamptz,
  creada_offline     boolean not null default false,   -- para reportes: cuánto se vendió sin señal
  created_at         timestamptz not null default now(),
  constraint chk_fiado_necesita_cliente check (forma_pago <> 'fiado' or cliente_id is not null),
  constraint chk_anulacion_completa check (
    (estado = 'confirmada' and anulada_motivo is null) or
    (estado = 'anulada' and anulada_motivo is not null and anulada_por is not null)
  )
);

alter table public.movimientos_stock
  add constraint fk_mov_stock_venta foreign key (venta_id) references public.ventas(id);

create index idx_ventas_turno on public.ventas (caja_turno_id);
create index idx_ventas_fecha on public.ventas (created_at desc);
create index idx_ventas_cliente on public.ventas (cliente_id) where cliente_id is not null;

create table public.venta_items (
  id               uuid primary key default gen_random_uuid(),
  venta_id         uuid not null references public.ventas(id) on delete cascade,
  producto_id      uuid not null references public.productos(id),
  variante_id      uuid references public.variantes(id),
  nombre_producto  text not null,      -- snapshot del nombre (si el producto cambia de nombre después)
  cantidad         int not null check (cantidad > 0),
  precio_unitario  numeric(12,0) not null,   -- snapshot: precio al momento de vender, no el actual
  descuento_item   numeric(12,0) not null default 0,
  subtotal_item    numeric(12,0) not null
);

create index idx_venta_items_venta on public.venta_items (venta_id);
create index idx_venta_items_producto on public.venta_items (producto_id);

-- Costo al momento de la venta: mismo patrón que producto_costos,
-- separado para que el margen tampoco se filtre por acá.
create table public.venta_item_costos (
  venta_item_id  uuid primary key references public.venta_items(id) on delete cascade,
  costo_unitario numeric(12,0) not null
);

alter table public.ventas enable row level security;
alter table public.venta_items enable row level security;
alter table public.venta_item_costos enable row level security;

create policy ventas_select on public.ventas for select to authenticated using (public.es_staff_activo());
-- No hay policy de INSERT/UPDATE directa: toda venta se crea y se anula
-- a través de confirmar_venta() / anular_venta() (sección 9), porque son
-- operaciones de varias tablas a la vez (venta + items + stock + cuenta
-- corriente) que tienen que ser atómicas.

create policy venta_items_select on public.venta_items for select to authenticated using (public.es_staff_activo());

create policy venta_item_costos_admin on public.venta_item_costos
  for select to authenticated using (public.es_admin());

-- =====================================================================
-- 8. CUENTAS CORRIENTES (fiado)
-- =====================================================================

create table public.pagos (
  id           uuid primary key default gen_random_uuid(),
  venta_id     uuid references public.ventas(id),      -- cobro inmediato de una venta
  cliente_id   uuid references public.clientes(id),     -- pago que salda una deuda existente
  forma_pago   forma_pago not null,
  monto        numeric(12,0) not null check (monto > 0),
  vuelto       numeric(12,0),
  usuario_id   uuid not null references public.usuarios(id) default auth.uid(),
  created_at   timestamptz not null default now(),
  constraint chk_pago_es_uno_u_otro check (
    (venta_id is not null and cliente_id is null) or
    (venta_id is null and cliente_id is not null)
  ),
  constraint chk_pago_cuenta_no_es_fiado check (venta_id is null or forma_pago <> 'fiado')
);

create table public.cuenta_movimientos (
  id                uuid primary key default gen_random_uuid(),
  cliente_id        uuid not null references public.clientes(id),
  tipo              tipo_movimiento_cuenta not null,
  monto             numeric(12,0) not null check (monto > 0),
  venta_id          uuid references public.ventas(id),   -- si tipo='deuda'
  pago_id           uuid references public.pagos(id),    -- si tipo='pago'
  saldo_resultante  numeric(12,0) not null,               -- snapshot, lo calcula el trigger
  usuario_id        uuid not null references public.usuarios(id) default auth.uid(),
  notas             text,
  created_at        timestamptz not null default now()
);

create index idx_cuenta_mov_cliente on public.cuenta_movimientos (cliente_id, created_at desc);

create or replace function public.fn_aplicar_pago_a_cuenta()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.cliente_id is not null then
    insert into public.cuenta_movimientos (cliente_id, tipo, monto, pago_id, usuario_id, saldo_resultante)
    values (
      new.cliente_id, 'pago', new.monto, new.id, new.usuario_id,
      (select saldo_actual from public.clientes where id = new.cliente_id) - new.monto
    );
  end if;
  return new;
end;
$$;

create trigger trg_pago_a_cuenta
  after insert on public.pagos
  for each row execute function public.fn_aplicar_pago_a_cuenta();

create or replace function public.fn_actualizar_saldo_cliente()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.clientes set saldo_actual = new.saldo_resultante where id = new.cliente_id;
  return new;
end;
$$;

create trigger trg_actualizar_saldo_cliente
  after insert on public.cuenta_movimientos
  for each row execute function public.fn_actualizar_saldo_cliente();

alter table public.pagos enable row level security;
alter table public.cuenta_movimientos enable row level security;

create policy pagos_select on public.pagos for select to authenticated using (public.es_staff_activo());
create policy pagos_insert on public.pagos for insert to authenticated
  with check (public.es_staff_activo() and usuario_id = auth.uid());

create policy cuenta_mov_select on public.cuenta_movimientos for select to authenticated using (public.es_staff_activo());
-- Sin policy de insert directa: cuenta_movimientos solo se llena desde
-- los triggers de arriba y desde confirmar_venta() (sección 9).

-- =====================================================================
-- 9. FUNCIONES RPC — las operaciones que de verdad importan
--
-- Estas cuatro son SECURITY DEFINER a propósito: necesitan tocar
-- producto_costos (para snapshotear el margen) aunque quien llame sea
-- una vendedora sin acceso directo a esa tabla. La función nunca
-- devuelve el costo al que llama — solo lo guarda internamente — así
-- que el aislamiento de costos sigue intacto.
-- =====================================================================

-- p_items viaja como jsonb — más simple de armar del lado del cliente
-- (Supabase JS / la cola offline) que un array de tipo compuesto, y
-- evita los dolores de cabeza de PostgREST casteando arrays de row types.
-- Forma esperada: [{"producto_id":"...", "variante_id":null, "cantidad":2,
--                    "precio_unitario":45000, "descuento_item":0}, ...]
create or replace function public.confirmar_venta(
  p_client_uuid uuid,
  p_caja_turno_id uuid,
  p_cliente_id uuid,
  p_forma_pago forma_pago,
  p_items jsonb,
  p_descuento_total numeric default 0,
  p_efectivo_recibido numeric default null,
  p_creada_offline boolean default false
) returns public.ventas
language plpgsql security definer set search_path = public as $$
declare
  v_venta public.ventas;
  v_item record;
  v_venta_item_id uuid;
  v_costo numeric;
  v_subtotal numeric := 0;
  v_total numeric;
  v_vuelto numeric;
begin
  if not public.es_staff_activo() then
    raise exception 'No autorizado';
  end if;

  -- idempotencia: si esta venta ya se sincronizó (reintento de la cola offline), devolverla tal cual
  select * into v_venta from public.ventas where client_uuid = p_client_uuid;
  if found then
    return v_venta;
  end if;

  for v_item in
    select * from jsonb_to_recordset(p_items)
      as x(producto_id uuid, variante_id uuid, cantidad int, precio_unitario numeric, descuento_item numeric)
  loop
    v_subtotal := v_subtotal + (v_item.precio_unitario * v_item.cantidad) - coalesce(v_item.descuento_item, 0);
  end loop;
  v_total := v_subtotal - coalesce(p_descuento_total, 0);
  v_vuelto := case when p_efectivo_recibido is not null then p_efectivo_recibido - v_total else null end;

  insert into public.ventas (
    client_uuid, caja_turno_id, usuario_id, cliente_id, forma_pago,
    subtotal, descuento_total, total, efectivo_recibido, vuelto, creada_offline
  ) values (
    p_client_uuid, p_caja_turno_id, auth.uid(), p_cliente_id, p_forma_pago,
    v_subtotal, coalesce(p_descuento_total, 0), v_total, p_efectivo_recibido, v_vuelto, p_creada_offline
  ) returning * into v_venta;

  for v_item in
    select * from jsonb_to_recordset(p_items)
      as x(producto_id uuid, variante_id uuid, cantidad int, precio_unitario numeric, descuento_item numeric)
  loop
    insert into public.venta_items (venta_id, producto_id, variante_id, nombre_producto, cantidad, precio_unitario, descuento_item, subtotal_item)
    select v_venta.id, v_item.producto_id, v_item.variante_id, p.nombre, v_item.cantidad, v_item.precio_unitario,
           coalesce(v_item.descuento_item, 0),
           (v_item.precio_unitario * v_item.cantidad) - coalesce(v_item.descuento_item, 0)
    from public.productos p where p.id = v_item.producto_id
    returning id into v_venta_item_id;

    select precio_costo into v_costo from public.producto_costos where producto_id = v_item.producto_id;
    if v_costo is not null then
      insert into public.venta_item_costos (venta_item_id, costo_unitario) values (v_venta_item_id, v_costo);
    end if;

    insert into public.movimientos_stock (producto_id, variante_id, tipo, cantidad, venta_id, usuario_id)
    values (v_item.producto_id, v_item.variante_id, 'salida', -v_item.cantidad, v_venta.id, auth.uid());
  end loop;

  if p_forma_pago = 'fiado' then
    insert into public.cuenta_movimientos (cliente_id, tipo, monto, venta_id, usuario_id, saldo_resultante)
    values (p_cliente_id, 'deuda', v_total, v_venta.id, auth.uid(),
            (select saldo_actual from public.clientes where id = p_cliente_id) + v_total);
  else
    insert into public.pagos (venta_id, forma_pago, monto, vuelto, usuario_id)
    values (v_venta.id, p_forma_pago, v_total, v_vuelto, auth.uid());
  end if;

  return v_venta;
end;
$$;

create or replace function public.anular_venta(p_venta_id uuid, p_motivo text)
returns void language plpgsql security definer set search_path = public as $$
declare v_item record;
begin
  if not public.es_admin() then
    raise exception 'Solo la administradora puede anular una venta';
  end if;

  update public.ventas set estado = 'anulada', anulada_motivo = p_motivo, anulada_por = auth.uid(), anulada_at = now()
  where id = p_venta_id and estado = 'confirmada';
  if not found then
    raise exception 'La venta no existe o ya estaba anulada';
  end if;

  for v_item in select producto_id, variante_id, cantidad from public.venta_items where venta_id = p_venta_id loop
    insert into public.movimientos_stock (producto_id, variante_id, tipo, cantidad, motivo, venta_id, usuario_id)
    values (v_item.producto_id, v_item.variante_id, 'devolucion', v_item.cantidad, 'Anulación de venta: ' || p_motivo, p_venta_id, auth.uid());
  end loop;

  -- si la venta anulada era fiado, revertir la deuda con un movimiento
  -- de tipo 'pago' (mismo mecanismo que un pago real, para que el
  -- historial de la cuenta del cliente quede legible y auditable)
  if exists (select 1 from public.cuenta_movimientos where venta_id = p_venta_id and tipo = 'deuda') then
    insert into public.cuenta_movimientos (cliente_id, tipo, monto, pago_id, usuario_id, saldo_resultante, notas)
    select cliente_id, 'pago', monto, null, auth.uid(),
           (select saldo_actual from public.clientes c where c.id = cm.cliente_id) - monto,
           'Reverso automático por anulación de venta'
    from public.cuenta_movimientos cm where venta_id = p_venta_id and tipo = 'deuda';
  end if;
end;
$$;

create or replace function public.registrar_pago_cuenta(p_cliente_id uuid, p_monto numeric, p_forma_pago forma_pago)
returns public.pagos
language plpgsql security definer set search_path = public as $$
declare v_pago public.pagos;
begin
  if not public.es_staff_activo() then raise exception 'No autorizado'; end if;
  if p_forma_pago = 'fiado' then raise exception 'Un pago de cuenta corriente no puede ser "fiado"'; end if;

  insert into public.pagos (cliente_id, forma_pago, monto, usuario_id)
  values (p_cliente_id, p_forma_pago, p_monto, auth.uid())
  returning * into v_pago;

  return v_pago;
end;
$$;

create or replace function public.cerrar_turno(p_turno_id uuid, p_monto_final_contado numeric)
returns public.cajas_turno
language plpgsql security definer set search_path = public as $$
declare
  v_turno public.cajas_turno;
  v_ventas_efectivo numeric;
begin
  select * into v_turno from public.cajas_turno where id = p_turno_id;
  if not found then
    raise exception 'El turno % no existe', p_turno_id;
  end if;
  if v_turno.usuario_id <> auth.uid() and not public.es_admin() then
    raise exception 'Solo quien abrió el turno (o la administradora) puede cerrarlo';
  end if;

  select coalesce(sum(total), 0) into v_ventas_efectivo
  from public.ventas where caja_turno_id = p_turno_id and forma_pago = 'efectivo' and estado = 'confirmada';

  update public.cajas_turno
  set estado = 'cerrado',
      monto_final_esperado = v_turno.monto_inicial + v_ventas_efectivo,
      monto_final_contado = p_monto_final_contado,
      cerrado_at = now()
  where id = p_turno_id
  returning * into v_turno;

  return v_turno;
end;
$$;

-- =====================================================================
-- 10. CONFIGURACIÓN (clave/valor)
-- =====================================================================

create table public.configuracion (
  clave       text primary key,
  valor       jsonb not null,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references public.usuarios(id)
);

insert into public.configuracion (clave, valor) values
  ('ticket_ancho_mm', '58'),
  ('ticket_chars_por_linea', '32'),
  ('ticket_ruta_impresion', '"web_bluetooth"'),  -- 'web_bluetooth' | 'rawbt'
  ('whatsapp_numero_local', '"595985791322"'),
  ('deuda_alerta_dias', '30');

alter table public.configuracion enable row level security;

create policy config_select on public.configuracion for select to authenticated using (public.es_staff_activo());
-- La vitrina pública necesita el número de WhatsApp del local para el botón
-- de "Consultar" — es el único valor de configuración que no es sensible
-- (el resto, ancho de ticket/ruta de impresión/umbral de alerta de deuda,
-- sigue siendo solo para el personal logueado).
create policy config_select_publico on public.configuracion
  for select to anon
  using (clave = 'whatsapp_numero_local');
create policy config_update_admin on public.configuracion for update to authenticated
  using (public.es_admin()) with check (public.es_admin());

-- =====================================================================
-- 11. NOTAS PARA CUANDO SE CORRA ESTA MIGRACIÓN
-- =====================================================================
-- 1. La primera cuenta que se registre en Supabase Auth entra como
--    'vendedora' por el trigger fn_alta_usuario. Promové a la dueña
--    a mano, una sola vez:
--      update public.usuarios set rol = 'admin' where id = '<uuid de la dueña>';
--
-- 2. Faltan los buckets de Storage para fotos de producto (con la
--    transformación a thumbnail) — eso se crea desde el dashboard de
--    Supabase o con la CLI, no con SQL, así que queda para el paso 4
--    (implementación de Stock).
--
-- 3. El seed de datos de ejemplo (punto 10 del brief: "seed con datos
--    realistas del rubro") es un archivo aparte, no mezclado acá, para
--    poder correr este esquema limpio en producción sin arrastrar
--    productos de prueba.
-- =====================================================================
