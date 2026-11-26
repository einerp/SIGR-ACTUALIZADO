const fs = require('fs');
const path = require('path');

function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function makeFoodSvg(emoji, bg1, bg2, label) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${bg1}"/>
        <stop offset="100%" stop-color="${bg2}"/>
      </linearGradient>
    </defs>
    <rect width="400" height="300" fill="url(#g)"/>
    <circle cx="200" cy="130" r="68" fill="rgba(255,255,255,0.2)"/>
    <text x="200" y="152" font-size="68" text-anchor="middle">${emoji}</text>
    <text x="200" y="245" font-family="Segoe UI, Arial, sans-serif" font-size="22" font-weight="700" fill="#ffffff" text-anchor="middle">${label}</text>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function daysAgoIso(days, hour = 13, minute = 15) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function createInitialData() {
  const now = new Date().toISOString();
  return {
    counters: {
      categorias: 5,
      productos: 8,
      clientes: 4,
      ventas: 5,
      venta_detalles: 10,
      movimientos_contables: 8
    },
    configuracion_restaurante: {
      id: 1,
      nombre: process.env.RESTAURANT_NAME || 'SIGR Restaurante',
      nit: process.env.RESTAURANT_NIT || '900.123.456-7',
      direccion: process.env.RESTAURANT_ADDRESS || 'Calle Principal #123, Ciudad',
      telefono: process.env.RESTAURANT_PHONE || '+57 300 000 0000',
      impuesto_porcentaje: toNumber(process.env.DEFAULT_TAX_RATE, 8),
      moneda: process.env.RESTAURANT_CURRENCY || 'COP',
      prefijo_factura: 'POS',
      mensaje_factura: '¡Gracias por su visita! Vuelva pronto.',
      updated_at: now
    },
    categorias: [
      { id: 1, nombre: 'Entradas', descripcion: 'Aperitivos y entradas para compartir', color: '#f59e0b', icono: 'bi-egg-fried', activo: true, created_at: now, updated_at: now },
      { id: 2, nombre: 'Platos Fuertes', descripcion: 'Especialidades principales de la casa', color: '#dc2626', icono: 'bi-fire', activo: true, created_at: now, updated_at: now },
      { id: 3, nombre: 'Hamburguesas', descripcion: 'Hamburguesas artesanales a la parrilla', color: '#ea580c', icono: 'bi-shop', activo: true, created_at: now, updated_at: now },
      { id: 4, nombre: 'Bebidas', descripcion: 'Jugos naturales, limonadas y bebidas frías', color: '#0284c7', icono: 'bi-cup-straw', activo: true, created_at: now, updated_at: now },
      { id: 5, nombre: 'Postres', descripcion: 'Repostería artesanal del día', color: '#9333ea', icono: 'bi-cake2', activo: true, created_at: now, updated_at: now }
    ],
    productos: [
      {
        id: 1,
        codigo: 'ENT-001',
        nombre: 'Patacones con Hogao',
        descripcion: 'Crujientes patacones artesanales con hogao tradicional y guacamole fresco',
        categoria_id: 1,
        precio: 14000,
        costo: 5000,
        stock: 42,
        imagen_url: makeFoodSvg('🥑', '#d97706', '#f59e0b', 'Patacones con Hogao'),
        imagen_path: '',
        disponible: true,
        created_at: now,
        updated_at: now
      },
      {
        id: 2,
        codigo: 'ENT-002',
        nombre: 'Aros de Calamar',
        descripcion: 'Calamares apanados crocantes con salsa tártara de la casa',
        categoria_id: 1,
        precio: 22000,
        costo: 9500,
        stock: 18,
        imagen_url: makeFoodSvg('🍤', '#b45309', '#f59e0b', 'Aros de Calamar'),
        imagen_path: '',
        disponible: true,
        created_at: now,
        updated_at: now
      },
      {
        id: 3,
        codigo: 'PLT-001',
        nombre: 'Churrasco a la Parrilla',
        descripcion: 'Corte de res 300g a las brasas con papas rústicas y ensalada',
        categoria_id: 2,
        precio: 38000,
        costo: 16500,
        stock: 28,
        imagen_url: makeFoodSvg('🥩', '#991b1b', '#dc2626', 'Churrasco Parrilla'),
        imagen_path: '',
        disponible: true,
        created_at: now,
        updated_at: now
      },
      {
        id: 4,
        codigo: 'PLT-002',
        nombre: 'Salmón en Salsa Maracuyá',
        descripcion: 'Filete de salmón sellado con arroz cremoso y vegetales salteados',
        categoria_id: 2,
        precio: 42000,
        costo: 19000,
        stock: 15,
        imagen_url: makeFoodSvg('🐟', '#be123c', '#f43f5e', 'Salmón Maracuyá'),
        imagen_path: '',
        disponible: true,
        created_at: now,
        updated_at: now
      },
      {
        id: 5,
        codigo: 'HAM-001',
        nombre: 'Hamburguesa SIGR Doble',
        descripcion: 'Doble carne angus, cheddar fundido, tocineta ahumada y papas',
        categoria_id: 3,
        precio: 28000,
        costo: 11500,
        stock: 35,
        imagen_url: makeFoodSvg('🍔', '#c2410c', '#ea580c', 'Hamburguesa SIGR'),
        imagen_path: '',
        disponible: true,
        created_at: now,
        updated_at: now
      },
      {
        id: 6,
        codigo: 'BEB-001',
        nombre: 'Limonada de Coco',
        descripcion: 'Refrescante limonada natural cremosa con crema de coco',
        categoria_id: 4,
        precio: 9500,
        costo: 2800,
        stock: 75,
        imagen_url: makeFoodSvg('🥥', '#0369a1', '#0ea5e9', 'Limonada de Coco'),
        imagen_path: '',
        disponible: true,
        created_at: now,
        updated_at: now
      },
      {
        id: 7,
        codigo: 'BEB-002',
        nombre: 'Jugo Natural de Mango',
        descripcion: 'Jugo 100% fruta fresca preparado al momento en agua o leche',
        categoria_id: 4,
        precio: 8000,
        costo: 2200,
        stock: 60,
        imagen_url: makeFoodSvg('🥭', '#0284c7', '#38bdf8', 'Jugo de Mango'),
        imagen_path: '',
        disponible: true,
        created_at: now,
        updated_at: now
      },
      {
        id: 8,
        codigo: 'POS-001',
        nombre: 'Cheesecake Frutos Rojos',
        descripcion: 'Cheesecake artesanal horneado con reducción de frutos rojos',
        categoria_id: 5,
        precio: 13500,
        costo: 4500,
        stock: 4,
        imagen_url: makeFoodSvg('🍰', '#7e22ce', '#a855f7', 'Cheesecake'),
        imagen_path: '',
        disponible: true,
        created_at: now,
        updated_at: now
      }
    ],
    clientes: [
      { id: 1, nombre: 'Consumidor Final', documento: '222222222222', telefono: '', email: '', direccion: 'Mostrador', notas: 'Cliente genérico POS', created_at: now, updated_at: now },
      { id: 2, nombre: 'María Fernanda Gómez', documento: '1020456789', telefono: '3104567890', email: 'maria.gomez@correo.com', direccion: 'Cra 15 #45-20', notas: 'Cliente frecuente', created_at: now, updated_at: now },
      { id: 3, nombre: 'Carlos Andrés Ramírez', documento: '79854123', telefono: '3157891234', email: 'carlos.ramirez@correo.com', direccion: 'Calle 80 #12-34', notas: 'Prefiere domicilio', created_at: now, updated_at: now },
      { id: 4, nombre: 'Laura Juliana Torres', documento: '1018445210', telefono: '3209988776', email: 'laura.torres@empresa.co', direccion: 'Av 19 #104-15', notas: 'Almuerzos corporativos', created_at: now, updated_at: now }
    ],
    ventas: [
      {
        id: 1, numero_factura: 'POS-000001', cliente_id: 2, cliente_nombre: 'María Fernanda Gómez',
        tipo_servicio: 'mesa', mesa: 'Mesa 4', subtotal: 85500, descuento: 0, impuesto_porcentaje: 8,
        impuesto: 6840, total: 92340, metodo_pago: 'tarjeta', monto_recibido: 92340, cambio: 0,
        estado: 'pagada', notas: '', fecha: daysAgoIso(3, 13, 20), created_at: daysAgoIso(3, 13, 20)
      },
      {
        id: 2, numero_factura: 'POS-000002', cliente_id: 3, cliente_nombre: 'Carlos Andrés Ramírez',
        tipo_servicio: 'domicilio', mesa: '', subtotal: 65500, descuento: 0, impuesto_porcentaje: 8,
        impuesto: 5240, total: 70740, metodo_pago: 'transferencia', monto_recibido: 70740, cambio: 0,
        estado: 'pagada', notas: 'Sin cebolla', fecha: daysAgoIso(2, 19, 45), created_at: daysAgoIso(2, 19, 45)
      },
      {
        id: 3, numero_factura: 'POS-000003', cliente_id: 4, cliente_nombre: 'Laura Juliana Torres',
        tipo_servicio: 'mesa', mesa: 'Mesa 2', subtotal: 109000, descuento: 5000, impuesto_porcentaje: 8,
        impuesto: 8320, total: 112320, metodo_pago: 'tarjeta', monto_recibido: 112320, cambio: 0,
        estado: 'pagada', notas: '', fecha: daysAgoIso(1, 14, 10), created_at: daysAgoIso(1, 14, 10)
      },
      {
        id: 4, numero_factura: 'POS-000004', cliente_id: 1, cliente_nombre: 'Consumidor Final',
        tipo_servicio: 'llevar', mesa: '', subtotal: 37500, descuento: 0, impuesto_porcentaje: 8,
        impuesto: 3000, total: 40500, metodo_pago: 'efectivo', monto_recibido: 50000, cambio: 9500,
        estado: 'pagada', notas: '', fecha: daysAgoIso(0, 11, 30), created_at: daysAgoIso(0, 11, 30)
      },
      {
        id: 5, numero_factura: 'POS-000005', cliente_id: 2, cliente_nombre: 'María Fernanda Gómez',
        tipo_servicio: 'mesa', mesa: 'Mesa 7', subtotal: 69500, descuento: 0, impuesto_porcentaje: 8,
        impuesto: 5560, total: 75060, metodo_pago: 'efectivo', monto_recibido: 80000, cambio: 4940,
        estado: 'pagada', notas: '', fecha: daysAgoIso(0, 12, 40), created_at: daysAgoIso(0, 12, 40)
      }
    ],
    venta_detalles: [
      { id: 1, venta_id: 1, producto_id: 3, producto_nombre: 'Churrasco a la Parrilla', categoria_nombre: 'Platos Fuertes', cantidad: 2, precio_unitario: 38000, costo_unitario: 16500, subtotal: 76000 },
      { id: 2, venta_id: 1, producto_id: 6, producto_nombre: 'Limonada de Coco', categoria_nombre: 'Bebidas', cantidad: 1, precio_unitario: 9500, costo_unitario: 2800, subtotal: 9500 },
      { id: 3, venta_id: 2, producto_id: 5, producto_nombre: 'Hamburguesa SIGR Doble', categoria_nombre: 'Hamburguesas', cantidad: 2, precio_unitario: 28000, costo_unitario: 11500, subtotal: 56000 },
      { id: 4, venta_id: 2, producto_id: 6, producto_nombre: 'Limonada de Coco', categoria_nombre: 'Bebidas', cantidad: 1, precio_unitario: 9500, costo_unitario: 2800, subtotal: 9500 },
      { id: 5, venta_id: 3, producto_id: 4, producto_nombre: 'Salmón en Salsa Maracuyá', categoria_nombre: 'Platos Fuertes', cantidad: 2, precio_unitario: 42000, costo_unitario: 19000, subtotal: 84000 },
      { id: 6, venta_id: 3, producto_id: 1, producto_nombre: 'Patacones con Hogao', categoria_nombre: 'Entradas', cantidad: 1, precio_unitario: 14000, costo_unitario: 5000, subtotal: 14000 },
      { id: 7, venta_id: 3, producto_id: 7, producto_nombre: 'Jugo Natural de Mango', categoria_nombre: 'Bebidas', cantidad: 1, precio_unitario: 8000, costo_unitario: 2200, subtotal: 8000 },
      { id: 8, venta_id: 4, producto_id: 5, producto_nombre: 'Hamburguesa SIGR Doble', categoria_nombre: 'Hamburguesas', cantidad: 1, precio_unitario: 28000, costo_unitario: 11500, subtotal: 28000 },
      { id: 9, venta_id: 4, producto_id: 6, producto_nombre: 'Limonada de Coco', categoria_nombre: 'Bebidas', cantidad: 1, precio_unitario: 9500, costo_unitario: 2800, subtotal: 9500 },
      { id: 10, venta_id: 5, producto_id: 3, producto_nombre: 'Churrasco a la Parrilla', categoria_nombre: 'Platos Fuertes', cantidad: 1, precio_unitario: 38000, costo_unitario: 16500, subtotal: 38000 },
      { id: 11, venta_id: 5, producto_id: 8, producto_nombre: 'Cheesecake Frutos Rojos', categoria_nombre: 'Postres', cantidad: 1, precio_unitario: 13500, costo_unitario: 4500, subtotal: 13500 },
      { id: 12, venta_id: 5, producto_id: 7, producto_nombre: 'Jugo Natural de Mango', categoria_nombre: 'Bebidas', cantidad: 1, precio_unitario: 8000, costo_unitario: 2200, subtotal: 8000 }
    ],
    movimientos_contables: [
      { id: 1, tipo: 'ingreso', categoria: 'Ventas POS', concepto: 'Factura POS-000001 - María Fernanda Gómez', monto: 92340, metodo_pago: 'tarjeta', referencia: 'POS-000001', venta_id: 1, fecha: daysAgoIso(3, 13, 20), notas: 'Servicio: mesa (Mesa 4)', created_at: daysAgoIso(3, 13, 20) },
      { id: 2, tipo: 'egreso', categoria: 'Proveedores / Insumos', concepto: 'Compra de carnes y vegetales frescos', monto: 125000, metodo_pago: 'transferencia', referencia: 'PROV-441', venta_id: null, fecha: daysAgoIso(3, 9, 0), notas: 'Mercado central', created_at: daysAgoIso(3, 9, 0) },
      { id: 3, tipo: 'ingreso', categoria: 'Ventas POS', concepto: 'Factura POS-000002 - Carlos Andrés Ramírez', monto: 70740, metodo_pago: 'transferencia', referencia: 'POS-000002', venta_id: 2, fecha: daysAgoIso(2, 19, 45), notas: 'Servicio: domicilio', created_at: daysAgoIso(2, 19, 45) },
      { id: 4, tipo: 'egreso', categoria: 'Servicios Públicos', concepto: 'Pago servicio de gas y energía cocina', monto: 48000, metodo_pago: 'transferencia', referencia: 'SRV-102', venta_id: null, fecha: daysAgoIso(2, 10, 30), notas: 'Recibo mensual', created_at: daysAgoIso(2, 10, 30) },
      { id: 5, tipo: 'ingreso', categoria: 'Ventas POS', concepto: 'Factura POS-000003 - Laura Juliana Torres', monto: 112320, metodo_pago: 'tarjeta', referencia: 'POS-000003', venta_id: 3, fecha: daysAgoIso(1, 14, 10), notas: 'Servicio: mesa (Mesa 2)', created_at: daysAgoIso(1, 14, 10) },
      { id: 6, tipo: 'ingreso', categoria: 'Ventas POS', concepto: 'Factura POS-000004 - Consumidor Final', monto: 40500, metodo_pago: 'efectivo', referencia: 'POS-000004', venta_id: 4, fecha: daysAgoIso(0, 11, 30), notas: 'Servicio: llevar', created_at: daysAgoIso(0, 11, 30) },
      { id: 7, tipo: 'ingreso', categoria: 'Ventas POS', concepto: 'Factura POS-000005 - María Fernanda Gómez', monto: 75060, metodo_pago: 'efectivo', referencia: 'POS-000005', venta_id: 5, fecha: daysAgoIso(0, 12, 40), notas: 'Servicio: mesa (Mesa 7)', created_at: daysAgoIso(0, 12, 40) },
      { id: 8, tipo: 'egreso', categoria: 'Insumos Cocina', concepto: 'Reposición empaques domicilio y servilletas', monto: 22000, metodo_pago: 'efectivo', referencia: 'CAJA-08', venta_id: null, fecha: daysAgoIso(0, 10, 0), notas: 'Caja menor', created_at: daysAgoIso(0, 10, 0) }
    ]
  };
}

