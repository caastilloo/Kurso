// npm run demo: abre Kurso con datos inventados, en una carpeta temporal y sin conectarse a
// Aules ni a Web Familia. Tus datos reales (si los tienes) no se tocan.
import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import electron from 'electron';
import { buildDemo } from './demo-data.mjs';

const dir = path.join(os.tmpdir(), 'kurso-demo');
await fs.rm(dir, { recursive: true, force: true });
await fs.mkdir(dir, { recursive: true });
await fs.writeFile(path.join(dir, 'data.json'), JSON.stringify(buildDemo(), null, 2));

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const child = spawn(electron, ['.', `--user-data-dir=${path.join(dir, 'perfil')}`], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, KURSO_DATA: dir, KURSO_DEMO: '1' },
});
child.on('exit', (code) => process.exit(code ?? 0));
