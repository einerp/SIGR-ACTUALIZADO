const fs = require('fs');
const path = require('path');

const root = process.cwd();
const output = path.join(root, 'dist');
const entries = [
  'api',
  'public',
  'src',
  'supabase',
  'server.js',
  'vercel.json',
  'package.json',
  'package-lock.json',
  'README.md'
];

for (const entry of entries) {
  if (!fs.existsSync(path.join(root, entry))) {
    throw new Error(`Falta el componente requerido: ${entry}`);
  }
}

fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });
for (const entry of entries) {
  fs.cpSync(path.join(root, entry), path.join(output, entry), { recursive: true });
}

const buildInfo = {
  application: 'SIGR',
  builtAt: new Date().toISOString(),
  commit: process.env.GITHUB_SHA || 'local',
  node: process.version
};
fs.writeFileSync(path.join(output, 'BUILD_INFO.json'), JSON.stringify(buildInfo, null, 2));
console.log(`Build reproducible creado en dist/ con Node ${process.version}`);
