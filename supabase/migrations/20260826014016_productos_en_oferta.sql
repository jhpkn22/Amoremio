-- Agrega el campo en_oferta a productos, para la sección "Ofertas" de la vitrina.
alter table public.productos
  add column if not exists en_oferta boolean not null default false;

create index if not exists idx_productos_en_oferta
  on public.productos (en_oferta)
  where en_oferta = true;