const DB_FILE = process.env.DEMO_DB_FILE || path.join(process.cwd(), 'data', 'demo-db.json');
let memoryDb = null;

function loadDb() {
  if (memoryDb) return memoryDb;
  try {
    if (fs.existsSync(DB_FILE)) {
      memoryDb = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
      return memoryDb;
    }
  } catch {
    // Usar memoria
  }
  memoryDb = createInitialData();
  saveDb(memoryDb);
  return memoryDb;
}

function saveDb(db) {
  memoryDb = db;
  try {
    fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
  } catch {
    // En entornos read-only (ej. Vercel sin Supabase) permanece en memoria
  }
}

function inDateRange(isoDate, from, to) {
  const day = (isoDate || '').slice(0, 10);
  if (from && day < from.slice(0, 10)) return false;
  if (to && day > to.slice(0, 10)) return false;
  return true;
}

const demoAdapter = {
  mode: 'demo',

  async getConfig() {
    const db = loadDb();
    return { ...db.configuracion_restaurante };
  },

  async updateConfig(payload) {
    const db = loadDb();
    db.configuracion_restaurante = {
      ...db.configuracion_restaurante,
      nombre: payload.nombre || db.configuracion_restaurante.nombre,
      nit: payload.nit ?? db.configuracion_restaurante.nit,
      direccion: payload.direccion ?? db.configuracion_restaurante.direccion,
      telefono: payload.telefono ?? db.configuracion_restaurante.telefono,
      impuesto_porcentaje: toNumber(payload.impuesto_porcentaje, 0),
      moneda: payload.moneda || 'COP',
      prefijo_factura: (payload.prefijo_factura || 'POS').toUpperCase(),
      mensaje_factura: payload.mensaje_factura ?? db.configuracion_restaurante.mensaje_factura,
      updated_at: new Date().toISOString()
    };
    saveDb(db);
    return { ...db.configuracion_restaurante };
  },

  async listCategorias({ search, onlyActive } = {}) {
    const db = loadDb();
    let list = [...db.categorias];
    if (onlyActive) list = list.filter((c) => c.activo);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.nombre.toLowerCase().includes(q) ||
          (c.descripcion || '').toLowerCase().includes(q)
      );
    }
    return list
      .map((c) => ({
        ...c,
        total_productos: db.productos.filter((p) => Number(p.categoria_id) === Number(c.id)).length
      }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  },

  async getCategoriaById(id) {
    const db = loadDb();
    return db.categorias.find((c) => Number(c.id) === Number(id)) || null;
  },

  async createCategoria(payload) {
    const db = loadDb();
    const exists = db.categorias.some(
      (c) => c.nombre.toLowerCase() === payload.nombre.trim().toLowerCase()
    );
    if (exists) {
      const err = new Error('Ya existe una categoría con ese nombre.');
      err.statusCode = 409;
      throw err;
    }
    const now = new Date().toISOString();
    const cat = {
      id: ++db.counters.categorias,
      nombre: payload.nombre.trim(),
      descripcion: (payload.descripcion || '').trim(),
      color: payload.color || '#e85d04',
      icono: payload.icono || 'bi-tag',
      activo: payload.activo !== undefined ? Boolean(payload.activo) : true,
      created_at: now,
      updated_at: now
    };
    db.categorias.push(cat);
    saveDb(db);
    return { ...cat, total_productos: 0 };
  },

  async updateCategoria(id, payload) {
    const db = loadDb();
    const idx = db.categorias.findIndex((c) => Number(c.id) === Number(id));
    if (idx === -1) {
      const err = new Error('Categoría no encontrada.');
      err.statusCode = 404;
      throw err;
    }
    db.categorias[idx] = {
      ...db.categorias[idx],
      nombre: payload.nombre.trim(),
      descripcion: (payload.descripcion || '').trim(),
      color: payload.color || db.categorias[idx].color,
      icono: payload.icono || db.categorias[idx].icono,
      activo: payload.activo !== undefined ? Boolean(payload.activo) : db.categorias[idx].activo,
      updated_at: new Date().toISOString()
    };
    saveDb(db);
    return db.categorias[idx];
  },

  async deleteCategoria(id) {
    const db = loadDb();
    const inUse = db.productos.some((p) => Number(p.categoria_id) === Number(id));
    if (inUse) {
      const err = new Error(
        'No se puede eliminar la categoría porque tiene productos asociados.'
      );
      err.statusCode = 409;
      throw err;
    }
    db.categorias = db.categorias.filter((c) => Number(c.id) !== Number(id));
    saveDb(db);
    return { deleted: true };
  },

  async listProductos({ search, categoriaId, onlyAvailable } = {}) {
    const db = loadDb();
    const catMap = new Map(db.categorias.map((c) => [Number(c.id), c]));
    let list = db.productos.map((p) => {
      const cat = catMap.get(Number(p.categoria_id));
      return {
        ...p,
        precio: toNumber(p.precio),
        costo: toNumber(p.costo),
        stock: toNumber(p.stock),
        categoria_nombre: cat?.nombre || 'Sin categoría',
        categoria_color: cat?.color || '#6c757d'
      };
    });

    if (categoriaId) list = list.filter((p) => Number(p.categoria_id) === Number(categoriaId));
    if (onlyAvailable) list = list.filter((p) => p.disponible);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.nombre.toLowerCase().includes(q) ||
          (p.codigo || '').toLowerCase().includes(q) ||
          (p.descripcion || '').toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => b.id - a.id);
  },

  async getProductoById(id) {
    const list = await this.listProductos();
    return list.find((p) => Number(p.id) === Number(id)) || null;
  },

  async createProducto(payload) {
    const db = loadDb();
    const codigo = payload.codigo ? payload.codigo.trim().toUpperCase() : null;
    if (codigo && db.productos.some((p) => p.codigo === codigo)) {
      const err = new Error('Ya existe un producto con ese código SKU.');
      err.statusCode = 409;
      throw err;
    }
    const now = new Date().toISOString();
    const prod = {
      id: ++db.counters.productos,
      codigo,
      nombre: payload.nombre.trim(),
      descripcion: (payload.descripcion || '').trim(),
      categoria_id: payload.categoria_id ? Number(payload.categoria_id) : null,
      precio: toNumber(payload.precio, 0),
      costo: toNumber(payload.costo, 0),
      stock: Math.max(0, Math.round(toNumber(payload.stock, 0))),
      imagen_url: payload.imagen_url || '',
      imagen_path: payload.imagen_path || '',
      disponible: payload.disponible !== undefined ? Boolean(payload.disponible) : true,
      created_at: now,
      updated_at: now
    };
    db.productos.push(prod);
    saveDb(db);
    return this.getProductoById(prod.id);
  },

  async updateProducto(id, payload) {
    const db = loadDb();
    const idx = db.productos.findIndex((p) => Number(p.id) === Number(id));
    if (idx === -1) {
      const err = new Error('Producto no encontrado.');
      err.statusCode = 404;
      throw err;
    }
    const existing = db.productos[idx];
    db.productos[idx] = {
      ...existing,
      codigo: payload.codigo ? payload.codigo.trim().toUpperCase() : null,
      nombre: payload.nombre.trim(),
      descripcion: (payload.descripcion || '').trim(),
      categoria_id: payload.categoria_id ? Number(payload.categoria_id) : null,
      precio: toNumber(payload.precio, 0),
      costo: toNumber(payload.costo, 0),
      stock: Math.max(0, Math.round(toNumber(payload.stock, 0))),
      disponible: payload.disponible !== undefined ? Boolean(payload.disponible) : existing.disponible,
      imagen_url: payload.imagen_url !== undefined ? payload.imagen_url : existing.imagen_url,
      imagen_path: payload.imagen_path !== undefined ? payload.imagen_path : existing.imagen_path,
      updated_at: new Date().toISOString()
    };
    saveDb(db);
    return this.getProductoById(id);
  },

  async deleteProducto(id) {
    const db = loadDb();
    db.productos = db.productos.filter((p) => Number(p.id) !== Number(id));
    saveDb(db);
    return { deleted: true };
  },

  async listClientes({ search } = {}) {
    const db = loadDb();
    let list = db.clientes.map((c) => {
      const compras = db.ventas.filter(
        (v) => Number(v.cliente_id) === Number(c.id) && v.estado === 'pagada'
      );
      return {
        ...c,
        total_compras: compras.length,
        total_gastado: compras.reduce((acc, v) => acc + toNumber(v.total), 0)
      };
    });

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.nombre.toLowerCase().includes(q) ||
          (c.documento || '').toLowerCase().includes(q) ||
          (c.telefono || '').toLowerCase().includes(q) ||
          (c.email || '').toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => b.id - a.id);
  },

  async getClienteById(id) {
    const db = loadDb();
    const cli = db.clientes.find((c) => Number(c.id) === Number(id));
    if (!cli) return null;
    const ventas = db.ventas
      .filter((v) => Number(v.cliente_id) === Number(id))
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
    const pagadas = ventas.filter((v) => v.estado === 'pagada');
    return {
      ...cli,
      total_compras: pagadas.length,
      total_gastado: pagadas.reduce((acc, v) => acc + toNumber(v.total), 0),
      ventas
    };
  },

  async createCliente(payload) {
    const db = loadDb();
    const now = new Date().toISOString();
    const cli = {
      id: ++db.counters.clientes,
      nombre: payload.nombre.trim(),
      documento: (payload.documento || '').trim(),
      telefono: (payload.telefono || '').trim(),
      email: (payload.email || '').trim(),
      direccion: (payload.direccion || '').trim(),
      notas: (payload.notas || '').trim(),
      created_at: now,
      updated_at: now
    };
    db.clientes.push(cli);
    saveDb(db);
    return { ...cli, total_compras: 0, total_gastado: 0 };
  },

  async updateCliente(id, payload) {
    const db = loadDb();
    const idx = db.clientes.findIndex((c) => Number(c.id) === Number(id));
    if (idx === -1) {
      const err = new Error('Cliente no encontrado.');
      err.statusCode = 404;
      throw err;
    }
    db.clientes[idx] = {
      ...db.clientes[idx],
      nombre: payload.nombre.trim(),
      documento: (payload.documento || '').trim(),
      telefono: (payload.telefono || '').trim(),
      email: (payload.email || '').trim(),
      direccion: (payload.direccion || '').trim(),
      notas: (payload.notas || '').trim(),
      updated_at: new Date().toISOString()
    };
    saveDb(db);
    return db.clientes[idx];
  },

  async deleteCliente(id) {
    const db = loadDb();
    db.clientes = db.clientes.filter((c) => Number(c.id) !== Number(id));
    saveDb(db);
    return { deleted: true };
  },

  async listVentas({ from, to, estado, metodoPago, search } = {}) {
    const db = loadDb();
    let list = db.ventas.map((v) => ({
      ...v,
      items: db.venta_detalles.filter((d) => Number(d.venta_id) === Number(v.id))
    }));

    if (from || to) list = list.filter((v) => inDateRange(v.fecha, from, to));
    if (estado) list = list.filter((v) => v.estado === estado);
    if (metodoPago) list = list.filter((v) => v.metodo_pago === metodoPago);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (v) =>
          v.numero_factura.toLowerCase().includes(q) ||
          v.cliente_nombre.toLowerCase().includes(q) ||
          (v.mesa || '').toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => b.fecha.localeCompare(a.fecha));
  },

  async getVentaById(id) {
    const db = loadDb();
    const v = db.ventas.find((x) => Number(x.id) === Number(id));
    if (!v) return null;
    return {
      ...v,
      items: db.venta_detalles.filter((d) => Number(d.venta_id) === Number(v.id)),
      restaurante: { ...db.configuracion_restaurante }
    };
  },

  async createVenta(payload) {
    const db = loadDb();
    const itemsInput = Array.isArray(payload.items) ? payload.items : [];
    if (itemsInput.length === 0) {
      const err = new Error('Debes agregar al menos un producto a la venta.');
      err.statusCode = 400;
      throw err;
    }

    const catMap = new Map(db.categorias.map((c) => [Number(c.id), c.nombre]));
    let subtotal = 0;
    const preparedItems = [];

    for (const item of itemsInput) {
      const prod = db.productos.find((p) => Number(p.id) === Number(item.producto_id));
      if (!prod) {
        const err = new Error(`Producto #${item.producto_id} no encontrado.`);
        err.statusCode = 404;
        throw err;
      }
      const cantidad = Math.max(1, Math.round(toNumber(item.cantidad, 1)));
      const precioUnitario = toNumber(prod.precio);
      const costoUnitario = toNumber(prod.costo);
      const itemSubtotal = Number((precioUnitario * cantidad).toFixed(2));
      subtotal += itemSubtotal;

      preparedItems.push({
        prod,
        producto_id: prod.id,
        producto_nombre: prod.nombre,
        categoria_nombre: catMap.get(Number(prod.categoria_id)) || 'Sin categoría',
        cantidad,
        precio_unitario: precioUnitario,
        costo_unitario: costoUnitario,
        subtotal: itemSubtotal
      });
    }

    const config = db.configuracion_restaurante;
    const descuento = Math.min(subtotal, Math.max(0, toNumber(payload.descuento, 0)));
    const baseImponible = Math.max(0, subtotal - descuento);
    const impuestoPorcentaje =
      payload.impuesto_porcentaje !== undefined
        ? Math.max(0, toNumber(payload.impuesto_porcentaje, 0))
        : toNumber(config.impuesto_porcentaje, 0);
    const impuesto = Number(((baseImponible * impuestoPorcentaje) / 100).toFixed(2));
    const total = Number((baseImponible + impuesto).toFixed(2));
    const metodoPago = payload.metodo_pago || 'efectivo';
    const montoRecibido =
      metodoPago === 'efectivo'
        ? Math.max(total, toNumber(payload.monto_recibido, total))
        : total;
    const cambio = Number(Math.max(0, montoRecibido - total).toFixed(2));

    let clienteId = payload.cliente_id ? Number(payload.cliente_id) : null;
    let clienteNombre = (payload.cliente_nombre || '').trim() || 'Consumidor Final';
    if (clienteId) {
      const cli = db.clientes.find((c) => Number(c.id) === clienteId);
      if (cli) clienteNombre = cli.nombre;
      else clienteId = null;
    }

    const ventaId = ++db.counters.ventas;
    const numeroFactura = `${config.prefijo_factura || 'POS'}-${String(ventaId).padStart(6, '0')}`;
    const fecha = new Date().toISOString();

    const venta = {
      id: ventaId,
      numero_factura: numeroFactura,
      cliente_id: clienteId,
      cliente_nombre: clienteNombre,
      tipo_servicio: payload.tipo_servicio || 'mesa',
      mesa: (payload.mesa || '').trim(),
      subtotal: Number(subtotal.toFixed(2)),
      descuento: Number(descuento.toFixed(2)),
      impuesto_porcentaje: impuestoPorcentaje,
      impuesto,
      total,
      metodo_pago: metodoPago,
      monto_recibido: montoRecibido,
      cambio,
      estado: 'pagada',
      notas: (payload.notas || '').trim(),
      fecha,
      created_at: fecha
    };

    db.ventas.push(venta);

    const detalles = preparedItems.map(({ prod, ...rest }) => {
      prod.stock = Math.max(0, toNumber(prod.stock) - rest.cantidad);
      prod.updated_at = fecha;
      const det = {
        id: ++db.counters.venta_detalles,
        venta_id: ventaId,
        ...rest
      };
      db.venta_detalles.push(det);
      return det;
    });

    db.movimientos_contables.push({
      id: ++db.counters.movimientos_contables,
      tipo: 'ingreso',
      categoria: 'Ventas POS',
      concepto: `Factura ${numeroFactura} - ${clienteNombre}`,
      monto: total,
      metodo_pago: metodoPago,
      referencia: numeroFactura,
      venta_id: ventaId,
      fecha,
      notas: `Servicio: ${venta.tipo_servicio}${venta.mesa ? ` (${venta.mesa})` : ''}`,
      created_at: fecha
    });

    saveDb(db);
    return {
      ...venta,
      items: detalles,
      restaurante: { ...config }
    };
  },

  async anularVenta(id, motivo = '') {
    const db = loadDb();
    const venta = db.ventas.find((v) => Number(v.id) === Number(id));
    if (!venta) {
      const err = new Error('Factura no encontrada.');
      err.statusCode = 404;
      throw err;
    }
    if (venta.estado === 'anulada') {
      const err = new Error('Esta factura ya fue anulada previamente.');
      err.statusCode = 400;
      throw err;
    }

    venta.estado = 'anulada';
    if (motivo) {
      venta.notas = `${venta.notas ? `${venta.notas} | ` : ''}ANULADA: ${motivo}`;
    }

    const detalles = db.venta_detalles.filter((d) => Number(d.venta_id) === Number(venta.id));
    for (const det of detalles) {
      const prod = db.productos.find((p) => Number(p.id) === Number(det.producto_id));
      if (prod) prod.stock = toNumber(prod.stock) + toNumber(det.cantidad);
    }

    const now = new Date().toISOString();
    db.movimientos_contables.push({
      id: ++db.counters.movimientos_contables,
      tipo: 'egreso',
      categoria: 'Anulación de Venta',
      concepto: `Anulación factura ${venta.numero_factura}`,
      monto: toNumber(venta.total),
      metodo_pago: venta.metodo_pago,
      referencia: venta.numero_factura,
      venta_id: venta.id,
      fecha: now,
      notas: motivo || 'Reverso automático por anulación de factura POS',
      created_at: now
    });

    saveDb(db);
    return this.getVentaById(id);
  },

  async listMovimientos({ from, to, tipo, categoria, search } = {}) {
    const db = loadDb();
    let list = [...db.movimientos_contables];
    if (from || to) list = list.filter((m) => inDateRange(m.fecha, from, to));
    if (tipo) list = list.filter((m) => m.tipo === tipo);
    if (categoria) list = list.filter((m) => m.categoria === categoria);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (m) =>
          m.concepto.toLowerCase().includes(q) ||
          (m.referencia || '').toLowerCase().includes(q) ||
          (m.categoria || '').toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => b.fecha.localeCompare(a.fecha));
  },

  async createMovimiento(payload) {
    const db = loadDb();
    const now = new Date().toISOString();
    const mov = {
      id: ++db.counters.movimientos_contables,
      tipo: payload.tipo === 'egreso' ? 'egreso' : 'ingreso',
      categoria: (payload.categoria || 'General').trim(),
      concepto: payload.concepto.trim(),
      monto: Math.max(0, toNumber(payload.monto, 0)),
      metodo_pago: payload.metodo_pago || 'efectivo',
      referencia: (payload.referencia || '').trim(),
      venta_id: null,
      fecha: payload.fecha ? new Date(payload.fecha).toISOString() : now,
      notas: (payload.notas || '').trim(),
      created_at: now
    };
    db.movimientos_contables.push(mov);
    saveDb(db);
    return mov;
  },

  async updateMovimiento(id, payload) {
    const db = loadDb();
    const idx = db.movimientos_contables.findIndex((m) => Number(m.id) === Number(id));
    if (idx === -1) {
      const err = new Error('Movimiento contable no encontrado.');
      err.statusCode = 404;
      throw err;
    }
    db.movimientos_contables[idx] = {
      ...db.movimientos_contables[idx],
      tipo: payload.tipo === 'egreso' ? 'egreso' : 'ingreso',
      categoria: (payload.categoria || 'General').trim(),
      concepto: payload.concepto.trim(),
      monto: Math.max(0, toNumber(payload.monto, 0)),
      metodo_pago: payload.metodo_pago || 'efectivo',
      referencia: (payload.referencia || '').trim(),
      fecha: payload.fecha ? new Date(payload.fecha).toISOString() : db.movimientos_contables[idx].fecha,
      notas: (payload.notas || '').trim()
    };
    saveDb(db);
    return db.movimientos_contables[idx];
  },

  async deleteMovimiento(id) {
    const db = loadDb();
    db.movimientos_contables = db.movimientos_contables.filter(
      (m) => Number(m.id) !== Number(id)
    );
    saveDb(db);
    return { deleted: true };
  },

  async getContabilidadResumen({ from, to } = {}) {
    const movimientos = await this.listMovimientos({ from, to });
    const ventas = await this.listVentas({ from, to, estado: 'pagada' });

    let totalIngresos = 0;
    let totalEgresos = 0;
    const porCategoria = {};
    const porMetodo = {};

    for (const m of movimientos) {
      const monto = toNumber(m.monto);
      if (m.tipo === 'ingreso') totalIngresos += monto;
      else totalEgresos += monto;

      const catKey = `${m.tipo}:${m.categoria}`;
      if (!porCategoria[catKey]) {
        porCategoria[catKey] = { tipo: m.tipo, categoria: m.categoria, total: 0, cantidad: 0 };
      }
      porCategoria[catKey].total += monto;
      porCategoria[catKey].cantidad += 1;

      if (!porMetodo[m.metodo_pago]) {
        porMetodo[m.metodo_pago] = { metodo: m.metodo_pago, ingresos: 0, egresos: 0 };
      }
      if (m.tipo === 'ingreso') porMetodo[m.metodo_pago].ingresos += monto;
      else porMetodo[m.metodo_pago].egresos += monto;
    }

    let costoMercancia = 0;
    let ingresosVentas = 0;
    for (const v of ventas) {
      ingresosVentas += toNumber(v.total);
      for (const item of v.items || []) {
        costoMercancia += toNumber(item.costo_unitario) * toNumber(item.cantidad);
      }
    }

    return {
      total_ingresos: Number(totalIngresos.toFixed(2)),
      total_egresos: Number(totalEgresos.toFixed(2)),
      balance_neto: Number((totalIngresos - totalEgresos).toFixed(2)),
      ingresos_ventas_pos: Number(ingresosVentas.toFixed(2)),
      costo_mercancia_vendida: Number(costoMercancia.toFixed(2)),
      utilidad_bruta_ventas: Number((ingresosVentas - costoMercancia).toFixed(2)),
      total_movimientos: movimientos.length,
      desglose_categorias: Object.values(porCategoria).sort((a, b) => b.total - a.total),
      desglose_metodos: Object.values(porMetodo)
    };
  },

  async getSalesReport({ from, to } = {}) {
    const ventas = await this.listVentas({ from, to, estado: 'pagada' });
    const productos = await this.listProductos();
    const imgById = new Map(productos.map((p) => [Number(p.id), p.imagen_url || '']));

    let totalVentas = 0;
    let totalSubtotal = 0;
    let totalImpuestos = 0;
    let totalDescuentos = 0;
    let totalCosto = 0;
    let totalUnidades = 0;

    const porDiaMap = {};
    const porCategoriaMap = {};
    const porMetodoMap = {};
    const porServicioMap = {};
    const topProductosMap = {};

    for (const v of ventas) {
      const total = toNumber(v.total);
      totalVentas += total;
      totalSubtotal += toNumber(v.subtotal);
      totalImpuestos += toNumber(v.impuesto);
      totalDescuentos += toNumber(v.descuento);

      const dia = (v.fecha || '').slice(0, 10);
      if (dia) {
        if (!porDiaMap[dia]) porDiaMap[dia] = { fecha: dia, total: 0, facturas: 0 };
        porDiaMap[dia].total += total;
        porDiaMap[dia].facturas += 1;
      }

      const met = v.metodo_pago || 'efectivo';
      if (!porMetodoMap[met]) porMetodoMap[met] = { metodo: met, total: 0, facturas: 0 };
      porMetodoMap[met].total += total;
      porMetodoMap[met].facturas += 1;

      const srv = v.tipo_servicio || 'mesa';
      if (!porServicioMap[srv]) porServicioMap[srv] = { tipo: srv, total: 0, facturas: 0 };
      porServicioMap[srv].total += total;
      porServicioMap[srv].facturas += 1;

      for (const item of v.items || []) {
        const cant = toNumber(item.cantidad);
        const sub = toNumber(item.subtotal);
        const cost = toNumber(item.costo_unitario) * cant;
        totalUnidades += cant;
        totalCosto += cost;

        const cat = item.categoria_nombre || 'Sin categoría';
        if (!porCategoriaMap[cat]) {
          porCategoriaMap[cat] = { categoria: cat, total: 0, unidades: 0 };
        }
        porCategoriaMap[cat].total += sub;
        porCategoriaMap[cat].unidades += cant;

        const pKey = item.producto_id || item.producto_nombre;
        if (!topProductosMap[pKey]) {
          topProductosMap[pKey] = {
            producto_id: item.producto_id,
            nombre: item.producto_nombre,
            categoria: cat,
            imagen_url: imgById.get(Number(item.producto_id)) || '',
            unidades: 0,
            ingresos: 0,
            costo: 0,
            utilidad: 0
          };
        }
        topProductosMap[pKey].unidades += cant;
        topProductosMap[pKey].ingresos += sub;
        topProductosMap[pKey].costo += cost;
        topProductosMap[pKey].utilidad += sub - cost;
      }
    }

    const totalFacturas = ventas.length;
    const ticketPromedio = totalFacturas > 0 ? totalVentas / totalFacturas : 0;
    const utilidadBruta = totalVentas - totalCosto;
    const margenBruto = totalVentas > 0 ? (utilidadBruta / totalVentas) * 100 : 0;

    return {
      periodo: { from: from || null, to: to || null },
      resumen: {
        total_ventas: Number(totalVentas.toFixed(2)),
        total_subtotal: Number(totalSubtotal.toFixed(2)),
        total_impuestos: Number(totalImpuestos.toFixed(2)),
        total_descuentos: Number(totalDescuentos.toFixed(2)),
        total_costo: Number(totalCosto.toFixed(2)),
        utilidad_bruta: Number(utilidadBruta.toFixed(2)),
        margen_bruto: Number(margenBruto.toFixed(1)),
        total_facturas: totalFacturas,
        total_unidades: totalUnidades,
        ticket_promedio: Number(ticketPromedio.toFixed(2))
      },
      ventas_por_dia: Object.values(porDiaMap).sort((a, b) => a.fecha.localeCompare(b.fecha)),
      ventas_por_categoria: Object.values(porCategoriaMap).sort((a, b) => b.total - a.total),
      ventas_por_metodo: Object.values(porMetodoMap).sort((a, b) => b.total - a.total),
      ventas_por_servicio: Object.values(porServicioMap).sort((a, b) => b.total - a.total),
      top_productos: Object.values(topProductosMap)
        .sort((a, b) => b.ingresos - a.ingresos)
        .slice(0, 10),
      facturas: ventas
    };
  },

  async getDashboardSummary() {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const monthStart = `${todayStr.slice(0, 7)}-01`;
    const sevenDaysAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    const [
      reporteHoy,
      reporteMes,
      reporteSemana,
      contabilidadMes,
      productos,
      clientes,
      categorias
    ] = await Promise.all([
      this.getSalesReport({ from: todayStr, to: todayStr }),
      this.getSalesReport({ from: monthStart, to: todayStr }),
      this.getSalesReport({ from: sevenDaysAgo, to: todayStr }),
      this.getContabilidadResumen({ from: monthStart, to: todayStr }),
      this.listProductos(),
      this.listClientes(),
      this.listCategorias()
    ]);

    const bajoStock = productos.filter((p) => p.stock <= 5);

    return {
      kpis: {
        ventas_hoy: reporteHoy.resumen.total_ventas,
        facturas_hoy: reporteHoy.resumen.total_facturas,
        ventas_mes: reporteMes.resumen.total_ventas,
        facturas_mes: reporteMes.resumen.total_facturas,
        ticket_promedio_mes: reporteMes.resumen.ticket_promedio,
        balance_neto_mes: contabilidadMes.balance_neto,
        egresos_mes: contabilidadMes.total_egresos,
        total_productos: productos.length,
        productos_bajo_stock: bajoStock.length,
        total_clientes: clientes.length,
        total_categorias: categorias.length
      },
      ventas_ultimos_7_dias: reporteSemana.ventas_por_dia,
      top_productos: reporteMes.top_productos.slice(0, 5),
      ultimas_ventas: reporteMes.facturas.slice(0, 6),
      alertas_stock: bajoStock.slice(0, 5)
    };
  }
};

module.exports = demoAdapter;
