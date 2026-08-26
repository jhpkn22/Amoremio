-- =====================================================================
-- Datos de ejemplo — punto 10 del brief ("seed con datos de ejemplo
-- realistas del rubro para poder probar todo sin cargar nada a mano").
--
-- IMPORTANTE: correr esto DESPUÉS de haber iniciado sesión al menos
-- una vez en la app con un usuario real (eso crea la fila en
-- public.usuarios vía el trigger fn_alta_usuario). Los movimientos de
-- stock y los costos necesitan un usuario_id válido, así que el
-- script toma el primer usuario que encuentre — no hace falta que
-- edites ningún UUID a mano.
-- =====================================================================

do $$
declare
  v_usuario_id uuid;
  v_cat_tazas uuid;
  v_cat_remeras uuid;
  v_cat_cuadros uuid;
  v_cat_mates uuid;
  v_cat_bolsos uuid;
  v_cat_llaveros uuid;
  v_cat_peluches uuid;
  v_cat_globos uuid;
  v_producto uuid;
begin
  select id into v_usuario_id from public.usuarios order by created_at limit 1;
  if v_usuario_id is null then
    raise exception 'No hay ningún usuario todavía. Iniciá sesión una vez en la app y volvé a correr este seed.';
  end if;

  insert into public.categorias (nombre, slug, orden) values
    ('Tazas', 'tazas', 1) returning id into v_cat_tazas;
  insert into public.categorias (nombre, slug, orden) values
    ('Remeras', 'remeras', 2) returning id into v_cat_remeras;
  insert into public.categorias (nombre, slug, orden) values
    ('Cuadros', 'cuadros', 3) returning id into v_cat_cuadros;
  insert into public.categorias (nombre, slug, orden) values
    ('Mates y termos', 'mates-y-termos', 4) returning id into v_cat_mates;
  insert into public.categorias (nombre, slug, orden) values
    ('Mochilas y billeteras', 'mochilas-y-billeteras', 5) returning id into v_cat_bolsos;
  insert into public.categorias (nombre, slug, orden) values
    ('Llaveros', 'llaveros', 6) returning id into v_cat_llaveros;
  insert into public.categorias (nombre, slug, orden) values
    ('Peluches', 'peluches', 7) returning id into v_cat_peluches;
  insert into public.categorias (nombre, slug, orden) values
    ('Globos', 'globos', 8) returning id into v_cat_globos;

  -- Tazas
  insert into public.productos (nombre, descripcion, categoria_id, proveedor, precio_venta, stock_minimo, es_a_pedido, dias_demora, opciones_personalizacion)
  values ('Taza personalizada blanca', 'Taza cerámica blanca 325ml, sublimada con foto o texto.', v_cat_tazas, 'Distribuidora Ho', 45000, 5, true, 2, '["texto a grabar","foto del cliente"]')
  returning id into v_producto;
  insert into public.producto_costos (producto_id, precio_costo, updated_by) values (v_producto, 22000, v_usuario_id);
  insert into public.movimientos_stock (producto_id, tipo, cantidad, motivo, usuario_id) values (v_producto, 'entrada', 18, 'Carga inicial', v_usuario_id);

  insert into public.productos (nombre, descripcion, categoria_id, proveedor, precio_venta, stock_minimo, es_a_pedido, dias_demora, opciones_personalizacion)
  values ('Taza mágica (cambia de color)', 'Se sublima negra por fuera; el diseño aparece con el calor.', v_cat_tazas, 'Distribuidora Ho', 58000, 3, true, 3, '["texto a grabar","foto del cliente"]')
  returning id into v_producto;
  insert into public.producto_costos (producto_id, precio_costo, updated_by) values (v_producto, 31000, v_usuario_id);
  insert into public.movimientos_stock (producto_id, tipo, cantidad, motivo, usuario_id) values (v_producto, 'entrada', 10, 'Carga inicial', v_usuario_id);

  -- Remeras
  insert into public.productos (nombre, descripcion, categoria_id, proveedor, precio_venta, stock_minimo, es_a_pedido, dias_demora, opciones_personalizacion)
  values ('Remera personalizada', 'Algodón peinado 24/1, estampado por sublimación o vinilo textil.', v_cat_remeras, 'Textiles Ita', 68000, 4, true, 3, '["texto a grabar","talle","color"]')
  returning id into v_producto;
  insert into public.producto_costos (producto_id, precio_costo, updated_by) values (v_producto, 38000, v_usuario_id);
  update public.productos set tiene_variantes = true where id = v_producto;
  insert into public.variantes (producto_id, talle, stock_minimo) values (v_producto, 'S', 2), (v_producto, 'M', 2), (v_producto, 'L', 2), (v_producto, 'XL', 1);
  insert into public.movimientos_stock (producto_id, variante_id, tipo, cantidad, motivo, usuario_id)
    select v_producto, id, 'entrada', 6, 'Carga inicial', v_usuario_id from public.variantes where producto_id = v_producto;

  -- Cuadros
  insert into public.productos (nombre, descripcion, categoria_id, proveedor, precio_venta, stock_minimo, es_a_pedido, dias_demora, opciones_personalizacion)
  values ('Cuadro 20x30 personalizado', 'Impresión fotográfica sobre canvas con marco de madera.', v_cat_cuadros, 'Imprenta Sur', 95000, 2, true, 4, '["foto del cliente"]')
  returning id into v_producto;
  insert into public.producto_costos (producto_id, precio_costo, updated_by) values (v_producto, 52000, v_usuario_id);
  insert into public.movimientos_stock (producto_id, tipo, cantidad, motivo, usuario_id) values (v_producto, 'entrada', 4, 'Carga inicial', v_usuario_id);

  insert into public.productos (nombre, descripcion, categoria_id, proveedor, precio_venta, stock_minimo, es_a_pedido, dias_demora, opciones_personalizacion)
  values ('Cuadro 30x40 con luces', 'Canvas con guirnalda de luces LED integrada, a pilas.', v_cat_cuadros, 'Imprenta Sur', 145000, 1, true, 5, '["foto del cliente"]')
  returning id into v_producto;
  insert into public.producto_costos (producto_id, precio_costo, updated_by) values (v_producto, 82000, v_usuario_id);
  insert into public.movimientos_stock (producto_id, tipo, cantidad, motivo, usuario_id) values (v_producto, 'entrada', 3, 'Carga inicial', v_usuario_id);

  -- Mates y termos
  insert into public.productos (nombre, descripcion, categoria_id, proveedor, precio_venta, stock_minimo, es_a_pedido, opciones_personalizacion)
  values ('Set matero Stanley (mate + termo)', 'Set térmico de acero inoxidable, colores pastel, grabado láser opcional.', v_cat_mates, 'Importadora Once', 295000, 2, false, '["texto a grabar (grabado láser)","color"]')
  returning id into v_producto;
  insert into public.producto_costos (producto_id, precio_costo, updated_by) values (v_producto, 210000, v_usuario_id);
  update public.productos set tiene_variantes = true where id = v_producto;
  insert into public.variantes (producto_id, color, stock_minimo) values (v_producto, 'Bordo', 1), (v_producto, 'Verde salvia', 1), (v_producto, 'Negro', 1);
  insert into public.movimientos_stock (producto_id, variante_id, tipo, cantidad, motivo, usuario_id)
    select v_producto, id, 'entrada', 2, 'Carga inicial', v_usuario_id from public.variantes where producto_id = v_producto;

  -- Mochilas y billeteras
  insert into public.productos (nombre, descripcion, categoria_id, proveedor, precio_venta, stock_minimo, es_a_pedido, opciones_personalizacion)
  values ('Billetera Bara con llavero', 'Set billetera + llavero de personaje, colores surtidos.', v_cat_bolsos, 'Iconee S.A.', 135000, 2, false, '[]')
  returning id into v_producto;
  insert into public.producto_costos (producto_id, precio_costo, updated_by) values (v_producto, 88000, v_usuario_id);
  insert into public.movimientos_stock (producto_id, tipo, cantidad, motivo, usuario_id) values (v_producto, 'entrada', 8, 'Carga inicial', v_usuario_id);

  -- Llaveros
  insert into public.productos (nombre, descripcion, categoria_id, proveedor, precio_venta, stock_minimo, es_a_pedido, opciones_personalizacion)
  values ('Llavero temático (fitness, animalitos, etc.)', 'Llavero de silicona con dije temático, varios modelos.', v_cat_llaveros, 'Bazar Central', 38000, 6, false, '[]')
  returning id into v_producto;
  insert into public.producto_costos (producto_id, precio_costo, updated_by) values (v_producto, 19000, v_usuario_id);
  insert into public.movimientos_stock (producto_id, tipo, cantidad, motivo, usuario_id) values (v_producto, 'entrada', 25, 'Carga inicial', v_usuario_id);

  -- Peluches
  insert into public.productos (nombre, descripcion, categoria_id, proveedor, precio_venta, stock_minimo, es_a_pedido, opciones_personalizacion)
  values ('Peluche osito 30cm con moño personalizado', 'Osito de peluche suave, moño con nombre bordado a pedido.', v_cat_peluches, 'Bazar Central', 78000, 3, true, '["texto a grabar (bordado en el moño)"]')
  returning id into v_producto;
  insert into public.producto_costos (producto_id, precio_costo, updated_by) values (v_producto, 45000, v_usuario_id);
  insert into public.movimientos_stock (producto_id, tipo, cantidad, motivo, usuario_id) values (v_producto, 'entrada', 7, 'Carga inicial', v_usuario_id);

  -- Globos
  insert into public.productos (nombre, descripcion, categoria_id, proveedor, precio_venta, stock_minimo, es_a_pedido, dias_demora, opciones_personalizacion)
  values ('Arreglo de globos para cumpleaños (x10)', 'Arco de globos metalizados y de látex, colores a elección.', v_cat_globos, 'Fiesta Total', 85000, 1, true, 1, '["color"]')
  returning id into v_producto;
  insert into public.producto_costos (producto_id, precio_costo, updated_by) values (v_producto, 48000, v_usuario_id);
  insert into public.movimientos_stock (producto_id, tipo, cantidad, motivo, usuario_id) values (v_producto, 'entrada', 5, 'Carga inicial', v_usuario_id);

  -- Un producto con stock bajo y otro sin stock, para probar las alertas
  insert into public.productos (nombre, categoria_id, proveedor, precio_venta, stock_minimo, es_a_pedido, opciones_personalizacion)
  values ('Taza térmica de viaje personalizada', v_cat_tazas, 'Distribuidora Ho', 62000, 5, true, '["texto a grabar"]')
  returning id into v_producto;
  insert into public.producto_costos (producto_id, precio_costo, updated_by) values (v_producto, 35000, v_usuario_id);
  insert into public.movimientos_stock (producto_id, tipo, cantidad, motivo, usuario_id) values (v_producto, 'entrada', 2, 'Carga inicial', v_usuario_id);

  insert into public.productos (nombre, categoria_id, proveedor, precio_venta, stock_minimo, es_a_pedido, opciones_personalizacion)
  values ('Remera de bebé personalizada', v_cat_remeras, 'Textiles Ita', 42000, 3, true, '["texto a grabar","talle"]')
  returning id into v_producto;
  insert into public.producto_costos (producto_id, precio_costo, updated_by) values (v_producto, 24000, v_usuario_id);
  -- sin movimiento de stock a propósito: queda en 0 unidades para probar la alerta de "sin stock"

  -- Clientes de ejemplo para probar cuentas corrientes
  insert into public.clientes (nombre, telefono, notas, limite_credito) values
    ('Rosa Benítez', '+595985123456', 'Compra seguido para regalos de cumpleaños de sus nietos.', 300000),
    ('Diego Insfrán', '+595981654321', null, null);

  raise notice 'Seed cargado: % categorías, productos de ejemplo y 2 clientes.', 8;
end $$;
