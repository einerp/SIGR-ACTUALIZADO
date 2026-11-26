const express = require('express');
const { dataStore } = require('../repositories/dataStore');

const router = express.Router();

function csvEscape(val) {
  const s = String(val ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

router.get('/ventas', async (req, res, next) => {
  try {
    const data = await dataStore.getSalesReport({
      from: req.query.from,
      to: req.query.to
    });
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
});

router.get('/ventas/csv', async (req, res, next) => {
  try {
    const report = await dataStore.getSalesReport({
      from: req.query.from,
      to: req.query.to
    });

    const headers = [
      'Factura',
      'Fecha',
      'Cliente',
      'Servicio',
      'Mesa',
      'Metodo Pago',
      'Subtotal',
      'Descuento',
      'Impuesto',
      'Total',
      'Estado'
    ];

    const rows = report.facturas.map((v) => [
      v.numero_factura,
      v.fecha,
      v.cliente_nombre,
      v.tipo_servicio,
      v.mesa || '',
      v.metodo_pago,
      v.subtotal,
      v.descuento,
      v.impuesto,
      v.total,
      v.estado
    ]);

    const csvLines = [
      headers.map(csvEscape).join(','),
      ...rows.map((r) => r.map(csvEscape).join(','))
    ];

    const filename = `SIGR_Reporte_Ventas_${req.query.from || 'inicio'}_${req.query.to || 'hoy'}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('\uFEFF' + csvLines.join('\r\n'));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
