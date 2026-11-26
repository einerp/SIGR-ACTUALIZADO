const express = require('express');
const { dataStore } = require('../repositories/dataStore');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const data = await dataStore.listCategorias({
      search: req.query.search,
      onlyActive: req.query.activo === 'true'
    });
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const data = await dataStore.getCategoriaById(req.params.id);
    if (!data) return res.status(404).json({ ok: false, error: 'Categoría no encontrada.' });
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    if (!req.body.nombre || !String(req.body.nombre).trim()) {
      return res.status(400).json({ ok: false, error: 'El nombre de la categoría es obligatorio.' });
    }
    const data = await dataStore.createCategoria(req.body);
    res.status(201).json({ ok: true, data });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    if (!req.body.nombre || !String(req.body.nombre).trim()) {
      return res.status(400).json({ ok: false, error: 'El nombre de la categoría es obligatorio.' });
    }
    const data = await dataStore.updateCategoria(req.params.id, req.body);
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await dataStore.deleteCategoria(req.params.id);
    res.json({ ok: true, message: 'Categoría eliminada correctamente.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
