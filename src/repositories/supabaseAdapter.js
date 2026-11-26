const { supabase } = require('../config/supabase');

function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function normalizeDateRange(from, to) {
  let start = null;
  let end = null;
  if (from) {
    start = from.length === 10 ? `${from}T00:00:00.000Z` : from;
  }
  if (to) {
    end = to.length === 10 ? `${to}T23:59:59.999Z` : to;
  }
  return { start, end };
}

function handleError(error, context) {
  if (!error) return;
  const msg = error.message || 'Error en base de datos Supabase';
  const err = new Error(`${context}: ${msg}`);
  err.statusCode = error.code === '23505' ? 409 : 400;
  throw err;
}

const supabaseAdapter = {
  mode: 'supabase',

  // ---------------- CONFIGURACION ----------------
  async getConfig() {
    const { data, error } = await supabase
      .from('configuracion_restaurante')
      .select('*')
      .eq('id', 1)
      .maybeSingle();

    if (error) handleError(error, 'Error obteniendo configuración');

    if (!data) {
      return {
        id: 1,
        nombre: process.env.RESTAURANT_NAME || 'SIGR Restaurante',
        nit: process.env.RESTAURANT_NIT || '900.123.456-7',
        direccion: process.env.RESTAURANT_ADDRESS || 'Calle Principal #123',
        telefono: process.env.RESTAURANT_PHONE || '+57 300 000 0000',
        impuesto_porcentaje: toNumber(process.env.DEFAULT_TAX_RATE, 8),
        moneda: process.env.RESTAURANT_CURRENCY || 'COP',
        prefijo_factura: 'POS',
        mensaje_factura: '¡Gracias por su visita! Vuelva pronto.'
      };
    }
    return {
      ...data,
      impuesto_porcentaje: toNumber(data.impuesto_porcentaje, 0)
    };
  },

  async updateConfig(payload) {
    const updateData = {
      id: 1,
      nombre: payload.nombre || 'SIGR Restaurante',
      nit: payload.nit || '',
      direccion: payload.direccion || '',
      telefono: payload.telefono || '',
      impuesto_porcentaje: toNumber(payload.impuesto_porcentaje, 0),
      moneda: payload.moneda || 'COP',
      prefijo_factura: (payload.prefijo_factura || 'POS').toUpperCase(),
      mensaje_factura: payload.mensaje_factura || '',
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('configuracion_restaurante')
      .upsert(updateData)
      .select('*')
      .single();

    if (error) handleError(error, 'Error actualizando configuración');
    return data;
  },

  // ---------------- CATEGORIAS ----------------
  async listCategorias({ search, onlyActive } = {}) {
    let query = supabase
      .from('categorias')
      .select('*')
      .order('nombre', { ascending: true });

    if (onlyActive) query = query.eq('activo', true);
    if (search) query = query.ilike('nombre', `%${search}%`);

    const { data: categorias, error } = await query;
    if (error) handleError(error, 'Error listando categorías');

    const { data: productos, error: prodErr } = await supabase
      .from('productos')
      .select('id, categoria_id');
    if (prodErr) handleError(prodErr, 'Error contando productos por categoría');

    const counts = {};
    for (const p of productos || []) {
      if (p.categoria_id) {
        counts[p.categoria_id] = (counts[p.categoria_id] || 0) + 1;
      }
    }

    return (categorias || []).map((c) => ({
      ...c,
      total_productos: counts[c.id] || 0
    }));
  },

  async getCategoriaById(id) {
    const { data, error } = await supabase
      .from('categorias')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) handleError(error, 'Error consultando categoría');
    return data;
  },

  async createCategoria(payload) {
    const { data, error } = await supabase
      .from('categorias')
      .insert({
        nombre: payload.nombre.trim(),
        descripcion: (payload.descripcion || '').trim(),
        color: payload.color || '#e85d04',
        icono: payload.icono || 'bi-tag',
        activo: payload.activo !== undefined ? Boolean(payload.activo) : true
      })
      .select('*')
      .single();
    if (error) handleError(error, 'Error creando categoría');
    return { ...data, total_productos: 0 };
  },

  async updateCategoria(id, payload) {
    const { data, error } = await supabase
      .from('categorias')
      .update({
        nombre: payload.nombre.trim(),
        descripcion: (payload.descripcion || '').trim(),
        color: payload.color || '#e85d04',
        icono: payload.icono || 'bi-tag',
        activo: payload.activo !== undefined ? Boolean(payload.activo) : true,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('*')
      .single();
    if (error) handleError(error, 'Error actualizando categoría');
    return data;
  },

  async deleteCategoria(id) {
    const { data: prods, error: checkErr } = await supabase
      .from('productos')
      .select('id')
      .eq('categoria_id', id)
      .limit(1);
    if (checkErr) handleError(checkErr, 'Error validando categoría');
    if (prods && prods.length > 0) {
      const err = new Error(
        'No se puede eliminar la categoría porque tiene productos asociados. Reasigna o elimina primero los productos.'
      );
      err.statusCode = 409;
      throw err;
    }

    const { error } = await supabase.from('categorias').delete().eq('id', id);
    if (error) handleError(error, 'Error eliminando categoría');
    return { deleted: true };
  },

  // ---------------- PRODUCTOS ----------------
  async listProductos({ search, categoriaId, onlyAvailable } = {}) {
    let query = supabase
      .from('productos')
      .select('*, categorias(id, nombre, color, icono)')
      .order('created_at', { ascending: false });

    if (categoriaId) query = query.eq('categoria_id', Number(categoriaId));
    if (onlyAvailable) query = query.eq('disponible', true);
    if (search) {
      query = query.or(`nombre.ilike.%${search}%,codigo.ilike.%${search}%,descripcion.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) handleError(error, 'Error listando productos');

    return (data || []).map((p) => ({
      ...p,
      precio: toNumber(p.precio),
      costo: toNumber(p.costo),
      stock: toNumber(p.stock),
      categoria_nombre: p.categorias?.nombre || 'Sin categoría',
      categoria_color: p.categorias?.color || '#6c757d'
    }));
  },

  async getProductoById(id) {
    const { data, error } = await supabase
      .from('productos')
      .select('*, categorias(id, nombre, color, icono)')
      .eq('id', id)
      .maybeSingle();
    if (error) handleError(error, 'Error consultando producto');
    if (!data) return null;
    return {
      ...data,
      precio: toNumber(data.precio),
      costo: toNumber(data.costo),
      stock: toNumber(data.stock),
      categoria_nombre: data.categorias?.nombre || 'Sin categoría',
      categoria_color: data.categorias?.color || '#6c757d'
    };
  },

  async createProducto(payload) {
    const { data, error } = await supabase
      .from('productos')
      .insert({
        codigo: payload.codigo ? payload.codigo.trim().toUpperCase() : null,
        nombre: payload.nombre.trim(),
        descripcion: (payload.descripcion || '').trim(),
        categoria_id: payload.categoria_id ? Number(payload.categoria_id) : null,
        precio: toNumber(payload.precio, 0),
        costo: toNumber(payload.costo, 0),
        stock: Math.max(0, Math.round(toNumber(payload.stock, 0))),
        imagen_url: payload.imagen_url || '',
        imagen_path: payload.imagen_path || '',
        disponible: payload.disponible !== undefined ? Boolean(payload.disponible) : true
      })
      .select('*, categorias(id, nombre, color, icono)')
      .single();
    if (error) handleError(error, 'Error creando producto');
    return {
      ...data,
      precio: toNumber(data.precio),
      costo: toNumber(data.costo),
      stock: toNumber(data.stock),
      categoria_nombre: data.categorias?.nombre || 'Sin categoría',
      categoria_color: data.categorias?.color || '#6c757d'
    };
  },

  async updateProducto(id, payload) {
    const updateFields = {
      codigo: payload.codigo ? payload.codigo.trim().toUpperCase() : null,
      nombre: payload.nombre.trim(),
      descripcion: (payload.descripcion || '').trim(),
      categoria_id: payload.categoria_id ? Number(payload.categoria_id) : null,
      precio: toNumber(payload.precio, 0),
      costo: toNumber(payload.costo, 0),
      stock: Math.max(0, Math.round(toNumber(payload.stock, 0))),
      disponible: payload.disponible !== undefined ? Boolean(payload.disponible) : true,
      updated_at: new Date().toISOString()
    };

    if (payload.imagen_url !== undefined) {
      updateFields.imagen_url = payload.imagen_url;
    }
    if (payload.imagen_path !== undefined) {
      updateFields.imagen_path = payload.imagen_path;
    }

    const { data, error } = await supabase
      .from('productos')
      .update(updateFields)
      .eq('id', id)
      .select('*, categorias(id, nombre, color, icono)')
      .single();
    if (error) handleError(error, 'Error actualizando producto');
    return {
      ...data,
      precio: toNumber(data.precio),
      costo: toNumber(data.costo),
      stock: toNumber(data.stock),
      categoria_nombre: data.categorias?.nombre || 'Sin categoría',
      categoria_color: data.categorias?.color || '#6c757d'
    };
  },

  async deleteProducto(id) {
    const { error } = await supabase.from('productos').delete().eq('id', id);
    if (error) handleError(error, 'Error eliminando producto');
    return { deleted: true };
  },

  // ---------------- CLIENTES ----------------
  async listClientes({ search } = {}) {
    let query = supabase
      .from('clientes')
      .select('*')
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(
        `nombre.ilike.%${search}%,documento.ilike.%${search}%,telefono.ilike.%${search}%,email.ilike.%${search}%`
      );
    }

    const { data: clientes, error } = await query;
    if (error) handleError(error, 'Error listando clientes');

    const { data: ventas, error: ventasErr } = await supabase
      .from('ventas')
      .select('cliente_id, total, estado')
      .eq('estado', 'pagada');
    if (ventasErr) handleError(ventasErr, 'Error calculando historial de clientes');

    const stats = {};
    for (const v of ventas || []) {
      if (!v.cliente_id) continue;
      if (!stats[v.cliente_id]) stats[v.cliente_id] = { compras: 0, total: 0 };
      stats[v.cliente_id].compras += 1;
      stats[v.cliente_id].total += toNumber(v.total);
    }

    return (clientes || []).map((c) => ({
      ...c,
      total_compras: stats[c.id]?.compras || 0,
      total_gastado: stats[c.id]?.total || 0
    }));
  },

  async getClienteById(id) {
    const { data: cliente, error } = await supabase
      .from('clientes')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) handleError(error, 'Error consultando cliente');
    if (!cliente) return null;

    const { data: ventas, error: vErr } = await supabase
      .from('ventas')
      .select('id, numero_factura, fecha, total, metodo_pago, estado')
      .eq('cliente_id', id)
      .order('fecha', { ascending: false })
      .limit(20);
    if (vErr) handleError(vErr, 'Error consultando compras del cliente');

    const pagadas = (ventas || []).filter((v) => v.estado === 'pagada');
    return {
      ...cliente,
      total_compras: pagadas.length,
      total_gastado: pagadas.reduce((acc, v) => acc + toNumber(v.total), 0),
      ventas: ventas || []
    };
  },

  async createCliente(payload) {
    const { data, error } = await supabase
      .from('clientes')
      .insert({
        nombre: payload.nombre.trim(),
        documento: (payload.documento || '').trim(),
        telefono: (payload.telefono || '').trim(),
        email: (payload.email || '').trim(),
        direccion: (payload.direccion || '').trim(),
        notas: (payload.notas || '').trim()
      })
      .select('*')
      .single();
    if (error) handleError(error, 'Error creando cliente');
    return { ...data, total_compras: 0, total_gastado: 0 };
  },

  async updateCliente(id, payload) {
    const { data, error } = await supabase
      .from('clientes')
      .update({
        nombre: payload.nombre.trim(),
        documento: (payload.documento || '').trim(),
        telefono: (payload.telefono || '').trim(),
        email: (payload.email || '').trim(),
        direccion: (payload.direccion || '').trim(),
        notas: (payload.notas || '').trim(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('*')
      .single();
    if (error) handleError(error, 'Error actualizando cliente');
    return data;
  },

  async deleteCliente(id) {
    const { error } = await supabase.from('clientes').delete().eq('id', id);
    if (error) handleError(error, 'Error eliminando cliente');
    return { deleted: true };
  },

  // ---------------- VENTAS / POS ----------------
  async listVentas({ from, to, estado, metodoPago, search } = {}) {
    const { start, end } = normalizeDateRange(from, to);

    let query = supabase
      .from('ventas')
      .select('*, venta_detalles(*)')
      .order('fecha', { ascending: false })
      .limit(200);

    if (start) query = query.gte('fecha', start);
    if (end) query = query.lte('fecha', end);
    if (estado) query = query.eq('estado', estado);
    if (metodoPago) query = query.eq('metodo_pago', metodoPago);
    if (search) {
      query = query.or(
        `numero_factura.ilike.%${search}%,cliente_nombre.ilike.%${search}%,mesa.ilike.%${search}%`
      );
    }

    const { data, error } = await query;
    if (error) handleError(error, 'Error listando ventas');

    return (data || []).map((v) => ({
      ...v,
      subtotal: toNumber(v.subtotal),
      descuento: toNumber(v.descuento),
      impuesto_porcentaje: toNumber(v.impuesto_porcentaje),
      impuesto: toNumber(v.impuesto),
      total: toNumber(v.total),
      monto_recibido: toNumber(v.monto_recibido),
      cambio: toNumber(v.cambio),
      items: (v.venta_detalles || []).map((d) => ({
        ...d,
        precio_unitario: toNumber(d.precio_unitario),
        costo_unitario: toNumber(d.costo_unitario),
        subtotal: toNumber(d.subtotal)
      }))
    }));
  },

  async getVentaById(id) {
    const { data, error } = await supabase
      .from('ventas')
      .select('*, venta_detalles(*)')
      .eq('id', id)
      .maybeSingle();
    if (error) handleError(error, 'Error consultando factura');
    if (!data) return null;

    const config = await this.getConfig();
    return {
      ...data,
      subtotal: toNumber(data.subtotal),
      descuento: toNumber(data.descuento),
      impuesto_porcentaje: toNumber(data.impuesto_porcentaje),
      impuesto: toNumber(data.impuesto),
      total: toNumber(data.total),
      monto_recibido: toNumber(data.monto_recibido),
      cambio: toNumber(data.cambio),
      items: (data.venta_detalles || []).map((d) => ({
        ...d,
        precio_unitario: toNumber(d.precio_unitario),
        costo_unitario: toNumber(d.costo_unitario),
        subtotal: toNumber(d.subtotal)
      })),
      restaurante: config
    };
  },

  async createVenta(payload) {
    const itemsInput = Array.isArray(payload.items) ? payload.items : [];
    if (itemsInput.length === 0) {
      const err = new Error('Debes agregar al menos un producto a la venta.');
      err.statusCode = 400;
      throw err;
    }

    const config = await this.getConfig();
    const productIds = itemsInput.map((i) => Number(i.producto_id)).filter(Boolean);

    const { data: dbProducts, error: prodErr } = await supabase
      .from('productos')
      .select('*, categorias(nombre)')
      .in('id', productIds);
    if (prodErr) handleError(prodErr, 'Error validando productos de la venta');

    const productMap = new Map((dbProducts || []).map((p) => [Number(p.id), p]));

    let subtotal = 0;
    const preparedItems = [];
    for (const item of itemsInput) {
      const prod = productMap.get(Number(item.producto_id));
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
        producto_id: prod.id,
        producto_nombre: prod.nombre,
        categoria_nombre: prod.categorias?.nombre || 'Sin categoría',
        cantidad,
        precio_unitario: precioUnitario,
        costo_unitario: costoUnitario,
        subtotal: itemSubtotal,
        current_stock: toNumber(prod.stock)
      });
    }

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

    let clienteNombre = (payload.cliente_nombre || '').trim() || 'Consumidor Final';
    let clienteId = payload.cliente_id ? Number(payload.cliente_id) : null;
    if (clienteId) {
      const { data: cli } = await supabase
        .from('clientes')
        .select('id, nombre')
        .eq('id', clienteId)
        .maybeSingle();
      if (cli) {
        clienteNombre = cli.nombre;
      } else {
        clienteId = null;
      }
    }

    // Generar consecutivo de factura POS
    const { data: lastSale } = await supabase
      .from('ventas')
      .select('id')
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextNumber = (lastSale?.id || 0) + 1;
    const prefijo = config.prefijo_factura || 'POS';
    const numeroFactura = `${prefijo}-${String(nextNumber).padStart(6, '0')}`;

    const fecha = new Date().toISOString();
    const { data: venta, error: ventaErr } = await supabase
      .from('ventas')
      .insert({
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
        fecha
      })
      .select('*')
      .single();
    if (ventaErr) handleError(ventaErr, 'Error registrando venta');

    const detailsToInsert = preparedItems.map(({ current_stock, ...rest }) => ({
      venta_id: venta.id,
      ...rest
    }));

    const { data: detalles, error: detErr } = await supabase
      .from('venta_detalles')
      .insert(detailsToInsert)
      .select('*');
    if (detErr) handleError(detErr, 'Error guardando detalle de factura');

    // Descontar stock de productos vendidos
    for (const item of preparedItems) {
      const nuevoStock = Math.max(0, item.current_stock - item.cantidad);
      await supabase
        .from('productos')
        .update({ stock: nuevoStock, updated_at: fecha })
        .eq('id', item.producto_id);
    }

    // Registrar asiento automático en Contabilidad
    await supabase.from('movimientos_contables').insert({
      tipo: 'ingreso',
      categoria: 'Ventas POS',
      concepto: `Factura ${numeroFactura} - ${clienteNombre}`,
      monto: total,
      metodo_pago: metodoPago,
      referencia: numeroFactura,
      venta_id: venta.id,
      fecha,
      notas: `Servicio: ${venta.tipo_servicio}${venta.mesa ? ` (${venta.mesa})` : ''}`
    });

    return {
      ...venta,
      subtotal: toNumber(venta.subtotal),
      descuento: toNumber(venta.descuento),
      impuesto_porcentaje: toNumber(venta.impuesto_porcentaje),
      impuesto: toNumber(venta.impuesto),
      total: toNumber(venta.total),
      monto_recibido: toNumber(venta.monto_recibido),
      cambio: toNumber(venta.cambio),
      items: detalles || [],
      restaurante: config
    };
  },

  async anularVenta(id, motivo = '') {
    const venta = await this.getVentaById(id);
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

    const notasActualizadas = motivo
      ? `${venta.notas ? `${venta.notas} | ` : ''}ANULADA: ${motivo}`
      : venta.notas;

    const { error } = await supabase
      .from('ventas')
      .update({ estado: 'anulada', notas: notasActualizadas })
      .eq('id', id);
    if (error) handleError(error, 'Error anulando factura');

    // Reponer inventario
    for (const item of venta.items || []) {
      if (!item.producto_id) continue;
      const { data: prod } = await supabase
        .from('productos')
        .select('stock')
        .eq('id', item.producto_id)
        .maybeSingle();
      if (prod) {
        await supabase
          .from('productos')
          .update({ stock: toNumber(prod.stock) + toNumber(item.cantidad) })
          .eq('id', item.producto_id);
      }
    }

    // Registrar reverso contable auditable
    await supabase.from('movimientos_contables').insert({
      tipo: 'egreso',
      categoria: 'Anulación de Venta',
      concepto: `Anulación factura ${venta.numero_factura}`,
      monto: toNumber(venta.total),
      metodo_pago: venta.metodo_pago,
      referencia: venta.numero_factura,
      venta_id: venta.id,
      fecha: new Date().toISOString(),
      notas: motivo || 'Reverso automático por anulación de factura POS'
    });

    return this.getVentaById(id);
  },

  // ---------------- CONTABILIDAD ----------------
  async listMovimientos({ from, to, tipo, categoria, search } = {}) {
    const { start, end } = normalizeDateRange(from, to);

    let query = supabase
      .from('movimientos_contables')
      .select('*')
      .order('fecha', { ascending: false })
      .limit(300);

    if (start) query = query.gte('fecha', start);
    if (end) query = query.lte('fecha', end);
    if (tipo) query = query.eq('tipo', tipo);
    if (categoria) query = query.eq('categoria', categoria);
    if (search) {
      query = query.or(
        `concepto.ilike.%${search}%,referencia.ilike.%${search}%,categoria.ilike.%${search}%`
      );
    }

    const { data, error } = await query;
    if (error) handleError(error, 'Error listando movimientos contables');
    return (data || []).map((m) => ({ ...m, monto: toNumber(m.monto) }));
  },

  async createMovimiento(payload) {
    const tipo = payload.tipo === 'egreso' ? 'egreso' : 'ingreso';
    const { data, error } = await supabase
      .from('movimientos_contables')
      .insert({
        tipo,
        categoria: (payload.categoria || 'General').trim(),
        concepto: payload.concepto.trim(),
        monto: Math.max(0, toNumber(payload.monto, 0)),
        metodo_pago: payload.metodo_pago || 'efectivo',
        referencia: (payload.referencia || '').trim(),
        fecha: payload.fecha ? new Date(payload.fecha).toISOString() : new Date().toISOString(),
        notas: (payload.notas || '').trim()
      })
      .select('*')
      .single();
    if (error) handleError(error, 'Error registrando movimiento contable');
    return { ...data, monto: toNumber(data.monto) };
  },

  async updateMovimiento(id, payload) {
    const { data, error } = await supabase
      .from('movimientos_contables')
      .update({
        tipo: payload.tipo === 'egreso' ? 'egreso' : 'ingreso',
        categoria: (payload.categoria || 'General').trim(),
        concepto: payload.concepto.trim(),
        monto: Math.max(0, toNumber(payload.monto, 0)),
        metodo_pago: payload.metodo_pago || 'efectivo',
        referencia: (payload.referencia || '').trim(),
        fecha: payload.fecha ? new Date(payload.fecha).toISOString() : undefined,
        notas: (payload.notas || '').trim()
      })
      .eq('id', id)
      .select('*')
      .single();
    if (error) handleError(error, 'Error actualizando movimiento contable');
    return { ...data, monto: toNumber(data.monto) };
  },

  async deleteMovimiento(id) {
    const { error } = await supabase
      .from('movimientos_contables')
      .delete()
      .eq('id', id);
    if (error) handleError(error, 'Error eliminando movimiento contable');
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

  // ---------------- REPORTES Y DASHBOARD ----------------
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

module.exports = supabaseAdapter;
