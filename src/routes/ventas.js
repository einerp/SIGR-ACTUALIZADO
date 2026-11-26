const express = require('express');
const { dataStore } = require('../repositories/dataStore');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const data = await dataStore.listVentas({
      from: req.query.from,
      to: req.query.to,
      estado: req.query.estado,
      metodoPago: req.query.metodo_pago,
      search: req.query.search
    });
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const data = await dataStore.getVentaById(req.params.id);
    if (!data) return res.status(404).json({ ok: false, error: 'Factura no encontrada.' });
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const data = await dataStore.createVenta(req.body);
    res.status(201).json({ ok: true, data });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/anular', async (req, res, next) => {
  try {
    const data = await dataStore.anularVenta(req.params.id, req.body.motivo || '');
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
