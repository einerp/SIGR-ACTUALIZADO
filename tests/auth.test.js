const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const authFile = path.join(process.cwd(), '.tmp', 'tests', `auth-${process.pid}.json`);
const demoFile = path.join(process.cwd(), '.tmp', 'tests', `demo-${process.pid}.json`);
process.env.NODE_ENV = 'test';
process.env.DEMO_AUTH_FILE = authFile;
process.env.DEMO_DB_FILE = demoFile;
process.env.SESSION_SECRET = 'secret-de-pruebas-con-mas-de-32-caracteres';
process.env.ADMIN_USERNAME = 'admin';
process.env.ADMIN_PASSWORD = 'Admin123*';
delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_ANON_KEY;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;

const request = require('supertest');
const app = require('../src/app');

test('flujo completo de autenticación y cambio de credenciales', async (t) => {
  const agent = request.agent(app);
  t.after(() => {
    for (const file of [authFile, demoFile]) fs.rmSync(file, { force: true });
  });

  await t.test('health es público y la API operativa exige sesión', async () => {
    const health = await request(app).get('/api/health').expect(200);
    assert.equal(health.body.ok, true);
    await request(app).get('/api/dashboard').expect(401);
  });

  await t.test('rechaza una contraseña incorrecta', async () => {
    await agent
      .post('/api/auth/login')
      .set('X-Requested-With', 'XMLHttpRequest')
      .send({ usuario: 'admin', password: 'incorrecta' })
      .expect(401);
  });

  await t.test('crea el administrador inicial y permite ingresar', async () => {
    const res = await agent
      .post('/api/auth/login')
      .set('X-Requested-With', 'XMLHttpRequest')
      .send({ usuario: 'admin', password: 'Admin123*' })
      .expect(200);
    assert.equal(res.body.data.usuario, 'admin');
    assert.equal(res.body.data.debe_cambiar_password, true);
    assert.match(res.headers['set-cookie'][0], /HttpOnly/);
    assert.match(res.headers['set-cookie'][0], /SameSite=Strict/);
    await agent.get('/api/auth/me').expect(200);
    await agent.get('/api/dashboard').expect(200);
  });

  await t.test('exige la contraseña actual para modificar credenciales', async () => {
    await agent
      .put('/api/auth/credentials')
      .set('X-Requested-With', 'XMLHttpRequest')
      .send({
        password_actual: 'incorrecta',
        nuevo_usuario: 'administrador',
        nueva_password: 'NuevaClave2026*',
        confirmar_password: 'NuevaClave2026*'
      })
      .expect(400);
  });

  await t.test('actualiza usuario y contraseña, y renueva la sesión', async () => {
    const res = await agent
      .put('/api/auth/credentials')
      .set('X-Requested-With', 'XMLHttpRequest')
      .send({
        password_actual: 'Admin123*',
        nuevo_usuario: 'administrador',
        nueva_password: 'NuevaClave2026*',
        confirmar_password: 'NuevaClave2026*'
      })
      .expect(200);
    assert.equal(res.body.data.usuario, 'administrador');
    assert.equal(res.body.data.debe_cambiar_password, false);

    await request(app)
      .post('/api/auth/login')
      .set('X-Requested-With', 'XMLHttpRequest')
      .send({ usuario: 'admin', password: 'Admin123*' })
      .expect(401);
    await request(app)
      .post('/api/auth/login')
      .set('X-Requested-With', 'XMLHttpRequest')
      .send({ usuario: 'administrador', password: 'NuevaClave2026*' })
      .expect(200);
  });

  await t.test('cierra la sesión', async () => {
    await agent.post('/api/auth/logout').set('X-Requested-With', 'XMLHttpRequest').expect(200);
    await agent.get('/api/auth/me').expect(401);
  });
});
