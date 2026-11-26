const express = require('express');
const { dataStore } = require('../repositories/dataStore');

const router = express.Router();

router.get('/resumen', async (req, res, next) => {
  try {
    const data = await dataStore.getContabilidadResumen({
      from: req.query.from,
      to: req.query.to
    });
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const data = await dataStore.listMovimientos({
      from: req.query.from,
      to: req.query.to,
      tipo: req.query.tipo,
      categoria: req.query.categoria,
      search: req.query.search
    });
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    if (!req.body.concepto || !String(req.body.concepto).trim()) {
      return res.status(400).json({ ok: false, error: 'El concepto contable es obligatorio.' });
    }
    const data = await dataStore.createMovimiento(req.body);
    res.status(201).json({ ok: true, data });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    if (!req.body.concepto || !String(req.body.concepto).trim()) {
      return res.status(400).json({ ok: false, error: 'El concepto contable es obligatorio.' });
    }
    const data = await dataStore.updateMovimiento(req.params.id, req.body);
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await dataStore.deleteMovimiento(req.params.id);
    res.json({ ok: true, message: 'Movimiento eliminado correctamente.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
