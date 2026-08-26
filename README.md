# Amore Mío — Panel de gestión

Next.js (App Router) + TypeScript + Tailwind + Supabase. Los cuatro módulos
del plan (Stock → Caja → Cuentas corrientes → Vitrina) están completos.

## Puesta en marcha

### 1. Crear el proyecto en Supabase

Creá un proyecto nuevo en [supabase.com](https://supabase.com) (elegí una
región cercana, `sa-east-1` — San Pablo — es la más próxima a Paraguay).

### 2. Cargar el esquema

En el SQL Editor de Supabase (o con la CLI: `supabase db push`), corré en
este orden:

1. `supabase/migrations/00000000000000_init.sql` — todas las tablas, triggers y políticas RLS.
2. Creá el bucket de Storage **"productos"** desde el dashboard (Storage →
   New bucket → nombre `productos`, marcalo **Public**) — esto no se puede
   hacer por SQL.
3. `supabase/storage-policies.sql` — para que el personal pueda subir fotos al bucket que acabás de crear.
4. (Opcional, para probar todo sin cargar nada a mano) `supabase/seed.sql`
   — pero primero necesitás el paso 4 de abajo (crear tu usuario), porque el
   seed necesita un usuario real para firmar los movimientos de stock.

### 3. Variables de entorno

```
cp .env.local.example .env.local
```

Completá `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` con los
datos de Project Settings → API de tu proyecto de Supabase.

### 4. Crear tu usuario (la dueña)

Este panel es de uso interno — a propósito **no hay pantalla pública de
registro**. Creá el primer usuario desde Supabase: Authentication → Users →
Add user (con email y contraseña). Al iniciar sesión por primera vez en la
app, un trigger crea automáticamente su perfil en `usuarios` con rol
`vendedora`. Promovete a `admin` corriendo una vez en el SQL Editor:

```sql
update public.usuarios set rol = 'admin' where id = '<tu uuid de auth.users>';
```

(El uuid lo ves en Authentication → Users, o corriendo `select id, email from auth.users;`.)

Para las vendedoras: mismo camino (Authentication → Users → Add user) — ya
entran con rol `vendedora` por defecto, no hace falta tocar nada más.

### 5. Correr en desarrollo

```
npm install
npm run dev
```

La raíz (`/`) es la vitrina pública — no necesita sesión. El panel de
gestión vive en `/login` → `/panel/*`.

## Qué hay hecho (Stock)

- ABM de productos: nombre, categoría, proveedor, precio de venta, precio de
  costo (**solo lo ve `admin`** — vive en una tabla separada con su propia
  RLS, no es una columna escondida en el frontend), stock mínimo, a pedido,
  opciones de personalización, visibilidad en vitrina.
- Variantes (talle/color/modelo) con stock independiente.
- Fotos: subida con compresión y thumbnail generados en el navegador antes
  de subir a Storage.
- Código interno automático (`AM-0001`, `AM-0001-A` para variantes) +
  código de barras Code128 en una vista imprimible (`/panel/stock/[id]/etiqueta`).
- Movimientos de stock (entrada/salida/ajuste/devolución) con historial
  auditable — el número de stock nunca se edita directo, es siempre la suma
  de estos movimientos (lo aplica un trigger en la base).
- Carga masiva por CSV para la migración inicial desde la planilla actual.
- Reportes de valorización de inventario y margen por producto, solo para
  `admin` (`/panel/reportes`).

## Qué hay hecho (Caja)

- Apertura y cierre de turno (`/panel/caja`, `/panel/caja/cierre`), con
  esperado-vs-contado y diferencia calculada.
- Tres vías para cargar un producto al carrito: lector físico HID (input
  siempre enfocado), cámara (`@zxing/browser`) y búsqueda manual por
  nombre/código.
- Carrito con cantidad, override de precio (**solo `admin`**, misma frontera
  que costos/márgenes) y descuento global.
- Cobro en efectivo (con vuelto), transferencia, QR o fiado (con selector de
  cliente que permite crear uno nuevo al vuelo).
- **Cola offline**: toda venta se intenta confirmar contra Supabase y, si
  falla por conectividad, se guarda en IndexedDB y se reintenta sola cuando
  vuelve la señal (idempotente por `client_uuid` — nunca duplica). Indicador
  de sincronización siempre visible.
- Ticket ESC/POS crudo (58mm, CP850 para tildes/ñ) por Web Bluetooth o RawBT
  — configurable en `/panel/caja/configuracion`, con prueba de impresión.
  **La nota pendiente del plan de diseño sigue en pie**: los UUID de
  servicio/característica BLE de `src/lib/ticket/imprimir.ts` son los más
  comunes entre clones ESC/POS de 58mm, no confirmados contra el Dronic
  P503A físico — si no imprime por Web Bluetooth, la ruta RawBT es el plan B
  ya armado.
- Historial de ventas por día (`/panel/caja/ventas`), reimpresión de
  cualquier ticket, y anulación (**solo `admin`**, restaura stock y revierte
  deuda si era fiado).
- PWA instalable: manifest + service worker (cache de assets estáticos y
  última página conocida como respaldo — la resiliencia offline real de las
  ventas vive en IndexedDB, no en el service worker).

## Qué hay hecho (Cuentas corrientes)

- Listado de clientes ordenado por saldo (`/panel/cuentas`), con búsqueda por
  nombre/teléfono.
- Estado de cuenta por cliente: historial completo de deuda/pago
  (`cuenta_movimientos`), registro de pago parcial (RPC
  `registrar_pago_cuenta` — no acepta `forma_pago='fiado'`, no tendría
  sentido), y recordatorio de saldo por WhatsApp con mensaje prellenado.
- Los clientes se crean solo desde la Caja al elegir "Fiado" en una venta —
  no hay un alta de cliente aparte, tal como pide el brief.

## Qué hay hecho (Vitrina pública)

- Home con hero (foto real de un producto de fondo si hay alguno cargado,
  sin degradé decorativo) y catálogo destacado; `/catalogo` con filtro por
  categoría (chips horizontales) y paginación "Ver más"; `/producto/[id]`
  con galería, personalización disponible, selector de variante y un único
  botón "Consultar por WhatsApp" con mensaje prellenado (producto + código +
  variante elegida).
- Sin checkout, sin precio de costo, sin nada que la identifique como
  comprobante fiscal — es 100% vidriera, tal como pide el brief.
- El signature (trazo suelto, plan de diseño sección 6) marca "a pedido" en
  la foto en vez de un badge de texto genérico.
- SEO: metadata + Open Graph por producto, `sitemap.xml` dinámico (incluye
  cada producto visible) y `robots.txt` que bloquea `/panel`.
- RLS: se agregó una policy (`config_select_publico`) para que la vitrina
  pueda leer el número de WhatsApp del local desde `configuracion` sin
  sesión — es el único valor de esa tabla abierto a `anon`, el resto sigue
  siendo solo para el personal logueado.

## Deploy

Este proyecto se despliega en Vercel (con las mismas variables de entorno de
`.env.local` cargadas ahí, más `NEXT_PUBLIC_SITE_URL` con el dominio final)
y la base ya vive en Supabase Cloud — no hace falta un paso de "deploy"
aparte para la base, solo tener las migraciones aplicadas al proyecto de
producción.
