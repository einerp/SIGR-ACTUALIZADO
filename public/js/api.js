const API = (() => {
  let onUnauthorized = null;

  async function request(url, options = {}) {
    const method = (options.method || 'GET').toUpperCase();
    const headers = new Headers(options.headers || {});
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      headers.set('X-Requested-With', 'XMLHttpRequest');
    }

    const res = await fetch(url, { ...options, headers, credentials: 'same-origin' });
    const contentType = res.headers.get('content-type') || '';
    const body = contentType.includes('application/json')
      ? await res.json()
      : await res.text();

    if (!res.ok) {
      if (res.status === 401 && !url.includes('/api/auth/login') && typeof onUnauthorized === 'function') {
        onUnauthorized();
      }
      const msg =
        (body && typeof body === 'object' && body.error) ||
        `Error HTTP ${res.status}`;
      const error = new Error(msg);
      error.status = res.status;
      throw error;
    }
    return body;
  }

  function qs(params = {}) {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && String(v).trim() !== '') {
        sp.append(k, String(v).trim());
      }
    }
    const str = sp.toString();
    return str ? `?${str}` : '';
  }

  return {
    setUnauthorizedHandler: (handler) => { onUnauthorized = handler; },
    login: (data) => request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }),
    me: () => request('/api/auth/me'),
    logout: () => request('/api/auth/logout', { method: 'POST' }),
    updateCredentials: (data) => request('/api/auth/credentials', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }),
    health: () => request('/api/health'),
    getConfig: () => request('/api/config'),
    updateConfig: (data) =>
      request('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }),
    getDashboard: () => request('/api/dashboard'),

    // Categorías
    listCategorias: (params) => request(`/api/categorias${qs(params)}`),
    createCategoria: (data) =>
      request('/api/categorias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }),
    updateCategoria: (id, data) =>
      request(`/api/categorias/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }),
    deleteCategoria: (id) =>
      request(`/api/categorias/${id}`, { method: 'DELETE' }),

    // Productos (multipart/form-data para imágenes)
    listProductos: (params) => request(`/api/productos${qs(params)}`),
    createProducto: (formData) =>
      request('/api/productos', { method: 'POST', body: formData }),
    updateProducto: (id, formData) =>
      request(`/api/productos/${id}`, { method: 'PUT', body: formData }),
    deleteProducto: (id) =>
      request(`/api/productos/${id}`, { method: 'DELETE' }),

    // Clientes
    listClientes: (params) => request(`/api/clientes${qs(params)}`),
    getCliente: (id) => request(`/api/clientes/${id}`),
    createCliente: (data) =>
      request('/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }),
    updateCliente: (id, data) =>
      request(`/api/clientes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }),
    deleteCliente: (id) =>
      request(`/api/clientes/${id}`, { method: 'DELETE' }),

    // Ventas POS
    listVentas: (params) => request(`/api/ventas${qs(params)}`),
    getVenta: (id) => request(`/api/ventas/${id}`),
    createVenta: (data) =>
      request('/api/ventas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }),
    anularVenta: (id, motivo) =>
      request(`/api/ventas/${id}/anular`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivo })
      }),

    // Contabilidad
    listMovimientos: (params) => request(`/api/contabilidad${qs(params)}`),
    getContabilidadResumen: (params) =>
      request(`/api/contabilidad/resumen${qs(params)}`),
    createMovimiento: (data) =>
      request('/api/contabilidad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }),
    updateMovimiento: (id, data) =>
      request(`/api/contabilidad/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }),
    deleteMovimiento: (id) =>
      request(`/api/contabilidad/${id}`, { method: 'DELETE' }),

    // Reportes
    getSalesReport: (params) => request(`/api/reportes/ventas${qs(params)}`),
    getSalesCsvUrl: (params) => `/api/reportes/ventas/csv${qs(params)}`
  };
})();
