-- ============================================================
-- SIGR - Sistema Integral de Gestión de Restaurantes
-- Esquema de Base de Datos PostgreSQL para Supabase
-- Ejecuta este archivo en: Supabase Dashboard -> SQL Editor
-- ============================================================

-- 1. Usuarios administrativos y autenticación
-- La contraseña se guarda únicamente como hash bcrypt; nunca en texto plano.
CREATE TABLE IF NOT EXISTS public.usuarios (
  id BIGSERIAL PRIMARY KEY,
  usuario VARCHAR(30) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  nombre VARCHAR(150) NOT NULL DEFAULT 'Administrador',
  rol VARCHAR(30) NOT NULL DEFAULT 'administrador',
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  debe_cambiar_password BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_usuario_lower
  ON public.usuarios (LOWER(usuario));

-- Solo el backend con service_role puede leer o modificar las credenciales.
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

-- 2. Configuración del Restaurante (para encabezado de factura POS)
CREATE TABLE IF NOT EXISTS public.configuracion_restaurante (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  nombre VARCHAR(150) NOT NULL DEFAULT 'SIGR Restaurante',
  nit VARCHAR(50) DEFAULT '900.123.456-7',
  direccion TEXT DEFAULT 'Calle Principal #123, Ciudad',
  telefono VARCHAR(50) DEFAULT '+57 300 000 0000',
  impuesto_porcentaje NUMERIC(5, 2) NOT NULL DEFAULT 8,
  moneda VARCHAR(10) NOT NULL DEFAULT 'COP',
  prefijo_factura VARCHAR(15) NOT NULL DEFAULT 'POS',
  mensaje_factura TEXT DEFAULT '¡Gracias por su visita! Vuelva pronto.',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.configuracion_restaurante (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- 2. Categorías de Productos
CREATE TABLE IF NOT EXISTS public.categorias (
  id BIGSERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE,
  descripcion TEXT DEFAULT '',
  color VARCHAR(20) NOT NULL DEFAULT '#e85d04',
  icono VARCHAR(50) NOT NULL DEFAULT 'bi-tag',
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Productos (con soporte para imagen en Supabase Storage)
CREATE TABLE IF NOT EXISTS public.productos (
  id BIGSERIAL PRIMARY KEY,
  codigo VARCHAR(50) UNIQUE,
  nombre VARCHAR(150) NOT NULL,
  descripcion TEXT DEFAULT '',
  categoria_id BIGINT REFERENCES public.categorias(id) ON DELETE SET NULL,
  precio NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (precio >= 0),
  costo NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (costo >= 0),
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  imagen_url TEXT DEFAULT '',
  imagen_path TEXT DEFAULT '',
  disponible BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Clientes
CREATE TABLE IF NOT EXISTS public.clientes (
  id BIGSERIAL PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  documento VARCHAR(50) DEFAULT '',
  telefono VARCHAR(50) DEFAULT '',
  email VARCHAR(150) DEFAULT '',
  direccion TEXT DEFAULT '',
  notas TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Ventas / Facturas POS
CREATE TABLE IF NOT EXISTS public.ventas (
  id BIGSERIAL PRIMARY KEY,
  numero_factura VARCHAR(30) NOT NULL UNIQUE,
  cliente_id BIGINT REFERENCES public.clientes(id) ON DELETE SET NULL,
  cliente_nombre VARCHAR(150) NOT NULL DEFAULT 'Consumidor Final',
  tipo_servicio VARCHAR(30) NOT NULL DEFAULT 'mesa', -- mesa, llevar, domicilio
  mesa VARCHAR(30) DEFAULT '',
  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
  descuento NUMERIC(12, 2) NOT NULL DEFAULT 0,
  impuesto_porcentaje NUMERIC(5, 2) NOT NULL DEFAULT 0,
  impuesto NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total NUMERIC(12, 2) NOT NULL DEFAULT 0,
  metodo_pago VARCHAR(30) NOT NULL DEFAULT 'efectivo', -- efectivo, tarjeta, transferencia, mixto
  monto_recibido NUMERIC(12, 2) NOT NULL DEFAULT 0,
  cambio NUMERIC(12, 2) NOT NULL DEFAULT 0,
  estado VARCHAR(20) NOT NULL DEFAULT 'pagada' CHECK (estado IN ('pagada', 'anulada')),
  notas TEXT DEFAULT '',
  fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Detalle de Ventas (ítems por factura POS)
CREATE TABLE IF NOT EXISTS public.venta_detalles (
  id BIGSERIAL PRIMARY KEY,
  venta_id BIGINT NOT NULL REFERENCES public.ventas(id) ON DELETE CASCADE,
  producto_id BIGINT REFERENCES public.productos(id) ON DELETE SET NULL,
  producto_nombre VARCHAR(150) NOT NULL,
  categoria_nombre VARCHAR(100) NOT NULL DEFAULT 'Sin categoría',
  cantidad INTEGER NOT NULL CHECK (cantidad > 0),
  precio_unitario NUMERIC(12, 2) NOT NULL DEFAULT 0,
  costo_unitario NUMERIC(12, 2) NOT NULL DEFAULT 0,
  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0
);

-- 7. Movimientos Contables (Ingresos y Egresos)
CREATE TABLE IF NOT EXISTS public.movimientos_contables (
  id BIGSERIAL PRIMARY KEY,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('ingreso', 'egreso')),
  categoria VARCHAR(80) NOT NULL DEFAULT 'General',
  concepto VARCHAR(255) NOT NULL,
  monto NUMERIC(12, 2) NOT NULL CHECK (monto >= 0),
  metodo_pago VARCHAR(30) NOT NULL DEFAULT 'efectivo',
  referencia VARCHAR(100) DEFAULT '',
  venta_id BIGINT REFERENCES public.ventas(id) ON DELETE SET NULL,
  fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notas TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para consultas rápidas y reportes
CREATE INDEX IF NOT EXISTS idx_productos_categoria ON public.productos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_productos_disponible ON public.productos(disponible);
CREATE INDEX IF NOT EXISTS idx_ventas_fecha ON public.ventas(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_ventas_estado ON public.ventas(estado);
CREATE INDEX IF NOT EXISTS idx_ventas_cliente ON public.ventas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_venta_detalles_venta ON public.venta_detalles(venta_id);
CREATE INDEX IF NOT EXISTS idx_venta_detalles_producto ON public.venta_detalles(producto_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_fecha ON public.movimientos_contables(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_movimientos_tipo ON public.movimientos_contables(tipo);
CREATE INDEX IF NOT EXISTS idx_movimientos_venta ON public.movimientos_contables(venta_id);

-- ============================================================
-- Supabase Storage: Bucket público para imágenes de productos
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'productos-imagenes',
  'productos-imagenes',
  TRUE,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Política para lectura pública de imágenes de productos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'SIGR Public Read Productos Imagenes'
  ) THEN
    CREATE POLICY "SIGR Public Read Productos Imagenes"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'productos-imagenes');
  END IF;
END $$;


-- 8. Seguridad: RLS para bloquear acceso anónimo directo.
-- El backend usa service_role, que omite RLS; nunca exponer esa clave en el navegador.
ALTER TABLE public.configuracion_restaurante ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venta_detalles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimientos_contables ENABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA public TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Actualizar inmediatamente la caché de PostgREST después de crear el esquema.
NOTIFY pgrst, 'reload schema';
