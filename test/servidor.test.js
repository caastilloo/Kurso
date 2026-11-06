// El servidor de verdad, arrancado sobre una carpeta temporal. No contacta con Aules ni con
// Web Familia: ninguna de estas pruebas tiene credenciales que enviar.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
let nextPort = 4900 + Math.floor(Math.random() * 400);

async function startServer(t, data) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'kurso-srv-'));
  if (data !== undefined) await fs.writeFile(path.join(dir, 'data.json'), typeof data === 'string' ? data : JSON.stringify(data));
  const port = nextPort++;
  const child = spawn(process.execPath, ['server.js'], { cwd: root, env: { ...process.env, KURSO_DATA: dir, PORT: String(port) } });
  t.after(async () => {
    child.kill();
    await new Promise((r) => child.once('exit', r));
    await fs.rm(dir, { recursive: true, force: true });
  });
  await new Promise((resolve, reject) => {
    let out = '';
    child.stdout.on('data', (d) => { out += d; if (out.includes('Kurso en')) resolve(); });
    child.once('exit', (code) => reject(new Error(`El servidor se ha cerrado (${code})`)));
  });
  const base = `http://127.0.0.1:${port}`;
  const call = async (method, url, body) => {
    const res = await fetch(base + url, { method, headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
    return { status: res.status, body: await res.json().catch(() => null) };
  };
  const raw = (headers, method = 'GET', url = '/api/estado', body) => new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path: url, method, headers }, (res) => { res.resume(); resolve(res.statusCode); });
    req.on('error', reject);
    req.end(body);
  });
  return { dir, call, raw, port };
}

const SUBJECTS = [{ code: 'LEN', name: 'Lengua', color: '#4986E7', keywords: ['lengua'], totalHours: 100, hoursSource: 'manual' }];

test('solo atiende a la propia app: otra web no puede llamarla', async (t) => {
  const { raw, port } = await startServer(t);
  assert.equal(await raw({ Host: `127.0.0.1:${port}` }), 200);
  assert.equal(await raw({ Host: 'kurso.evil.example' }), 403, 'otro Host (DNS rebinding)');
  assert.equal(await raw({ Host: `127.0.0.1:${port}`, Origin: 'https://evil.example' }), 403, 'otro origen');
  assert.equal(await raw({ Host: `127.0.0.1:${port}`, 'Content-Type': 'text/plain', 'Content-Length': '2' }, 'POST', '/api/tutorial', 'hi'), 415, 'formulario de otra web');
});

test('valida las faltas que se añaden a mano', async (t) => {
  const { call } = await startServer(t, { subjects: SUBJECTS, onboardingDone: true });
  assert.equal((await call('POST', '/api/faltas', { subject: 'LEN', date: '2026-02-30' })).status, 400, 'fecha imposible');
  assert.equal((await call('POST', '/api/faltas', { subject: 'XXX', date: '2026-02-10' })).status, 400, 'asignatura desconocida');
  assert.equal((await call('POST', '/api/faltas', { subject: 'LEN', date: '2026-02-10', hours: 0 })).status, 400, 'horas');
  const ok = await call('POST', '/api/faltas', { subject: 'LEN', date: '2026-02-10', hours: 2 });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.subjects[0].hours, 2);
  const id = ok.body.absences[0].id;
  assert.equal((await call('DELETE', `/api/faltas/${id}`)).status, 200);
});

test('las faltas que vienen de Ítaca no se borran desde la app', async (t) => {
  const { call } = await startServer(t, { subjects: SUBJECTS, absences: [{ id: 'itaca:1', source: 'itaca', subject: 'LEN', date: '2026-02-10', hours: 1, type: 'falta', justified: false }] });
  assert.equal((await call('DELETE', '/api/faltas/itaca:1')).status, 400);
  assert.equal((await call('GET', '/api/faltas')).body.absences.length, 1);
});

test('rechaza datos raros en el resto de rutas', async (t) => {
  const { call } = await startServer(t, { subjects: SUBJECTS });
  assert.equal((await call('POST', '/api/cursos/ocultar', { courseId: 'abc', hidden: true })).status, 400);
  assert.equal((await call('POST', '/api/tareas/ocultar', { hidden: true })).status, 400);
  assert.equal((await call('PUT', '/api/asignaturas/LEN', { totalHours: -5 })).status, 400);
  assert.equal((await call('PUT', '/api/asignaturas/NOEXISTE', { totalHours: 5 })).status, 400);
  assert.equal((await call('PUT', '/api/ajustes', { limitPct: 0 })).status, 400);
  assert.equal((await call('POST', '/api/bienvenida/omitir', { account: 'otra' })).status, 400);
  assert.equal((await call('PUT', '/api/horario', { entries: [] })).status, 400);
});

test('un archivo de datos dañado no impide abrir la app y no se pierde', async (t) => {
  const { call, dir } = await startServer(t, '{ esto no es JSON');
  assert.equal((await call('GET', '/api/estado')).status, 200);
  const files = await fs.readdir(dir);
  assert.ok(files.some((f) => f.startsWith('data.json.danado-')), files.join());
});

test('unas credenciales que no se pueden descifrar piden volver a conectar', { skip: process.platform !== 'win32' }, async (t) => {
  const { call, dir } = await startServer(t, { itacaUser: 'PRUEBA', onboardingDone: true });
  await fs.writeFile(path.join(dir, 'secretos.dpapi'), 'esto no está cifrado con este usuario');
  const res = await call('POST', '/api/itaca/sync');
  assert.equal(res.status, 409, JSON.stringify(res.body));
  assert.match(res.body.error, /Conecta tu cuenta de Web Familia/);
});

test('cerrar sesión borra datos y credenciales, y no vuelve a ofrecer el tutorial', async (t) => {
  const { call, dir } = await startServer(t, { subjects: SUBJECTS, onboardingDone: true, aulesUser: 'ANA', absences: [{ id: 'm1', source: 'manual', subject: 'LEN', date: '2026-02-10', hours: 1 }] });
  await fs.writeFile(path.join(dir, 'secretos.dpapi'), 'x');
  await fs.writeFile(path.join(dir, 'calificaciones-muestra.html'), 'x');
  assert.equal((await call('POST', '/api/sesion/cerrar')).status, 200);
  const estado = (await call('GET', '/api/estado')).body;
  assert.deepEqual([estado.aules, estado.itaca, estado.onboardingDone, estado.tutorialDone], [false, false, false, true]);
  assert.equal((await call('GET', '/api/faltas')).body.absences.length, 0);
  const files = await fs.readdir(dir);
  assert.ok(!files.includes('secretos.dpapi') && !files.includes('calificaciones-muestra.html'), files.join());
});

test('sin cuentas no se intenta contactar con nadie', async (t) => {
  const { call } = await startServer(t);
  assert.equal((await call('POST', '/api/itaca/sync')).status, 409);
  const tareas = await call('GET', '/api/tareas');
  assert.equal(tareas.status, 200);
  assert.equal(tareas.body.connected, false);
});
