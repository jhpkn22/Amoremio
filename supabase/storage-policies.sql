-- =====================================================================
-- Políticas de Storage para el bucket "productos".
--
-- El bucket en sí NO se crea con SQL — se crea desde el dashboard de
-- Supabase (Storage → New bucket → nombre "productos", marcarlo
-- Public) o con la CLI (`supabase storage buckets create productos
-- --public`). Una vez que existe, corré este archivo para que el
-- personal pueda subir fotos y cualquiera pueda verlas en la vitrina.
--
-- Al ser un bucket público, la lectura ya funciona sola (no hace
-- falta policy de SELECT); lo que hay que restringir es quién puede
-- escribir.
-- =====================================================================

create policy "productos_fotos_subir"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'productos' and public.es_staff_activo()
);

create policy "productos_fotos_actualizar"
on storage.objects for update to authenticated
using (bucket_id = 'productos' and public.es_staff_activo())
with check (bucket_id = 'productos' and public.es_staff_activo());

create policy "productos_fotos_borrar"
on storage.objects for delete to authenticated
using (bucket_id = 'productos' and public.es_staff_activo());
