# SIGR — Sistema Integral de Gestión de Restaurantes

Aplicación web full-stack para restaurantes construida con **Node.js**, **Express**, **JavaScript**, **Bootstrap 5**, **Supabase (PostgreSQL + Storage)** y **Vercel**. Incluye autenticación administrativa y un pipeline CI/CD con GitHub Actions.

**Repositorio:** https://github.com/einerp/SIGR-ACTUALIZADO

## Módulos incluidos

- **Acceso seguro:** usuario y contraseña, hash bcrypt, sesión firmada en cookie HttpOnly, límite de intentos, cierre de sesión y cambio de credenciales desde Configuración.
- **Dashboard:** indicadores diarios y mensuales, ventas de los últimos 7 días, productos destacados, facturas recientes y alertas de inventario.
- **Categorías y productos:** CRUD, imágenes en Supabase Storage, SKU, costos, márgenes, stock y disponibilidad.
- **Ventas POS:** carrito, clientes, tipos de servicio, descuentos, impuestos, cambio, ticket imprimible, inventario y asiento contable automáticos.
- **Historial de facturas:** filtros, reimpresión y anulación con reverso de stock y contabilidad.
- **Clientes, contabilidad y reportes:** CRM, ingresos/egresos, utilidad, gráficas, CSV e impresión/PDF.
- **Configuración:** datos del restaurante y actualización de las credenciales de acceso.

## Instalación local

Requisitos: Node.js 20 o superior y npm.

```bash
npm ci
cp .env.example .env
npm run dev
```

Abre `http://localhost:3000`.

En el modo demo local, el primer acceso usa:

- **Usuario:** `admin`
- **Contraseña:** `Admin123*`

Cambia estos valores en **Configuración → Seguridad de la cuenta**. El archivo `data/demo-auth.json` conserva el hash de la contraseña local y está excluido de Git.

## Variables de entorno

| Variable | Uso |
| --- | --- |
| `SESSION_SECRET` | Firma de sesiones; aleatorio y de mínimo 32 caracteres en producción. |
| `ADMIN_USERNAME` | Usuario para crear el primer administrador, solo si la tabla está vacía. |
| `ADMIN_PASSWORD` | Contraseña inicial obligatoria en producción si no existe ningún usuario. |
| `SUPABASE_URL` | URL del proyecto Supabase. |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave privada del backend; nunca se envía al navegador ni se sube a Git. |
| `SUPABASE_ANON_KEY` | Alternativa de desarrollo; se recomienda `service_role` en el servidor. |
| `SUPABASE_STORAGE_BUCKET` | Bucket de imágenes; valor `productos-imagenes`. |
| `PORT` | Puerto local; valor predeterminado `3000`. |

## Supabase

1. Abre el proyecto en Supabase y entra a **SQL Editor**.
2. Ejecuta `supabase/schema.sql`. Crea las tablas operativas, la tabla protegida `usuarios`, índices y el bucket `productos-imagenes`.
3. Opcionalmente ejecuta `supabase/seed.sql` para datos de ejemplo.
4. Configura las variables en `.env` o en Vercel. La tabla `usuarios` tiene RLS habilitado y solo el backend con `service_role` administra las credenciales.

## Validaciones y pipeline

```bash
npm run lint     # Análisis estático con ESLint
npm test         # Pruebas unitarias e integración con cobertura
npm run build    # Artefacto reproducible en dist/
npm run check    # Todas las validaciones anteriores
npm audit        # Seguridad de dependencias
```

El workflow `.github/workflows/ci-cd.yml` ejecuta **build → lint → pruebas → seguridad → artefacto → confirmación de deploy → smoke test**. Un fallo de calidad impide continuar y un despliegue fallido hace fallar el pipeline.

Vercel está conectado al repositorio mediante su integración nativa de GitHub y despliega `main` automáticamente. GitHub Actions espera el estado de éxito del despliegue asociado al mismo commit usando `GITHUB_TOKEN`; no requiere `VERCEL_TOKEN` ni IDs almacenados como secretos.

Las variables `SUPABASE_*`, `SESSION_SECRET`, `ADMIN_USERNAME` y `ADMIN_PASSWORD` se configuran en el proyecto de Vercel. No uses secretos en el código.

La documentación técnica, el diagrama, la simulación de fallos y la estrategia de escalamiento están en [`docs/PIPELINE.md`](docs/PIPELINE.md). Las evidencias están en `docs/evidencias/`.

## Despliegue en Vercel

El archivo `vercel.json` dirige `/api/*` a la función `api/index.js`; Vercel sirve el frontend desde `public/`.

```bash
npx vercel link
npx vercel --prod
node scripts/smoke-test.js https://TU-DOMINIO.vercel.app
```

La prueba de humo verifica la página de acceso, el endpoint público `/api/health` y que `/api/dashboard` rechace solicitudes sin sesión.

## Estructura

```text
├── .github/workflows/ci-cd.yml  # Pipeline CI/CD
├── api/index.js                 # Entrada serverless
├── docs/                        # Diseño, manual y evidencias
├── public/                      # SPA, estilos y cliente HTTP
├── scripts/                     # Build y smoke test
├── src/
│   ├── repositories/            # Supabase, demo y usuarios
│   ├── routes/                  # API REST y autenticación
│   ├── services/                # Sesiones y almacenamiento
│   └── app.js                   # Express y middleware de seguridad
├── supabase/                    # Esquema y datos semilla
├── tests/                       # Pruebas automatizadas
├── .env.example                 # Plantilla sin secretos
├── CHANGELOG.md
└── LICENSE
```

## Buenas prácticas de colaboración

- Crea ramas temáticas desde `main` y abre Pull Requests.
- No confirmes `.env`, datos locales, tokens ni contraseñas.
- Ejecuta `npm run check` antes de cada Pull Request.
- Usa commits descriptivos y revisa los resultados de GitHub Actions.
- Los despliegues a producción solo se originan en `main` después de superar calidad y pruebas.
