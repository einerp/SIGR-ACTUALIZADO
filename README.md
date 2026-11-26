# SIGR — Sistema Integral de Gestión de Restaurantes

**SIGR** es una aplicación web full-stack para restaurantes construida con **Node.js**, **Express**, **JavaScript**, **Bootstrap 5**, **Supabase (PostgreSQL + Storage)** y lista para desplegar en **Vercel**.

## Módulos Incluidos

- **Dashboard**: KPIs diarios y mensuales, gráfica de ventas de los últimos 7 días, top productos, últimas facturas POS y alertas de stock bajo.
- **Categorías**: CRUD completo con color distintivo, ícono, estado activo/inactivo y conteo de productos.
- **Productos con Imágenes**: CRUD completo con SKU, precio, costo unitario, margen, stock y **carga de imagen por producto** (almacenada en **Supabase Storage** bucket `productos-imagenes`, con vista previa inmediata y soporte también para URL externa).
- **Ventas y Facturación tipo POS**: Punto de venta visual con tarjetas de productos con foto, filtro por categorías, carrito interactivo, selección/creación rápida de cliente, tipo de servicio (Mesa / Para llevar / Domicilio), descuento, impuesto configurable, cálculo automático de cambio/vuelto, **ticket térmico POS 80mm imprimible**, descuento automático de inventario y **asiento automático en Contabilidad**.
- **Historial de Facturas**: Búsqueda, filtros por fecha/estado, reimpresión de tirilla POS y anulación de facturas con reverso automático de stock y contabilidad.
- **Clientes**: Directorio CRM con historial de compras y total gastado.
- **Contabilidad**: Control de ingresos y egresos, integración automática con ventas POS, registro de gastos operativos (proveedores, nómina, arriendo, servicios, insumos), balance neto y utilidad bruta.
- **Reportes de Ventas**: Filtros por rango de fechas, gráficas interactivas (ventas por día, por categoría y por método de pago), Top 10 productos más vendidos, **exportación a CSV (Excel)** e **impresión / PDF**.
- **Configuración**: Personalización del nombre del restaurante, NIT/RUT, dirección, teléfono, impuesto por defecto, moneda y prefijo de factura POS.

---

## Instalación Local

```bash
npm install
cp .env.example .env
npm run dev
```

Abre en tu navegador: `http://localhost:3000`

> **Nota:** Si todavía no configuras tus credenciales de Supabase en `.env`, SIGR arrancará automáticamente en **Modo Demo Local** con datos de prueba para que puedas explorar y probar todo el sistema de inmediato.

---

## Configuración de Supabase

1. Crea un proyecto gratuito en [supabase.com](https://supabase.com).
2. Ve a **SQL Editor** y ejecuta el contenido completo de [`supabase/schema.sql`](supabase/schema.sql).
   - Esto crea las 7 tablas (`configuracion_restaurante`, `categorias`, `productos`, `clientes`, `ventas`, `venta_detalles`, `movimientos_contables`), los índices y el bucket público de Storage `productos-imagenes`.
3. *(Opcional)* Ejecuta [`supabase/seed.sql`](supabase/seed.sql) para cargar categorías, platos y clientes iniciales.
4. Ve a **Project Settings → API** y copia:
   - `Project URL` → `SUPABASE_URL`
   - `anon public` → `SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY`
5. Pega esos valores en tu archivo `.env` local (o en las variables de entorno de Vercel).

---

## Despliegue en Vercel

El proyecto ya incluye [`vercel.json`](vercel.json) y la función serverless [`api/index.js`](api/index.js).

1. Sube este proyecto a un repositorio en **GitHub**.
2. En [vercel.com](https://vercel.com), haz clic en **Add New → Project** e importa el repositorio.
3. En **Environment Variables**, agrega:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_STORAGE_BUCKET` = `productos-imagenes`
4. Haz clic en **Deploy**. Vercel servirá automáticamente el frontend en `public/` y la API Express en `/api/*`.

---

## Estructura del Proyecto

```text
├── api/
│   └── index.js                 # Entrada serverless para Vercel
├── public/
│   ├── css/styles.css           # Estilos Bootstrap 5 + impresión POS 80mm
│   ├── js/api.js                # Cliente HTTP para la API REST
│   ├── js/app.js                # Lógica SPA, POS, gráficas y modales
│   └── index.html               # Interfaz principal de SIGR
├── src/
│   ├── config/supabase.js       # Cliente Supabase y validación de entorno
│   ├── repositories/
│   │   ├── dataStore.js         # Selector automático Supabase / Demo
│   │   ├── supabaseAdapter.js   # Persistencia PostgreSQL en Supabase
│   │   └── demoAdapter.js       # Persistencia local de demostración
│   ├── routes/                  # Endpoints REST por módulo
│   ├── services/storageService.js # Subida/borrado de imágenes en Supabase Storage
│   └── app.js                   # Aplicación Express
├── supabase/
│   ├── schema.sql               # Esquema SQL + Bucket Storage
│   └── seed.sql                 # Datos semilla opcionales
├── server.js                    # Arranque local de Node.js
├── vercel.json                  # Configuración de rutas para Vercel
├── .env.example                 # Plantilla de variables de entorno
└── package.json
```
