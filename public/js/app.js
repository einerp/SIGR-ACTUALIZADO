const SIGR = (() => {
  const state = {
    currentView: 'dashboard',
    user: null,
    config: {
      nombre: 'SIGR Restaurante',
      nit: '900.123.456-7',
      direccion: '',
      telefono: '',
      impuesto_porcentaje: 8,
      moneda: 'COP',
      prefijo_factura: 'POS',
      mensaje_factura: '¡Gracias por su visita!'
    },
    categorias: [],
    productos: [],
    clientes: [],
    posCategoryFilter: 'all',
    cart: [],
    removeProductImageFlag: false,
    charts: {}
  };

  const VIEW_TITLES = {
    dashboard: 'Dashboard General',
    pos: 'Punto de Venta (POS)',
    ventas: 'Historial de Facturas POS',
    categorias: 'Gestión de Categorías',
    productos: 'Catálogo de Productos e Imágenes',
    clientes: 'Directorio de Clientes',
    contabilidad: 'Contabilidad — Ingresos y Egresos',
    reportes: 'Reportes y Analítica de Ventas',
    configuracion: 'Configuración del Restaurante'
  };

  // ---------------- UTILIDADES ----------------
  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatMoney(amount) {
    const val = Number(amount) || 0;
    const currency = state.config.moneda || 'COP';
    const locale = currency === 'EUR' ? 'es-ES' : currency === 'USD' ? 'en-US' : 'es-CO';
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        maximumFractionDigits: currency === 'COP' ? 0 : 2
      }).format(val);
    } catch {
      return `$${val.toLocaleString('es-CO')}`;
    }
  }

  function formatDateTime(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function todayYMD() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const bg =
      type === 'danger'
        ? 'text-bg-danger'
        : type === 'warning'
        ? 'text-bg-warning'
        : type === 'info'
        ? 'text-bg-primary'
        : 'text-bg-success';

    const el = document.createElement('div');
    el.className = `toast align-items-center ${bg} border-0`;
    el.innerHTML = `
      <div class="d-flex">
        <div class="toast-body fw-semibold">${escapeHtml(message)}</div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
      </div>`;
    container.appendChild(el);
    const toast = new bootstrap.Toast(el, { delay: 3200 });
    toast.show();
    el.addEventListener('hidden.bs.toast', () => el.remove());
  }

  function destroyChart(key) {
    if (state.charts[key]) {
      state.charts[key].destroy();
      delete state.charts[key];
    }
  }

  function serviceLabel(tipo) {
    const map = { mesa: 'Mesa', llevar: 'Para llevar', domicilio: 'Domicilio' };
    return map[tipo] || tipo;
  }

  function methodLabel(m) {
    const map = {
      efectivo: 'Efectivo',
      tarjeta: 'Tarjeta',
      transferencia: 'Transferencia',
      mixto: 'Mixto'
    };
    return map[m] || m;
  }

  // ---------------- NAVEGACIÓN ----------------
  async function navigate(view) {
    state.currentView = view;
    document.querySelectorAll('.sigr-view').forEach((v) => v.classList.remove('active'));
    const target = document.getElementById(`view-${view}`);
    if (target) target.classList.add('active');

    document.querySelectorAll('.sigr-nav-link').forEach((link) => {
      link.classList.toggle('active', link.dataset.view === view);
    });

    document.getElementById('topbarTitle').textContent = VIEW_TITLES[view] || 'SIGR';
    closeMobileSidebar();

    try {
      if (view === 'dashboard') await loadDashboard();
      else if (view === 'pos') await loadPOSView();
      else if (view === 'ventas') await loadVentas();
      else if (view === 'categorias') await loadCategorias();
      else if (view === 'productos') await loadProductosView();
      else if (view === 'clientes') await loadClientes();
      else if (view === 'contabilidad') await loadContabilidad();
      else if (view === 'reportes') await loadReportes();
      else if (view === 'configuracion') await loadConfiguracion();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  }

  function closeMobileSidebar() {
    document.getElementById('sigrSidebar').classList.remove('open');
    document.getElementById('sidebarBackdrop').classList.remove('show');
  }

  // ---------------- DASHBOARD ----------------
  async function loadDashboard() {
    const res = await API.getDashboard();
    const { kpis, ventas_ultimos_7_dias, top_productos, ultimas_ventas, alertas_stock } = res.data;

    document.getElementById('dashVentasHoy').textContent = formatMoney(kpis.ventas_hoy);
    document.getElementById('dashFacturasHoy').textContent = `${kpis.facturas_hoy} facturas hoy`;
    document.getElementById('dashVentasMes').textContent = formatMoney(kpis.ventas_mes);
    document.getElementById('dashTicketMes').textContent = `Ticket prom: ${formatMoney(kpis.ticket_promedio_mes)}`;
    document.getElementById('dashBalanceMes').textContent = formatMoney(kpis.balance_neto_mes);
    document.getElementById('dashEgresosMes').textContent = `Egresos: ${formatMoney(kpis.egresos_mes)}`;
    document.getElementById('dashProductosTotal').textContent = `${kpis.total_productos} prod.`;
    document.getElementById('dashClientesTotal').textContent =
      `${kpis.total_clientes} clientes • ${kpis.productos_bajo_stock} stock bajo`;

    // Gráfica 7 días
    destroyChart('dash7d');
    const ctx = document.getElementById('dashChart7Days');
    state.charts.dash7d = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ventas_ultimos_7_dias.map((d) => d.fecha),
        datasets: [
          {
            label: 'Ventas',
            data: ventas_ultimos_7_dias.map((d) => d.total),
            backgroundColor: 'rgba(234, 88, 12, 0.85)',
            borderRadius: 8,
            maxBarThickness: 44
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true }
        }
      }
    });

    // Top productos
    const topEl = document.getElementById('dashTopProductos');
    if (!top_productos.length) {
      topEl.innerHTML = '<div class="text-muted small py-3 text-center">Aún no hay ventas este mes.</div>';
    } else {
      topEl.innerHTML = top_productos
        .map(
          (p) => `
          <div class="d-flex align-items-center justify-content-between p-2 rounded border bg-light-subtle">
            <div class="d-flex align-items-center gap-2 min-w-0">
              ${
                p.imagen_url
                  ? `<img src="${escapeHtml(p.imagen_url)}" class="prod-thumb" alt="${escapeHtml(p.nombre)}" />`
                  : `<div class="prod-thumb d-flex align-items-center justify-content-center text-muted"><i class="bi bi-image"></i></div>`
              }
              <div class="text-truncate">
                <div class="fw-semibold small text-truncate">${escapeHtml(p.nombre)}</div>
                <small class="text-muted">${p.unidades} uds.</small>
              </div>
            </div>
            <div class="fw-bold small text-success ms-2">${formatMoney(p.ingresos)}</div>
          </div>`
        )
        .join('');
    }

    // Últimas facturas
    const tbody = document.getElementById('dashUltimasVentas');
    if (!ultimas_ventas.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-3">Sin facturas registradas.</td></tr>';
    } else {
      tbody.innerHTML = ultimas_ventas
        .map(
          (v) => `
          <tr>
            <td class="fw-bold">${escapeHtml(v.numero_factura)}</td>
            <td>${escapeHtml(v.cliente_nombre)}</td>
            <td><span class="badge text-bg-light border">${serviceLabel(v.tipo_servicio)}</span></td>
            <td>${methodLabel(v.metodo_pago)}</td>
            <td class="text-end fw-bold">${formatMoney(v.total)}</td>
            <td class="text-end">
              <button class="btn btn-sm btn-outline-primary" onclick="SIGR.openTicket(${v.id})">
                <i class="bi bi-printer"></i>
              </button>
            </td>
          </tr>`
        )
        .join('');
    }

    // Alertas stock
    const stockEl = document.getElementById('dashAlertasStock');
    if (!alertas_stock.length) {
      stockEl.innerHTML = '<div class="text-success small py-3 text-center"><i class="bi bi-check-circle me-1"></i>Todo el inventario está en niveles óptimos.</div>';
    } else {
      stockEl.innerHTML = alertas_stock
        .map(
          (p) => `
          <div class="d-flex align-items-center justify-content-between p-2 rounded border border-danger-subtle bg-danger-subtle bg-opacity-10">
            <div class="text-truncate">
              <div class="fw-semibold small text-truncate">${escapeHtml(p.nombre)}</div>
              <small class="text-muted">${escapeHtml(p.categoria_nombre)}</small>
            </div>
            <span class="badge text-bg-danger">${p.stock} uds.</span>
          </div>`
        )
        .join('');
    }
  }

  // ---------------- PUNTO DE VENTA (POS) ----------------
  async function loadPOSView() {
    const [catRes, prodRes, cliRes] = await Promise.all([
      API.listCategorias({ activo: true }),
      API.listProductos({ disponible: true }),
      API.listClientes()
    ]);
    state.categorias = catRes.data;
    state.productos = prodRes.data;
    state.clientes = cliRes.data;

    document.getElementById('posImpuestoInput').value = state.config.impuesto_porcentaje ?? 8;
    renderPOSCategories();
    renderPOSClients();
    renderPOSProducts();
    renderCart();
  }

  function renderPOSCategories() {
    const container = document.getElementById('posCategoryPills');
    const pills = [
      `<button class="pos-cat-btn ${state.posCategoryFilter === 'all' ? 'active' : ''}" data-cat="all">Todas</button>`,
      ...state.categorias.map(
        (c) =>
          `<button class="pos-cat-btn ${String(state.posCategoryFilter) === String(c.id) ? 'active' : ''}" data-cat="${c.id}">
            <i class="bi ${escapeHtml(c.icono || 'bi-tag')} me-1"></i>${escapeHtml(c.nombre)}
          </button>`
      )
    ];
    container.innerHTML = pills.join('');
    container.querySelectorAll('.pos-cat-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.posCategoryFilter = btn.dataset.cat;
        renderPOSCategories();
        renderPOSProducts();
      });
    });
  }

  function renderPOSClients() {
    const sel = document.getElementById('posClienteSelect');
    const prev = sel.value;
    sel.innerHTML = [
      '<option value="">Consumidor Final</option>',
      ...state.clientes.map(
        (c) =>
          `<option value="${c.id}">${escapeHtml(c.nombre)}${c.documento ? ` (${escapeHtml(c.documento)})` : ''}</option>`
      )
    ].join('');
    if (prev) sel.value = prev;
  }

  function renderPOSProducts() {
    const search = (document.getElementById('posSearchInput').value || '').toLowerCase().trim();
    const filtered = state.productos.filter((p) => {
      const catOk =
        state.posCategoryFilter === 'all' ||
        String(p.categoria_id) === String(state.posCategoryFilter);
      const searchOk =
        !search ||
        p.nombre.toLowerCase().includes(search) ||
        (p.codigo || '').toLowerCase().includes(search) ||
        (p.categoria_nombre || '').toLowerCase().includes(search);
      return catOk && searchOk;
    });

    document.getElementById('posCountLabel').textContent = `${filtered.length} productos disponibles`;
    const grid = document.getElementById('posProductGrid');

    if (!filtered.length) {
      grid.innerHTML =
        '<div class="col-12"><div class="sigr-card p-5 text-center text-muted">No se encontraron productos disponibles.</div></div>';
      return;
    }

    grid.innerHTML = filtered
      .map(
        (p) => `
        <div class="col-6 col-md-4 col-xxl-3">
          <div class="pos-product-card" onclick="SIGR.addToCart(${p.id})">
            <div class="pos-product-img-wrap">
              ${
                p.imagen_url
                  ? `<img src="${escapeHtml(p.imagen_url)}" alt="${escapeHtml(p.nombre)}" class="pos-product-img" loading="lazy" />`
                  : `<div class="pos-product-placeholder"><i class="bi bi-egg-fried"></i></div>`
              }
              <span class="pos-stock-badge ${p.stock <= 5 ? 'bg-danger text-white' : 'bg-dark bg-opacity-75 text-white'}">
                Stock: ${p.stock}
              </span>
              <span class="pos-cat-badge" style="background:${escapeHtml(p.categoria_color || '#ea580c')}">
                ${escapeHtml(p.categoria_nombre)}
              </span>
            </div>
            <div class="p-2 d-flex flex-column flex-grow-1 justify-content-between">
              <div>
                <div class="fw-bold small text-truncate" title="${escapeHtml(p.nombre)}">${escapeHtml(p.nombre)}</div>
                <div class="text-muted" style="font-size:0.72rem">${escapeHtml(p.codigo || 'Sin SKU')}</div>
              </div>
              <div class="d-flex justify-content-between align-items-center mt-2">
                <span class="fw-bold text-success">${formatMoney(p.precio)}</span>
                <span class="btn btn-sm btn-sigr py-0 px-2"><i class="bi bi-plus"></i></span>
              </div>
            </div>
          </div>
        </div>`
      )
      .join('');
  }

  function addToCart(productoId) {
    const prod = state.productos.find((p) => Number(p.id) === Number(productoId));
    if (!prod) return;

    const existing = state.cart.find((item) => Number(item.producto_id) === Number(productoId));
    if (existing) {
      existing.cantidad += 1;
    } else {
      state.cart.push({
        producto_id: prod.id,
        nombre: prod.nombre,
        precio: Number(prod.precio),
        cantidad: 1
      });
    }
    renderCart();
  }

  function updateCartQty(productoId, delta) {
    const item = state.cart.find((i) => Number(i.producto_id) === Number(productoId));
    if (!item) return;
    item.cantidad += delta;
    if (item.cantidad <= 0) {
      state.cart = state.cart.filter((i) => Number(i.producto_id) !== Number(productoId));
    }
    renderCart();
  }

  function removeCartItem(productoId) {
    state.cart = state.cart.filter((i) => Number(i.producto_id) !== Number(productoId));
    renderCart();
  }

  function computeCartTotals() {
    const subtotal = state.cart.reduce((acc, i) => acc + i.precio * i.cantidad, 0);
    const descuento = Math.min(
      subtotal,
      Math.max(0, Number(document.getElementById('posDescuentoInput').value) || 0)
    );
    const base = Math.max(0, subtotal - descuento);
    const impPct = Math.max(0, Number(document.getElementById('posImpuestoInput').value) || 0);
    const impuesto = (base * impPct) / 100;
    const total = base + impuesto;
    const metodo = document.getElementById('posMetodoPago').value;
    const recibidoInput = Number(document.getElementById('posRecibidoInput').value) || 0;
    const recibido = metodo === 'efectivo' ? Math.max(total, recibidoInput || total) : total;
    const cambio = metodo === 'efectivo' && recibidoInput > 0 ? Math.max(0, recibidoInput - total) : 0;
    return { subtotal, descuento, impPct, impuesto, total, metodo, recibido, cambio };
  }

  function renderCart() {
    const container = document.getElementById('posCartItems');
    if (!state.cart.length) {
      container.innerHTML = `
        <div class="text-center text-muted py-4 small">
          <i class="bi bi-basket2 fs-2 d-block mb-1 opacity-50"></i>
          Selecciona productos para iniciar la factura
        </div>`;
    } else {
      container.innerHTML = state.cart
        .map(
          (item) => `
          <div class="pos-cart-row">
            <div class="min-w-0 flex-grow-1">
              <div class="fw-semibold small text-truncate">${escapeHtml(item.nombre)}</div>
              <small class="text-muted">${formatMoney(item.precio)} c/u</small>
            </div>
            <div class="d-flex align-items-center gap-1">
              <button class="btn btn-outline-secondary btn-sm py-0 px-2" onclick="SIGR.updateCartQty(${item.producto_id}, -1)">-</button>
              <span class="fw-bold small px-1">${item.cantidad}</span>
              <button class="btn btn-outline-secondary btn-sm py-0 px-2" onclick="SIGR.updateCartQty(${item.producto_id}, 1)">+</button>
            </div>
            <div class="text-end" style="min-width:74px;">
              <div class="fw-bold small">${formatMoney(item.precio * item.cantidad)}</div>
              <button class="btn btn-link btn-sm text-danger p-0" style="font-size:0.75rem" onclick="SIGR.removeCartItem(${item.producto_id})">Quitar</button>
            </div>
          </div>`
        )
        .join('');
    }
    updateCartTotalsUI();
  }

  function updateCartTotalsUI() {
    const t = computeCartTotals();
    document.getElementById('posSubtotalLabel').textContent = formatMoney(t.subtotal);
    document.getElementById('posImpuestoLabel').textContent = formatMoney(t.impuesto);
    document.getElementById('posTotalLabel').textContent = formatMoney(t.total);
    document.getElementById('posCambioLabel').textContent = formatMoney(t.cambio);

    const isCash = t.metodo === 'efectivo';
    document.getElementById('posEfectivoWrap').classList.toggle('d-none', !isCash);
    document.getElementById('posCambioRow').classList.toggle('d-none', !isCash);
  }

  async function confirmSale() {
    if (!state.cart.length) {
      showToast('Agrega al menos un producto antes de facturar.', 'warning');
      return;
    }

    const t = computeCartTotals();
    const recibidoRaw = Number(document.getElementById('posRecibidoInput').value) || 0;
    if (t.metodo === 'efectivo' && recibidoRaw > 0 && recibidoRaw < t.total) {
      showToast('El monto recibido en efectivo es menor al total a pagar.', 'warning');
      return;
    }

    const btn = document.getElementById('btnConfirmSale');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Generando factura...';

    try {
      const clienteId = document.getElementById('posClienteSelect').value || null;
      const payload = {
        cliente_id: clienteId,
        tipo_servicio: document.getElementById('posTipoServicio').value,
        mesa: document.getElementById('posMesaInput').value,
        descuento: t.descuento,
        impuesto_porcentaje: t.impPct,
        metodo_pago: t.metodo,
        monto_recibido: t.metodo === 'efectivo' ? (recibidoRaw || t.total) : t.total,
        notas: document.getElementById('posNotasInput').value,
        items: state.cart.map((i) => ({
          producto_id: i.producto_id,
          cantidad: i.cantidad
        }))
      };

      const res = await API.createVenta(payload);
      const venta = res.data;

      // Limpiar carrito
      state.cart = [];
      document.getElementById('posDescuentoInput').value = 0;
      document.getElementById('posRecibidoInput').value = '';
      document.getElementById('posMesaInput').value = '';
      document.getElementById('posNotasInput').value = '';
      renderCart();

      showToast(`Factura ${venta.numero_factura} generada correctamente.`);
      renderTicketModal(venta);
      await loadPOSView();
    } catch (err) {
      showToast(err.message, 'danger');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-printer me-1"></i>Facturar y Generar Ticket POS';
    }
  }

  // ---------------- FACTURA / TICKET TÉRMICO POS ----------------
  async function openTicket(ventaId) {
    try {
      const res = await API.getVenta(ventaId);
      renderTicketModal(res.data);
    } catch (err) {
      showToast(err.message, 'danger');
    }
  }

  function renderTicketModal(venta) {
    const rest = venta.restaurante || state.config;
    const area = document.getElementById('ticketPrintArea');
    area.innerHTML = `
      <div class="text-center">
        <div class="fw-bold fs-6">${escapeHtml(rest.nombre || 'SIGR Restaurante')}</div>
        ${rest.nit ? `<div>NIT/RUT: ${escapeHtml(rest.nit)}</div>` : ''}
        ${rest.direccion ? `<div>${escapeHtml(rest.direccion)}</div>` : ''}
        ${rest.telefono ? `<div>Tel: ${escapeHtml(rest.telefono)}</div>` : ''}
      </div>
      <div class="pos-ticket-hr"></div>
      <div><strong>FACTURA POS:</strong> ${escapeHtml(venta.numero_factura)}</div>
      <div><strong>Fecha:</strong> ${formatDateTime(venta.fecha)}</div>
      <div><strong>Cliente:</strong> ${escapeHtml(venta.cliente_nombre)}</div>
      <div><strong>Servicio:</strong> ${serviceLabel(venta.tipo_servicio)}${venta.mesa ? ` (${escapeHtml(venta.mesa)})` : ''}</div>
      ${venta.estado === 'anulada' ? '<div class="text-center fw-bold text-danger mt-1">*** FACTURA ANULADA ***</div>' : ''}
      <div class="pos-ticket-hr"></div>
      <table>
        <thead>
          <tr>
            <th style="text-align:left">Cant. Descripción</th>
            <th style="text-align:right">Total</th>
          </tr>
        </thead>
        <tbody>
          ${(venta.items || [])
            .map(
              (item) => `
              <tr>
                <td>${item.cantidad}x ${escapeHtml(item.producto_nombre)}<br/><small>@ ${formatMoney(item.precio_unitario)}</small></td>
                <td style="text-align:right;vertical-align:top">${formatMoney(item.subtotal)}</td>
              </tr>`
            )
            .join('')}
        </tbody>
      </table>
      <div class="pos-ticket-hr"></div>
      <table>
        <tr><td>Subtotal:</td><td style="text-align:right">${formatMoney(venta.subtotal)}</td></tr>
        ${venta.descuento > 0 ? `<tr><td>Descuento:</td><td style="text-align:right">-${formatMoney(venta.descuento)}</td></tr>` : ''}
        <tr><td>Impuesto (${venta.impuesto_porcentaje}%):</td><td style="text-align:right">${formatMoney(venta.impuesto)}</td></tr>
        <tr style="font-size:15px;font-weight:bold"><td>TOTAL A PAGAR:</td><td style="text-align:right">${formatMoney(venta.total)}</td></tr>
      </table>
      <div class="pos-ticket-hr"></div>
      <div><strong>Método de Pago:</strong> ${methodLabel(venta.metodo_pago)}</div>
      ${
        venta.metodo_pago === 'efectivo'
          ? `<div><strong>Recibido:</strong> ${formatMoney(venta.monto_recibido)} | <strong>Cambio:</strong> ${formatMoney(venta.cambio)}</div>`
          : ''
      }
      ${venta.notas ? `<div class="mt-1"><strong>Notas:</strong> ${escapeHtml(venta.notas)}</div>` : ''}
      <div class="pos-ticket-hr"></div>
      <div class="text-center mt-2">
        <div>${escapeHtml(rest.mensaje_factura || '¡Gracias por su visita!')}</div>
        <small>Sistema POS SIGR</small>
      </div>
    `;
    bootstrap.Modal.getOrCreateInstance(document.getElementById('modalTicketPOS')).show();
  }

  // ---------------- HISTORIAL DE VENTAS ----------------
  async function loadVentas() {
    const res = await API.listVentas({
      from: document.getElementById('ventasFrom').value,
      to: document.getElementById('ventasTo').value,
      estado: document.getElementById('ventasEstado').value,
      search: document.getElementById('ventasSearch').value
    });

    const tbody = document.getElementById('ventasTableBody');
    if (!res.data.length) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">No se encontraron facturas.</td></tr>';
      return;
    }

    tbody.innerHTML = res.data
      .map(
        (v) => `
        <tr>
          <td class="fw-bold">${escapeHtml(v.numero_factura)}</td>
          <td class="small">${formatDateTime(v.fecha)}</td>
          <td>${escapeHtml(v.cliente_nombre)}</td>
          <td><span class="badge text-bg-light border">${serviceLabel(v.tipo_servicio)}${v.mesa ? ` • ${escapeHtml(v.mesa)}` : ''}</span></td>
          <td>${methodLabel(v.metodo_pago)}</td>
          <td>
            <span class="badge ${v.estado === 'pagada' ? 'text-bg-success' : 'text-bg-danger'}">
              ${v.estado === 'pagada' ? 'Pagada' : 'Anulada'}
            </span>
          </td>
          <td class="text-end fw-bold">${formatMoney(v.total)}</td>
          <td class="text-end">
            <button class="btn btn-sm btn-outline-primary me-1" onclick="SIGR.openTicket(${v.id})" title="Ver / Imprimir Ticket">
              <i class="bi bi-printer"></i>
            </button>
            ${
              v.estado === 'pagada'
                ? `<button class="btn btn-sm btn-outline-danger" onclick="SIGR.anularVenta(${v.id}, '${escapeHtml(v.numero_factura)}')" title="Anular Factura">
                    <i class="bi bi-x-circle"></i>
                  </button>`
                : ''
            }
          </td>
        </tr>`
      )
      .join('');
  }

  async function anularVenta(id, numero) {
    const motivo = window.prompt(`¿Deseas anular la factura ${numero}? Escribe el motivo (se repondrá inventario y se reversará contabilidad):`);
    if (motivo === null) return;
    try {
      await API.anularVenta(id, motivo);
      showToast(`Factura ${numero} anulada y reversada en contabilidad.`, 'warning');
      await loadVentas();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  }

  // ---------------- CATEGORÍAS ----------------
  async function loadCategorias() {
    const search = document.getElementById('catSearchInput').value;
    const res = await API.listCategorias({ search });
    state.categorias = res.data;

    const grid = document.getElementById('categoriasGrid');
    if (!state.categorias.length) {
      grid.innerHTML = '<div class="col-12"><div class="sigr-card p-5 text-center text-muted">No hay categorías registradas.</div></div>';
      return;
    }

    grid.innerHTML = state.categorias
      .map(
        (c) => `
        <div class="col-12 col-sm-6 col-lg-4 col-xl-3">
          <div class="sigr-card p-3 h-100 d-flex flex-column justify-content-between">
            <div>
              <div class="d-flex align-items-center justify-content-between mb-2">
                <div class="d-flex align-items-center gap-2">
                  <div class="rounded-3 d-flex align-items-center justify-content-center text-white" style="width:40px;height:40px;background:${escapeHtml(c.color || '#ea580c')}">
                    <i class="bi ${escapeHtml(c.icono || 'bi-tag')} fs-5"></i>
                  </div>
                  <div>
                    <div class="fw-bold">${escapeHtml(c.nombre)}</div>
                    <span class="badge ${c.activo ? 'text-bg-success' : 'text-bg-secondary'}">${c.activo ? 'Activa' : 'Inactiva'}</span>
                  </div>
                </div>
                <span class="badge text-bg-light border">${c.total_productos} prod.</span>
              </div>
              <p class="small text-muted mb-3">${escapeHtml(c.descripcion || 'Sin descripción')}</p>
            </div>
            <div class="d-flex gap-2 justify-content-end border-top pt-2">
              <button class="btn btn-sm btn-outline-primary" onclick="SIGR.editCategoria(${c.id})">
                <i class="bi bi-pencil me-1"></i>Editar
              </button>
              <button class="btn btn-sm btn-outline-danger" onclick="SIGR.deleteCategoria(${c.id}, '${escapeHtml(c.nombre)}')">
                <i class="bi bi-trash"></i>
              </button>
            </div>
          </div>
        </div>`
      )
      .join('');
  }

  function openCategoriaModal(cat = null) {
    document.getElementById('modalCategoriaTitle').textContent = cat ? 'Editar Categoría' : 'Nueva Categoría';
    document.getElementById('catId').value = cat ? cat.id : '';
    document.getElementById('catNombre').value = cat ? cat.nombre : '';
    document.getElementById('catDescripcion').value = cat ? cat.descripcion || '' : '';
    document.getElementById('catColor').value = cat ? cat.color || '#ea580c' : '#ea580c';
    document.getElementById('catIcono').value = cat ? cat.icono || 'bi-tag' : 'bi-tag';
    document.getElementById('catActivo').checked = cat ? Boolean(cat.activo) : true;
    bootstrap.Modal.getOrCreateInstance(document.getElementById('modalCategoria')).show();
  }

  function editCategoria(id) {
    const cat = state.categorias.find((c) => Number(c.id) === Number(id));
    if (cat) openCategoriaModal(cat);
  }

  async function deleteCategoria(id, nombre) {
    if (!window.confirm(`¿Eliminar la categoría "${nombre}"?`)) return;
    try {
      await API.deleteCategoria(id);
      showToast('Categoría eliminada.');
      await loadCategorias();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  }

  // ---------------- PRODUCTOS (CON IMÁGENES) ----------------
  async function loadProductosView() {
    const [catRes, prodRes] = await Promise.all([
      API.listCategorias(),
      API.listProductos({
        search: document.getElementById('prodSearchInput').value,
        categoria_id: document.getElementById('prodFilterCat').value
      })
    ]);
    state.categorias = catRes.data;
    state.productos = prodRes.data;

    const filterSel = document.getElementById('prodFilterCat');
    const prevVal = filterSel.value;
    filterSel.innerHTML = [
      '<option value="">Todas las categorías</option>',
      ...state.categorias.map((c) => `<option value="${c.id}">${escapeHtml(c.nombre)}</option>`)
    ].join('');
    if (prevVal) filterSel.value = prevVal;

    const tbody = document.getElementById('productosTableBody');
    if (!state.productos.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-4">No hay productos registrados.</td></tr>';
      return;
    }

    tbody.innerHTML = state.productos
      .map((p) => {
        const margen = p.precio > 0 ? Math.round(((p.precio - p.costo) / p.precio) * 100) : 0;
        return `
        <tr>
          <td>
            <div class="d-flex align-items-center gap-2">
              ${
                p.imagen_url
                  ? `<img src="${escapeHtml(p.imagen_url)}" class="prod-thumb" alt="${escapeHtml(p.nombre)}" />`
                  : `<div class="prod-thumb d-flex align-items-center justify-content-center text-muted"><i class="bi bi-image"></i></div>`
              }
              <div>
                <div class="fw-bold">${escapeHtml(p.nombre)}</div>
                <small class="text-muted">${escapeHtml(p.codigo || 'Sin SKU')} ${p.descripcion ? `• ${escapeHtml(p.descripcion.slice(0, 45))}` : ''}</small>
              </div>
            </div>
          </td>
          <td>
            <span class="badge" style="background:${escapeHtml(p.categoria_color || '#6c757d')}">
              ${escapeHtml(p.categoria_nombre)}
            </span>
          </td>
          <td class="text-end fw-bold">${formatMoney(p.precio)}</td>
          <td class="text-end small text-muted">${formatMoney(p.costo)}<br/><span class="text-success">Margen ${margen}%</span></td>
          <td class="text-center">
            <span class="badge ${p.stock <= 5 ? 'text-bg-danger' : 'text-bg-light border'}">${p.stock}</span>
          </td>
          <td class="text-center">
            <span class="badge ${p.disponible ? 'text-bg-success' : 'text-bg-secondary'}">
              ${p.disponible ? 'Disponible' : 'Oculto'}
            </span>
          </td>
          <td class="text-end">
            <button class="btn btn-sm btn-outline-primary me-1" onclick="SIGR.editProducto(${p.id})"><i class="bi bi-pencil"></i></button>
            <button class="btn btn-sm btn-outline-danger" onclick="SIGR.deleteProducto(${p.id}, '${escapeHtml(p.nombre)}')"><i class="bi bi-trash"></i></button>
          </td>
        </tr>`;
      })
      .join('');
  }

  function setProductPreview(url) {
    const img = document.getElementById('prodImagePreview');
    const empty = document.getElementById('prodImageEmpty');
    const removeBtn = document.getElementById('btnRemoveProdImg');
    if (url) {
      img.src = url;
      img.classList.remove('d-none');
      empty.classList.add('d-none');
      removeBtn.classList.remove('d-none');
    } else {
      img.src = '';
      img.classList.add('d-none');
      empty.classList.remove('d-none');
      removeBtn.classList.add('d-none');
    }
  }

  function openProductoModal(prod = null) {
    state.removeProductImageFlag = false;
    document.getElementById('modalProductoTitle').textContent = prod ? 'Editar Producto' : 'Nuevo Producto';
    document.getElementById('prodId').value = prod ? prod.id : '';
    document.getElementById('prodCodigo').value = prod ? prod.codigo || '' : '';
    document.getElementById('prodNombre').value = prod ? prod.nombre : '';
    document.getElementById('prodPrecio').value = prod ? prod.precio : '';
    document.getElementById('prodCosto').value = prod ? prod.costo : 0;
    document.getElementById('prodStock').value = prod ? prod.stock : 20;
    document.getElementById('prodDescripcion').value = prod ? prod.descripcion || '' : '';
    document.getElementById('prodDisponible').checked = prod ? Boolean(prod.disponible) : true;
    document.getElementById('prodImagenFile').value = '';
    document.getElementById('prodImagenUrl').value =
      prod && prod.imagen_url && !prod.imagen_url.startsWith('data:') ? prod.imagen_url : '';

    const catSel = document.getElementById('prodCategoria');
    catSel.innerHTML = [
      '<option value="">Sin categoría</option>',
      ...state.categorias.map((c) => `<option value="${c.id}">${escapeHtml(c.nombre)}</option>`)
    ].join('');
    catSel.value = prod && prod.categoria_id ? String(prod.categoria_id) : '';

    setProductPreview(prod ? prod.imagen_url : '');
    bootstrap.Modal.getOrCreateInstance(document.getElementById('modalProducto')).show();
  }

  function editProducto(id) {
    const prod = state.productos.find((p) => Number(p.id) === Number(id));
    if (prod) openProductoModal(prod);
  }

  async function deleteProducto(id, nombre) {
    if (!window.confirm(`¿Eliminar el producto "${nombre}"?`)) return;
    try {
      await API.deleteProducto(id);
      showToast('Producto eliminado.');
      await loadProductosView();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  }

  // ---------------- CLIENTES ----------------
  async function loadClientes() {
    const search = document.getElementById('cliSearchInput').value;
    const res = await API.listClientes({ search });
    state.clientes = res.data;

    const tbody = document.getElementById('clientesTableBody');
    if (!state.clientes.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-4">No hay clientes registrados.</td></tr>';
      return;
    }

    tbody.innerHTML = state.clientes
      .map(
        (c) => `
        <tr>
          <td class="fw-bold">${escapeHtml(c.nombre)}</td>
          <td>${escapeHtml(c.documento || '—')}</td>
          <td class="small">
            ${c.telefono ? `<div><i class="bi bi-telephone me-1"></i>${escapeHtml(c.telefono)}</div>` : ''}
            ${c.email ? `<div class="text-muted"><i class="bi bi-envelope me-1"></i>${escapeHtml(c.email)}</div>` : ''}
          </td>
          <td class="small">${escapeHtml(c.direccion || '—')}</td>
          <td class="text-center"><span class="badge text-bg-light border">${c.total_compras}</span></td>
          <td class="text-end fw-bold text-success">${formatMoney(c.total_gastado)}</td>
          <td class="text-end">
            <button class="btn btn-sm btn-outline-primary me-1" onclick="SIGR.editCliente(${c.id})"><i class="bi bi-pencil"></i></button>
            <button class="btn btn-sm btn-outline-danger" onclick="SIGR.deleteCliente(${c.id}, '${escapeHtml(c.nombre)}')"><i class="bi bi-trash"></i></button>
          </td>
        </tr>`
      )
      .join('');
  }

  function openClienteModal(cli = null) {
    document.getElementById('modalClienteTitle').textContent = cli ? 'Editar Cliente' : 'Nuevo Cliente';
    document.getElementById('cliId').value = cli ? cli.id : '';
    document.getElementById('cliNombre').value = cli ? cli.nombre : '';
    document.getElementById('cliDocumento').value = cli ? cli.documento || '' : '';
    document.getElementById('cliTelefono').value = cli ? cli.telefono || '' : '';
    document.getElementById('cliEmail').value = cli ? cli.email || '' : '';
    document.getElementById('cliDireccion').value = cli ? cli.direccion || '' : '';
    document.getElementById('cliNotas').value = cli ? cli.notas || '' : '';
    bootstrap.Modal.getOrCreateInstance(document.getElementById('modalCliente')).show();
  }

  function editCliente(id) {
    const cli = state.clientes.find((c) => Number(c.id) === Number(id));
    if (cli) openClienteModal(cli);
  }

  async function deleteCliente(id, nombre) {
    if (!window.confirm(`¿Eliminar al cliente "${nombre}"?`)) return;
    try {
      await API.deleteCliente(id);
      showToast('Cliente eliminado.');
      await loadClientes();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  }

  // ---------------- CONTABILIDAD ----------------
  async function loadContabilidad() {
    const params = {
      from: document.getElementById('contFrom').value,
      to: document.getElementById('contTo').value,
      tipo: document.getElementById('contTipo').value,
      search: document.getElementById('contSearch').value
    };

    const [resumenRes, movsRes] = await Promise.all([
      API.getContabilidadResumen({ from: params.from, to: params.to }),
      API.listMovimientos(params)
    ]);

    const r = resumenRes.data;
    document.getElementById('contIngresos').textContent = formatMoney(r.total_ingresos);
    document.getElementById('contEgresos').textContent = formatMoney(r.total_egresos);
    const balEl = document.getElementById('contBalance');
    balEl.textContent = formatMoney(r.balance_neto);
    balEl.className = `kpi-value ${r.balance_neto >= 0 ? 'text-primary' : 'text-danger'}`;
    document.getElementById('contUtilidadBruta').textContent = formatMoney(r.utilidad_bruta_ventas);
    document.getElementById('contCostoVentas').textContent = `Costo insumos: ${formatMoney(r.costo_mercancia_vendida)}`;

    const tbody = document.getElementById('contTableBody');
    if (!movsRes.data.length) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">No hay movimientos contables en este filtro.</td></tr>';
      return;
    }

    tbody.innerHTML = movsRes.data
      .map(
        (m) => `
        <tr>
          <td class="small">${formatDateTime(m.fecha)}</td>
          <td>
            <span class="badge ${m.tipo === 'ingreso' ? 'text-bg-success' : 'text-bg-danger'}">
              ${m.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'}
            </span>
          </td>
          <td>${escapeHtml(m.categoria)}</td>
          <td>
            <div class="fw-semibold small">${escapeHtml(m.concepto)}</div>
            ${m.notas ? `<small class="text-muted">${escapeHtml(m.notas)}</small>` : ''}
          </td>
          <td class="small">
            ${escapeHtml(m.referencia || '—')}
            ${m.venta_id ? '<span class="badge text-bg-light border ms-1">Auto POS</span>' : ''}
          </td>
          <td class="small">${methodLabel(m.metodo_pago)}</td>
          <td class="text-end fw-bold ${m.tipo === 'ingreso' ? 'text-success' : 'text-danger'}">
            ${m.tipo === 'ingreso' ? '+' : '-'}${formatMoney(m.monto)}
          </td>
          <td class="text-end">
            ${
              m.venta_id
                ? `<button class="btn btn-sm btn-outline-secondary" onclick="SIGR.openTicket(${m.venta_id})" title="Ver Factura POS"><i class="bi bi-receipt"></i></button>`
                : `<button class="btn btn-sm btn-outline-danger" onclick="SIGR.deleteMovimiento(${m.id})" title="Eliminar"><i class="bi bi-trash"></i></button>`
            }
          </td>
        </tr>`
      )
      .join('');
  }

  function openMovimientoModal() {
    document.getElementById('movId').value = '';
    document.getElementById('movTipo').value = 'egreso';
    document.getElementById('movCategoria').value = '';
    document.getElementById('movConcepto').value = '';
    document.getElementById('movMonto').value = '';
    document.getElementById('movMetodo').value = 'efectivo';
    document.getElementById('movReferencia').value = '';
    document.getElementById('movFecha').value = todayYMD();
    document.getElementById('movNotas').value = '';
    bootstrap.Modal.getOrCreateInstance(document.getElementById('modalMovimiento')).show();
  }

  async function deleteMovimiento(id) {
    if (!window.confirm('¿Eliminar este movimiento contable manual?')) return;
    try {
      await API.deleteMovimiento(id);
      showToast('Movimiento eliminado.');
      await loadContabilidad();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  }

  // ---------------- REPORTES DE VENTAS ----------------
  function applyReportPreset(preset) {
    const today = new Date();
    const toStr = todayYMD();
    let fromStr = '';
    if (preset === 'today') {
      fromStr = toStr;
    } else if (preset === '7d') {
      const d = new Date(today.getTime() - 6 * 86400000);
      fromStr = d.toISOString().slice(0, 10);
    } else if (preset === 'month') {
      fromStr = `${toStr.slice(0, 7)}-01`;
    } else {
      fromStr = '';
    }
    document.getElementById('repFrom').value = fromStr;
    document.getElementById('repTo').value = preset === 'all' ? '' : toStr;
    loadReportes();
  }

  async function loadReportes() {
    const from = document.getElementById('repFrom').value;
    const to = document.getElementById('repTo').value;
    const res = await API.getSalesReport({ from, to });
    const rep = res.data;

    document.getElementById('repTotalVentas').textContent = formatMoney(rep.resumen.total_ventas);
    document.getElementById('repTotalFacturas').textContent = `${rep.resumen.total_facturas} facturas pagadas`;
    document.getElementById('repTicketProm').textContent = formatMoney(rep.resumen.ticket_promedio);
    document.getElementById('repUnidades').textContent = `${rep.resumen.total_unidades} unidades vendidas`;
    document.getElementById('repUtilidad').textContent = formatMoney(rep.resumen.utilidad_bruta);
    document.getElementById('repMargen').textContent = `Margen bruto: ${rep.resumen.margen_bruto}%`;
    document.getElementById('repImpuestos').textContent = formatMoney(rep.resumen.total_impuestos);
    document.getElementById('repDescuentos').textContent = `Descuentos: ${formatMoney(rep.resumen.total_descuentos)}`;

    // 1. Gráfica diaria
    destroyChart('repDaily');
    state.charts.repDaily = new Chart(document.getElementById('repChartDaily'), {
      type: 'line',
      data: {
        labels: rep.ventas_por_dia.map((d) => d.fecha),
        datasets: [
          {
            label: 'Total Vendido',
            data: rep.ventas_por_dia.map((d) => d.total),
            borderColor: '#ea580c',
            backgroundColor: 'rgba(234, 88, 12, 0.14)',
            fill: true,
            tension: 0.35,
            pointRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true } }
      }
    });

    // 2. Gráfica por categoría
    destroyChart('repCat');
    state.charts.repCat = new Chart(document.getElementById('repChartCategories'), {
      type: 'doughnut',
      data: {
        labels: rep.ventas_por_categoria.map((c) => c.categoria),
        datasets: [
          {
            data: rep.ventas_por_categoria.map((c) => c.total),
            backgroundColor: ['#ea580c', '#dc2626', '#0284c7', '#16a34a', '#9333ea', '#f59e0b', '#0d9488']
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' } }
      }
    });

    // 3. Gráfica por método de pago
    destroyChart('repMet');
    state.charts.repMet = new Chart(document.getElementById('repChartMethods'), {
      type: 'bar',
      data: {
        labels: rep.ventas_por_metodo.map((m) => methodLabel(m.metodo)),
        datasets: [
          {
            label: 'Total',
            data: rep.ventas_por_metodo.map((m) => m.total),
            backgroundColor: ['#16a34a', '#2563eb', '#9333ea', '#f59e0b'],
            borderRadius: 8
          }
        ]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { x: { beginAtZero: true } }
      }
    });

    // 4. Tabla top productos
    const tbody = document.getElementById('repTopProductsBody');
    if (!rep.top_productos.length) {
      tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-4">Sin datos en el período seleccionado.</td></tr>';
    } else {
      tbody.innerHTML = rep.top_productos
        .map(
          (p) => `
          <tr>
            <td>
              <div class="d-flex align-items-center gap-2">
                ${
                  p.imagen_url
                    ? `<img src="${escapeHtml(p.imagen_url)}" class="prod-thumb" alt="${escapeHtml(p.nombre)}" />`
                    : `<div class="prod-thumb d-flex align-items-center justify-content-center text-muted"><i class="bi bi-image"></i></div>`
                }
                <div>
                  <div class="fw-semibold small">${escapeHtml(p.nombre)}</div>
                  <small class="text-muted">${escapeHtml(p.categoria)}</small>
                </div>
              </div>
            </td>
            <td class="text-center fw-bold">${p.unidades}</td>
            <td class="text-end fw-semibold">${formatMoney(p.ingresos)}</td>
            <td class="text-end fw-bold text-success">${formatMoney(p.utilidad)}</td>
          </tr>`
        )
        .join('');
    }
  }

  // ---------------- CONFIGURACIÓN ----------------
  async function loadConfiguracion() {
    const res = await API.getConfig();
    state.config = res.data;
    document.getElementById('cfgNombre').value = state.config.nombre || '';
    document.getElementById('cfgNit').value = state.config.nit || '';
    document.getElementById('cfgDireccion').value = state.config.direccion || '';
    document.getElementById('cfgTelefono').value = state.config.telefono || '';
    document.getElementById('cfgImpuesto').value = state.config.impuesto_porcentaje ?? 8;
    document.getElementById('cfgMoneda').value = state.config.moneda || 'COP';
    document.getElementById('cfgPrefijo').value = state.config.prefijo_factura || 'POS';
    document.getElementById('cfgMensaje').value = state.config.mensaje_factura || '';
    document.getElementById('cfgNuevoUsuario').value = state.user?.usuario || '';
  }

  // ---------------- AUTENTICACIÓN ----------------
  function showLogin(message = '') {
    state.user = null;
    document.getElementById('appShell').classList.add('d-none');
    document.getElementById('loginScreen').classList.remove('d-none');
    const error = document.getElementById('loginError');
    error.textContent = message;
    error.classList.toggle('d-none', !message);
    document.getElementById('loginPassword').value = '';
    setTimeout(() => document.getElementById('loginUsuario').focus(), 0);
  }

  async function showApplication(user) {
    API.setUnauthorizedHandler(() => showLogin('Tu sesión venció. Ingresa nuevamente.'));
    state.user = user;
    document.getElementById('currentUserName').textContent = user.usuario;
    document.getElementById('cfgNuevoUsuario').value = user.usuario;
    document.getElementById('loginScreen').classList.add('d-none');
    document.getElementById('appShell').classList.remove('d-none');
    document.getElementById('loginError').classList.add('d-none');

    try {
      const [health, cfg] = await Promise.all([API.health(), API.getConfig()]);
      state.config = cfg.data;
      const badge = document.getElementById('dbStatusBadge');
      if (health.supabaseConfigured) {
        badge.className = 'badge rounded-pill text-bg-success px-3 py-2';
        badge.innerHTML = '<i class="bi bi-database-check me-1"></i>Supabase Conectado';
      } else {
        badge.className = 'badge rounded-pill text-bg-warning px-3 py-2';
        badge.innerHTML = '<i class="bi bi-hdd me-1"></i>Modo Demo Local';
        badge.title = 'Configura Supabase para persistir los datos en la nube';
      }
      await navigate('dashboard');
      if (user.debe_cambiar_password) {
        showToast('Por seguridad, cambia el usuario o la contraseña inicial en Configuración.', 'warning');
      }
    } catch (err) {
      if (err.status !== 401) showToast(err.message, 'danger');
    }
  }

  // ---------------- EVENTOS & ARRANQUE ----------------
  function bindEvents() {
    // Navegación sidebar
    document.querySelectorAll('.sigr-nav-link').forEach((link) => {
      link.addEventListener('click', () => navigate(link.dataset.view));
    });

    document.getElementById('btnQuickPOS').addEventListener('click', () => navigate('pos'));

    // Acceso, cierre de sesión y credenciales
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('btnLogin');
      const error = document.getElementById('loginError');
      error.classList.add('d-none');
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Verificando...';
      try {
        const res = await API.login({
          usuario: document.getElementById('loginUsuario').value.trim(),
          password: document.getElementById('loginPassword').value
        });
        document.getElementById('loginForm').reset();
        await showApplication(res.data);
      } catch (err) {
        error.textContent = err.message;
        error.classList.remove('d-none');
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-box-arrow-in-right me-1"></i>Iniciar sesión';
      }
    });

    document.getElementById('btnLogout').addEventListener('click', async () => {
      try { await API.logout(); } catch { /* La interfaz se cierra igualmente. */ }
      showLogin('Sesión cerrada correctamente.');
    });

    document.getElementById('credentialsForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const nueva = document.getElementById('cfgNuevaPassword').value;
      const confirmacion = document.getElementById('cfgConfirmarPassword').value;
      if (nueva !== confirmacion) {
        showToast('La confirmación de contraseña no coincide.', 'warning');
        return;
      }
      const btn = document.getElementById('btnSaveCredentials');
      btn.disabled = true;
      try {
        const res = await API.updateCredentials({
          password_actual: document.getElementById('cfgPasswordActual').value,
          nuevo_usuario: document.getElementById('cfgNuevoUsuario').value.trim(),
          nueva_password: nueva,
          confirmar_password: confirmacion
        });
        state.user = res.data;
        document.getElementById('currentUserName').textContent = res.data.usuario;
        document.getElementById('cfgPasswordActual').value = '';
        document.getElementById('cfgNuevaPassword').value = '';
        document.getElementById('cfgConfirmarPassword').value = '';
        showToast('Credenciales actualizadas. Tu sesión sigue activa.');
      } catch (err) {
        if (err.status !== 401) showToast(err.message, 'danger');
      } finally {
        btn.disabled = false;
      }
    });

    // Sidebar móvil
    document.getElementById('btnToggleSidebar').addEventListener('click', () => {
      document.getElementById('sigrSidebar').classList.toggle('open');
      document.getElementById('sidebarBackdrop').classList.toggle('show');
    });
    document.getElementById('sidebarBackdrop').addEventListener('click', closeMobileSidebar);

    // POS eventos
    document.getElementById('posSearchInput').addEventListener('input', renderPOSProducts);
    document.getElementById('btnClearCart').addEventListener('click', () => {
      state.cart = [];
      renderCart();
    });
    ['posDescuentoInput', 'posImpuestoInput', 'posMetodoPago', 'posRecibidoInput'].forEach((id) => {
      document.getElementById(id).addEventListener('input', updateCartTotalsUI);
      document.getElementById(id).addEventListener('change', updateCartTotalsUI);
    });
    document.getElementById('btnConfirmSale').addEventListener('click', confirmSale);
    document.getElementById('btnPosQuickClient').addEventListener('click', () => openClienteModal());

    // Imprimir ticket POS
    document.getElementById('btnPrintTicketPOS').addEventListener('click', () => {
      document.body.classList.add('printing-ticket');
      window.print();
      setTimeout(() => document.body.classList.remove('printing-ticket'), 500);
    });

    // Historial ventas
    document.getElementById('btnFilterVentas').addEventListener('click', loadVentas);
    document.getElementById('btnResetVentas').addEventListener('click', () => {
      document.getElementById('ventasFrom').value = '';
      document.getElementById('ventasTo').value = '';
      document.getElementById('ventasEstado').value = '';
      document.getElementById('ventasSearch').value = '';
      loadVentas();
    });

    // Categorías
    document.getElementById('catSearchInput').addEventListener('input', loadCategorias);
    document.getElementById('btnNewCategoria').addEventListener('click', () => openCategoriaModal());
    document.getElementById('formCategoria').addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('catId').value;
      const payload = {
        nombre: document.getElementById('catNombre').value,
        descripcion: document.getElementById('catDescripcion').value,
        color: document.getElementById('catColor').value,
        icono: document.getElementById('catIcono').value,
        activo: document.getElementById('catActivo').checked
      };
      try {
        if (id) await API.updateCategoria(id, payload);
        else await API.createCategoria(payload);
        bootstrap.Modal.getInstance(document.getElementById('modalCategoria')).hide();
        showToast(id ? 'Categoría actualizada.' : 'Categoría creada.');
        await loadCategorias();
      } catch (err) {
        showToast(err.message, 'danger');
      }
    });

    // Productos (con imagen)
    document.getElementById('prodSearchInput').addEventListener('input', loadProductosView);
    document.getElementById('prodFilterCat').addEventListener('change', loadProductosView);
    document.getElementById('btnNewProducto').addEventListener('click', () => openProductoModal());

    document.getElementById('prodImagenFile').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      state.removeProductImageFlag = false;
      const reader = new FileReader();
      reader.onload = () => setProductPreview(reader.result);
      reader.readAsDataURL(file);
    });

    document.getElementById('prodImagenUrl').addEventListener('input', (e) => {
      const url = e.target.value.trim();
      if (url) {
        state.removeProductImageFlag = false;
        setProductPreview(url);
      }
    });

    document.getElementById('btnRemoveProdImg').addEventListener('click', () => {
      state.removeProductImageFlag = true;
      document.getElementById('prodImagenFile').value = '';
      document.getElementById('prodImagenUrl').value = '';
      setProductPreview('');
    });

    document.getElementById('formProducto').addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('prodId').value;
      const fd = new FormData();
      fd.append('codigo', document.getElementById('prodCodigo').value);
      fd.append('nombre', document.getElementById('prodNombre').value);
      fd.append('categoria_id', document.getElementById('prodCategoria').value);
      fd.append('precio', document.getElementById('prodPrecio').value);
      fd.append('costo', document.getElementById('prodCosto').value);
      fd.append('stock', document.getElementById('prodStock').value);
      fd.append('descripcion', document.getElementById('prodDescripcion').value);
      fd.append('disponible', document.getElementById('prodDisponible').checked ? 'true' : 'false');

      const fileInput = document.getElementById('prodImagenFile');
      const urlInput = document.getElementById('prodImagenUrl').value.trim();
      if (fileInput.files[0]) {
        fd.append('imagen', fileInput.files[0]);
      } else if (state.removeProductImageFlag) {
        fd.append('eliminar_imagen', 'true');
      } else if (urlInput) {
        fd.append('imagen_url', urlInput);
      }

      const btn = document.getElementById('btnSaveProducto');
      btn.disabled = true;
      try {
        if (id) await API.updateProducto(id, fd);
        else await API.createProducto(fd);
        bootstrap.Modal.getInstance(document.getElementById('modalProducto')).hide();
        showToast(id ? 'Producto actualizado.' : 'Producto creado con éxito.');
        await loadProductosView();
      } catch (err) {
        showToast(err.message, 'danger');
      } finally {
        btn.disabled = false;
      }
    });

    // Clientes
    document.getElementById('cliSearchInput').addEventListener('input', loadClientes);
    document.getElementById('btnNewCliente').addEventListener('click', () => openClienteModal());
    document.getElementById('formCliente').addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('cliId').value;
      const payload = {
        nombre: document.getElementById('cliNombre').value,
        documento: document.getElementById('cliDocumento').value,
        telefono: document.getElementById('cliTelefono').value,
        email: document.getElementById('cliEmail').value,
        direccion: document.getElementById('cliDireccion').value,
        notas: document.getElementById('cliNotas').value
      };
      try {
        const res = id
          ? await API.updateCliente(id, payload)
          : await API.createCliente(payload);
        bootstrap.Modal.getInstance(document.getElementById('modalCliente')).hide();
        showToast(id ? 'Cliente actualizado.' : 'Cliente registrado.');
        if (state.currentView === 'pos') {
          await loadPOSView();
          if (res.data?.id) document.getElementById('posClienteSelect').value = String(res.data.id);
        } else {
          await loadClientes();
        }
      } catch (err) {
        showToast(err.message, 'danger');
      }
    });

    // Contabilidad
    document.getElementById('btnFilterCont').addEventListener('click', loadContabilidad);
    document.getElementById('btnNewMovimiento').addEventListener('click', openMovimientoModal);
    document.getElementById('formMovimiento').addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        tipo: document.getElementById('movTipo').value,
        categoria: document.getElementById('movCategoria').value,
        concepto: document.getElementById('movConcepto').value,
        monto: document.getElementById('movMonto').value,
        metodo_pago: document.getElementById('movMetodo').value,
        referencia: document.getElementById('movReferencia').value,
        fecha: document.getElementById('movFecha').value,
        notas: document.getElementById('movNotas').value
      };
      try {
        await API.createMovimiento(payload);
        bootstrap.Modal.getInstance(document.getElementById('modalMovimiento')).hide();
        showToast('Movimiento contable registrado.');
        await loadContabilidad();
      } catch (err) {
        showToast(err.message, 'danger');
      }
    });

    // Reportes
    document.querySelectorAll('.rep-preset').forEach((btn) => {
      btn.addEventListener('click', () => applyReportPreset(btn.dataset.preset));
    });
    document.getElementById('btnGenerateReport').addEventListener('click', loadReportes);
    document.getElementById('btnExportCsv').addEventListener('click', () => {
      const url = API.getSalesCsvUrl({
        from: document.getElementById('repFrom').value,
        to: document.getElementById('repTo').value
      });
      window.open(url, '_blank');
    });
    document.getElementById('btnPrintReport').addEventListener('click', () => {
      document.body.classList.add('printing-report');
      window.print();
      setTimeout(() => document.body.classList.remove('printing-report'), 500);
    });

    // Configuración
    document.getElementById('configForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const payload = Object.fromEntries(fd.entries());
      try {
        const res = await API.updateConfig(payload);
        state.config = res.data;
        showToast('Configuración del restaurante guardada.');
      } catch (err) {
        showToast(err.message, 'danger');
      }
    });
  }

  function startClock() {
    const update = () => {
      document.getElementById('topbarClock').textContent = new Date().toLocaleString('es-CO', {
        weekday: 'long',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };
    update();
    setInterval(update, 30000);
  }

  async function init() {
    bindEvents();
    startClock();
    try {
      const session = await API.me();
      await showApplication(session.data);
    } catch (err) {
      if (err.status === 401) showLogin();
      else showLogin('No se pudo conectar con el servidor. Inténtalo de nuevo.');
    }
  }

  document.addEventListener('DOMContentLoaded', init);

  return {
    navigate,
    addToCart,
    updateCartQty,
    removeCartItem,
    openTicket,
    anularVenta,
    editCategoria,
    deleteCategoria,
    editProducto,
    deleteProducto,
    editCliente,
    deleteCliente,
    deleteMovimiento
  };
})();
