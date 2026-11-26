const express = require('express');
const multer = require('multer');
const { dataStore } = require('../repositories/dataStore');
const {
  uploadProductImage,
  deleteProductImage,
  ALLOWED_MIME_TYPES
} = require('../services/storageService');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Formato de imagen no válido. Solo JPG, PNG, WEBP o GIF.'));
    }
  }
});

function parseBool(val, fallback = true) {
  if (val === undefined || val === null || val === '') return fallback;
  if (typeof val === 'boolean') return val;
  return String(val).toLowerCase() === 'true' || String(val) === '1';
}

router.get('/', async (req, res, next) => {
  try {
    const data = await dataStore.listProductos({
      search: req.query.search,
      categoriaId: req.query.categoria_id,
      onlyAvailable: req.query.disponible === 'true'
    });
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const data = await dataStore.getProductoById(req.params.id);
    if (!data) return res.status(404).json({ ok: false, error: 'Producto no encontrado.' });
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
});

router.post('/', upload.single('imagen'), async (req, res, next) => {
  try {
    if (!req.body.nombre || !String(req.body.nombre).trim()) {
      return res.status(400).json({ ok: false, error: 'El nombre del producto es obligatorio.' });
    }

    let imagen_url = (req.body.imagen_url || '').trim();
    let imagen_path = '';

    if (req.file) {
      const uploaded = await uploadProductImage(req.file);
      imagen_url = uploaded.imagen_url;
      imagen_path = uploaded.imagen_path;
    }

    const data = await dataStore.createProducto({
      codigo: req.body.codigo,
      nombre: req.body.nombre,
      descripcion: req.body.descripcion,
      categoria_id: req.body.categoria_id || null,
      precio: req.body.precio,
      costo: req.body.costo,
      stock: req.body.stock,
      disponible: parseBool(req.body.disponible, true),
      imagen_url,
      imagen_path
    });

    res.status(201).json({ ok: true, data });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', upload.single('imagen'), async (req, res, next) => {
  try {
    const existing = await dataStore.getProductoById(req.params.id);
    if (!existing) {
      return res.status(404).json({ ok: false, error: 'Producto no encontrado.' });
    }

    if (!req.body.nombre || !String(req.body.nombre).trim()) {
      return res.status(400).json({ ok: false, error: 'El nombre del producto es obligatorio.' });
    }

    const payload = {
      codigo: req.body.codigo,
      nombre: req.body.nombre,
      descripcion: req.body.descripcion,
      categoria_id: req.body.categoria_id || null,
      precio: req.body.precio,
      costo: req.body.costo,
      stock: req.body.stock,
      disponible: parseBool(req.body.disponible, existing.disponible)
    };

    if (req.file) {
      const uploaded = await uploadProductImage(req.file);
      payload.imagen_url = uploaded.imagen_url;
      payload.imagen_path = uploaded.imagen_path;
      if (existing.imagen_path) {
        await deleteProductImage(existing.imagen_path);
      }
    } else if (parseBool(req.body.eliminar_imagen, false)) {
      if (existing.imagen_path) {
        await deleteProductImage(existing.imagen_path);
      }
      payload.imagen_url = '';
      payload.imagen_path = '';
    } else if (req.body.imagen_url !== undefined) {
      payload.imagen_url = String(req.body.imagen_url).trim();
    }

    const data = await dataStore.updateProducto(req.params.id, payload);
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const existing = await dataStore.getProductoById(req.params.id);
    if (!existing) {
      return res.status(404).json({ ok: false, error: 'Producto no encontrado.' });
    }
    await dataStore.deleteProducto(req.params.id);
    if (existing.imagen_path) {
      await deleteProductImage(existing.imagen_path);
    }
    res.json({ ok: true, message: 'Producto eliminado correctamente.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
