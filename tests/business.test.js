const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const demoFile = path.join(process.cwd(), '.tmp', 'tests', `business-${process.pid}.json`);
process.env.NODE_ENV = 'test';
process.env.DEMO_DB_FILE = demoFile;
delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_ANON_KEY;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;

const store = require('../src/repositories/demoAdapter');

test('una venta POS calcula totales, descuenta stock y crea contabilidad', async (t) => {
  t.after(() => fs.rmSync(demoFile, { force: true }));
  const before = await store.getProductoById(1);

  const sale = await store.createVenta({
    cliente_nombre: 'Prueba automatizada',
    tipo_servicio: 'llevar',
    descuento: 0,
    impuesto_porcentaje: 8,
    metodo_pago: 'efectivo',
    monto_recibido: 40000,
    items: [{ producto_id: 1, cantidad: 2 }]
  });

  assert.equal(sale.subtotal, 28000);
  assert.equal(sale.impuesto, 2240);
  assert.equal(sale.total, 30240);
  assert.equal(sale.cambio, 9760);
  assert.equal(sale.items.length, 1);

  const after = await store.getProductoById(1);
  assert.equal(after.stock, before.stock - 2);
  const movements = await store.listMovimientos({ search: sale.numero_factura });
  assert.equal(movements[0].tipo, 'ingreso');
  assert.equal(movements[0].monto, 30240);

  await store.anularVenta(sale.id, 'Prueba de reverso');
  const restored = await store.getProductoById(1);
  assert.equal(restored.stock, before.stock);
});

test('no permite facturar un carrito vacío', async () => {
  await assert.rejects(() => store.createVenta({ items: [] }), /al menos un producto/);
});
