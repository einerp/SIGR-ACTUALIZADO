const target = process.argv[2] || process.env.SMOKE_URL;
if (!target) throw new Error('Uso: node scripts/smoke-test.js https://tu-despliegue.vercel.app');

const base = new URL(target);
const startedAt = Date.now();

async function check(path, expectedStatus) {
  const response = await fetch(new URL(path, base), {
    signal: AbortSignal.timeout(15000),
    headers: { 'User-Agent': 'SIGR-CI-Smoke-Test' }
  });
  if (response.status !== expectedStatus) {
    throw new Error(`${path}: se esperaba HTTP ${expectedStatus} y llegó ${response.status}`);
  }
  return response;
}

async function main() {
  const healthResponse = await check('/api/health', 200);
  const health = await healthResponse.json();
  if (!health.ok || health.app !== 'SIGR') throw new Error('La respuesta de health no corresponde a SIGR.');
  await check('/api/dashboard', 401);
  const login = await check('/', 200);
  const html = await login.text();
  if (!html.includes('loginForm') || !html.includes('SIGR')) {
    throw new Error('La pantalla de acceso no contiene los elementos esperados.');
  }

  console.log(JSON.stringify({
    ok: true,
    url: base.origin,
    checks: ['health', 'api_protegida', 'pantalla_login'],
    durationMs: Date.now() - startedAt
  }, null, 2));
}

main().catch((err) => {
  console.error(err.message);
  process.exitCode = 1;
});
