-- ============================================================
-- SIGR - Datos iniciales de demostración (Opcional)
-- Ejecuta después de schema.sql si deseas probar con datos base
-- ============================================================

INSERT INTO public.categorias (nombre, descripcion, color, icono) VALUES
  ('Entradas', 'Aperitivos y entradas para compartir', '#f59e0b', 'bi-egg-fried'),
  ('Platos Fuertes', 'Platos principales de la casa', '#dc2626', 'bi-fire'),
  ('Hamburguesas', 'Hamburguesas artesanales a la parrilla', '#ea580c', 'bi-shop'),
  ('Bebidas', 'Jugos naturales, gaseosas y cócteles', '#0284c7', 'bi-cup-straw'),
  ('Postres', 'Dulces y postres artesanales', '#9333ea', 'bi-cake2')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO public.productos (codigo, nombre, descripcion, categoria_id, precio, costo, stock, disponible)
SELECT 'ENT-001', 'Patacones con Hogao', 'Crujientes patacones acompañados de hogao tradicional y guacamole', id, 14000, 5000, 45, TRUE
FROM public.categorias WHERE nombre = 'Entradas'
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO public.productos (codigo, nombre, descripcion, categoria_id, precio, costo, stock, disponible)
SELECT 'PLT-001', 'Churrasco a la Parrilla', 'Corte de res 300g con papas rústicas y ensalada fresca', id, 38000, 16500, 30, TRUE
FROM public.categorias WHERE nombre = 'Platos Fuertes'
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO public.productos (codigo, nombre, descripcion, categoria_id, precio, costo, stock, disponible)
SELECT 'PLT-002', 'Salmón en Salsa de Maracuyá', 'Filete de salmón sellado con arroz cremoso y vegetales salteados', id, 42000, 19000, 22, TRUE
FROM public.categorias WHERE nombre = 'Platos Fuertes'
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO public.productos (codigo, nombre, descripcion, categoria_id, precio, costo, stock, disponible)
SELECT 'HAM-001', 'Hamburguesa SIGR Doble', 'Doble carne angus, queso cheddar, tocineta ahumada y papas a la francesa', id, 28000, 11500, 40, TRUE
FROM public.categorias WHERE nombre = 'Hamburguesas'
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO public.productos (codigo, nombre, descripcion, categoria_id, precio, costo, stock, disponible)
SELECT 'BEB-001', 'Limonada de Coco', 'Refrescante limonada natural cremosa con coco', id, 9500, 2800, 80, TRUE
FROM public.categorias WHERE nombre = 'Bebidas'
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO public.productos (codigo, nombre, descripcion, categoria_id, precio, costo, stock, disponible)
SELECT 'POS-001', 'Cheesecake de Frutos Rojos', 'Porción de cheesecake horneado con coulis de frutos rojos', id, 13500, 4500, 25, TRUE
FROM public.categorias WHERE nombre = 'Postres'
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO public.clientes (nombre, documento, telefono, email, direccion) VALUES
  ('Consumidor Final', '222222222222', '', '', 'Mostrador'),
  ('María Fernanda Gómez', '1020456789', '3104567890', 'maria.gomez@correo.com', 'Cra 15 #45-20'),
  ('Carlos Andrés Ramírez', '79854123', '3157891234', 'carlos.ramirez@correo.com', 'Calle 80 #12-34')
ON CONFLICT DO NOTHING;
