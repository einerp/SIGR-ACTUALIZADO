if (process.env.NODE_ENV !== 'test') require('dotenv').config();
const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const multer = require('multer');
const { dataStore, isSupabaseConfigured } = require('./repositories/dataStore');
const { requireAuth } = require('./services/authService');

const authRouter = require('./routes/auth');
const categoriasRouter = require('./routes/categorias');
const productosRouter = require('./routes/productos');
const clientesRouter = require('./routes/clientes');
const ventasRouter = require('./routes/ventas');
const contabilidadRouter = require('./routes/contabilidad');
const reportesRouter = require('./routes/reportes');

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net', 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'data:', 'https://cdn.jsdelivr.net', 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: null
    }
  }
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Archivos estáticos del frontend
const publicDir = path.join(process.cwd(), 'public');
app.use(express.static(publicDir));

// Health & estado de conexión
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    app: 'SIGR',
    mode: dataStore.mode,
    supabaseConfigured: isSupabaseConfigured,
    timestamp: new Date().toISOString()
  });
});

// Autenticación pública y protección de toda la API operativa
app.use('/api/auth', authRouter);
app.use('/api', (req, res, next) => {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.get('x-requested-with') !== 'XMLHttpRequest') {
    return res.status(403).json({ ok: false, error: 'Solicitud no permitida.' });
  }
  next();
});
app.use('/api', requireAuth);

// Configuración del restaurante (encabezado de factura POS)
app.get('/api/config', async (req, res, next) => {
  try {
    const data = await dataStore.getConfig();
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
});

app.put('/api/config', async (req, res, next) => {
  try {
    const data = await dataStore.updateConfig(req.body);
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
});

// Dashboard principal
app.get('/api/dashboard', async (req, res, next) => {
  try {
    const data = await dataStore.getDashboardSummary();
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
});

// Módulos principales
app.use('/api/categorias', categoriasRouter);
app.use('/api/productos', productosRouter);
app.use('/api/clientes', clientesRouter);
app.use('/api/ventas', ventasRouter);
app.use('/api/contabilidad', contabilidadRouter);
app.use('/api/reportes', reportesRouter);

// 404 para rutas API desconocidas
app.use('/api/*', (req, res) => {
  res.status(404).json({ ok: false, error: 'Endpoint de API no encontrado.' });
});

// Fallback frontend SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// Manejo centralizado de errores
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const msg =
      err.code === 'LIMIT_FILE_SIZE'
        ? 'La imagen supera el tamaño máximo permitido de 5 MB.'
        : `Error al subir archivo: ${err.message}`;
    return res.status(400).json({ ok: false, error: msg });
  }
  const status = err.statusCode || 500;
  console.error('[SIGR API Error]', err.message);
  res.status(status).json({
    ok: false,
    error: err.message || 'Error interno del servidor.'
  });
});

module.exports = app;
