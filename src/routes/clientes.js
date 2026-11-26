const express = require('express');
const { dataStore } = require('../repositories/dataStore');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const data = await dataStore.listClientes({ search: req.query.search });
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const data = await dataStore.getClienteById(req.params.id);
    if (!data) return res.status(404).json({ ok: false, error: 'Cliente no encontrado.' });
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    if (!req.body.nombre || !String(req.body.nombre).trim()) {
      return res.status(400).json({ ok: false, error: 'El nombre del cliente es obligatorio.' });
    }
    const data = await dataStore.createCliente(req.body);
    res.status(201).json({ ok: true, data });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    if (!req.body.nombre || !String(req.body.nombre).trim()) {
      return res.status(400).json({ ok: false, error: 'El nombre del cliente es obligatorio.' });
    }
    const data = await dataStore.updateCliente(req.params.id, req.body);
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await dataStore.deleteCliente(req.params.id);
    res.json({ ok: true, message: 'Cliente eliminado correctamente.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
