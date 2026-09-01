-- =====================================================================
-- FASE 5 — Caja sobre el catálogo real (`articulos`) + almacén del turno.
--
-- La venta vieja (confirmar_venta / anular_venta sobre `productos`) se
-- conserva para drenar cola offline antigua. Lo nuevo pasa por
-- confirmar_venta_v2 / anular_venta_v2, que descuentan de un almacén.
-- =====================================================================

alter table public.cajas_turno
  add column if not exists almacen_id uuid references public.almacenes(id);

alter table public.ventas
  add column if not exists almacen_id uuid references public.almacenes(id);

alter table public.venta_items
  add column if not exists articulo_id uuid references public.articulos(id);

alter table public.venta_items
  alter column producto_id drop not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'chk_venta_item_ref'
  ) then
    alter table public.venta_items
      add constraint chk_venta_item_ref check (producto_id is not null or articulo_id is not null);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'fk_stock_mov_venta') then
    alter table public.stock_movimientos
      add constraint fk_stock_mov_venta foreign key (venta_id) references public.ventas(id);
  end if;
end $$;

-- p_items = [{"articulo_id":"...","cantidad":2,"precio_unitario":45000,"descuento_item":0}]
create or replace function public.confirmar_venta_v2(
  p_client_uuid uuid,
  p_caja_turno_id uuid,
  p_almacen_id uuid,
  p_cliente_id uuid,
  p_forma_pago public.forma_pago,
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
  if not public.es_staff_activo() then raise exception 'No autorizado'; end if;

  select * into v_venta from public.ventas where client_uuid = p_client_uuid;
  if found then return v_venta; end if;   -- idempotencia (reintento de la cola offline)

  for v_item in
    select * from jsonb_to_recordset(p_items)
      as x(articulo_id uuid, cantidad int, precio_unitario numeric, descuento_item numeric)
  loop
    v_subtotal := v_subtotal + (v_item.precio_unitario * v_item.cantidad) - coalesce(v_item.descuento_item, 0);
  end loop;
  v_total := v_subtotal - coalesce(p_descuento_total, 0);
  v_vuelto := case when p_efectivo_recibido is not null then p_efectivo_recibido - v_total else null end;

  insert into public.ventas (
    client_uuid, caja_turno_id, almacen_id, usuario_id, cliente_id, forma_pago,
    subtotal, descuento_total, total, efectivo_recibido, vuelto, creada_offline
  ) values (
    p_client_uuid, p_caja_turno_id, p_almacen_id, auth.uid(), p_cliente_id, p_forma_pago,
    v_subtotal, coalesce(p_descuento_total, 0), v_total, p_efectivo_recibido, v_vuelto, p_creada_offline
  ) returning * into v_venta;

  for v_item in
    select * from jsonb_to_recordset(p_items)
      as x(articulo_id uuid, cantidad int, precio_unitario numeric, descuento_item numeric)
  loop
    insert into public.venta_items (venta_id, articulo_id, nombre_producto, cantidad, precio_unitario, descuento_item, subtotal_item)
    select v_venta.id, v_item.articulo_id, a.nombre, v_item.cantidad, v_item.precio_unitario,
           coalesce(v_item.descuento_item, 0),
           (v_item.precio_unitario * v_item.cantidad) - coalesce(v_item.descuento_item, 0)
    from public.articulos a where a.id = v_item.articulo_id
    returning id into v_venta_item_id;

    select precio_costo into v_costo from public.articulo_costos where articulo_id = v_item.articulo_id;
    if v_costo is not null then
      insert into public.venta_item_costos (venta_item_id, costo_unitario) values (v_venta_item_id, v_costo);
    end if;

    insert into public.stock_movimientos (articulo_id, almacen_id, tipo, cantidad, venta_id, usuario_id)
    values (v_item.articulo_id, p_almacen_id, 'venta', -v_item.cantidad, v_venta.id, auth.uid());
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

create or replace function public.anular_venta_v2(p_venta_id uuid, p_motivo text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_venta public.ventas;
  v_item record;
begin
  if not public.es_admin() then raise exception 'Solo la administradora puede anular una venta'; end if;

  select * into v_venta from public.ventas where id = p_venta_id;
  if not found then raise exception 'La venta no existe'; end if;
  if v_venta.estado = 'anulada' then raise exception 'La venta ya estaba anulada'; end if;

  update public.ventas
    set estado = 'anulada', anulada_motivo = p_motivo, anulada_por = auth.uid(), anulada_at = now()
    where id = p_venta_id;

  -- devolver stock de los items del catálogo real
  for v_item in
    select articulo_id, cantidad from public.venta_items
    where venta_id = p_venta_id and articulo_id is not null
  loop
    insert into public.stock_movimientos (articulo_id, almacen_id, tipo, cantidad, motivo, venta_id, usuario_id)
    values (v_item.articulo_id, coalesce(v_venta.almacen_id, (select id from public.almacenes where es_principal limit 1)),
            'devolucion', v_item.cantidad, 'Anulación de venta: ' || p_motivo, p_venta_id, auth.uid());
  end loop;

  -- revertir la deuda si era fiado
  if exists (select 1 from public.cuenta_movimientos where venta_id = p_venta_id and tipo = 'deuda') then
    insert into public.cuenta_movimientos (cliente_id, tipo, monto, pago_id, usuario_id, saldo_resultante, notas)
    select cliente_id, 'pago', monto, null, auth.uid(),
           (select saldo_actual from public.clientes c where c.id = cm.cliente_id) - monto,
           'Reverso automático por anulación de venta'
    from public.cuenta_movimientos cm where venta_id = p_venta_id and tipo = 'deuda';
  end if;
end;
$$;
