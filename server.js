import express from 'express';
import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { load, resetState, save } from './src/store.js';
import { clearVault, readVault, updateVault } from './src/vault.js';
import { summarize } from './src/faltas.js';
import * as aules from './src/aules.js';
import { ItacaSession, fetchAbsences, matchSubject, mergeAbsences } from './src/itaca.js';
import { mergeGrades } from './src/notas.js';
import { colorForName, normalizeManualSchedule } from './src/horario.js';
import { reconcileSubjects } from './src/asignaturas.js';
import { GRADES_SAMPLE_FILE } from './src/paths.js';

// Se usa siempre el mismo puerto para que el navegador interno recuerde el tema. Si otro
// programa lo tiene ocupado, se coge uno libre (salvo que se haya pedido uno con PORT).
const PREFERRED_PORT = Number(process.env.PORT) || 4580;
// Modo demostración (npm run demo): datos inventados y ninguna conexión con Aules ni Web Familia.
const DEMO = process.env.KURSO_DEMO === '1';
const demoRefused = () => Object.assign(new Error('En el modo demostración no se conecta ninguna cuenta.'), { status: 400 });
const HOST = '127.0.0.1';
let allowedHosts = new Set();
const TASKS_MAX_AGE_MS = 15 * 60 * 1000;

const root = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const state = await load();

// Asignaturas al día con los módulos de Web Familia y el horario que se esté usando. Lo que
// se leyó antes de conocer una asignatura (faltas, horario, notas) se vuelve a asignar.
function refreshSubjects() {
  const schedule = state.scheduleSource === 'manual' ? state.manualSchedule : state.schedule;
  state.subjects = reconcileSubjects(state.subjects, state.itacaModules, schedule);
  const rematch = (item) => {
    if (!item.subject || item.subject === 'OTRA') item.subject = matchSubject(item.module ?? '', state.subjects) ?? item.subject;
  };
  state.absences.forEach(rematch);
  state.schedule?.forEach(rematch);
  state.manualSchedule?.forEach(rematch);
  state.grades?.modules.forEach(rematch);
}
refreshSubjects();
await save();

// La app guarda credenciales: otra web abierta en tu navegador no debe poder llamarla.
app.use((req, res, next) => {
  if (!allowedHosts.has(req.headers.host)) return res.status(403).end();
  const origin = req.headers.origin;
  if (origin && !allowedHosts.has(origin.replace(/^https?:\/\//, ''))) return res.status(403).end();
  if (req.method !== 'GET' && !req.is('application/json') && req.headers['content-length'] !== '0' && req.headers['content-length']) {
    return res.status(415).end();
  }
  res.set({
    'Content-Security-Policy': "default-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'Cache-Control': 'no-store',
  });
  next();
});
app.use(express.json({ limit: '200kb' }));
app.use(express.static(path.join(root, 'public')));

const api = (fn) => async (req, res) => {
  try {
    res.json((await fn(req, res)) ?? { ok: true });
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.message, code: e.code });
    const friendly = e.name === 'TimeoutError' || e.cause?.code || e.message === 'fetch failed';
    console.error(e);
    res.status(502).json({
      error: friendly ? 'No se ha podido contactar con el servidor. Comprueba tu conexión.' : e.message,
      code: e.code,
    });
  }
};
const badRequest = (message) => Object.assign(new Error(message), { status: 400 });

// "2026-02-30" tiene buena forma, pero no existe.
export function isCalendarDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? '')) return false;
  const d = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

// El horario usa los mismos nombres y colores que el resto de la app.
// El de Web Familia solo se enseña con la cuenta conectada; el escrito a mano no la necesita.
function schedulePayload() {
  const schedule = state.scheduleSource === 'manual'
    ? state.manualSchedule
    : state.itacaUser ? state.schedule : null;
  if (!schedule) return null;
  const byCode = new Map(state.subjects.map((s) => [s.code, s]));
  return schedule.map((e) => {
    const subject = byCode.get(e.subject);
    return { ...e, name: subject?.name ?? e.module, color: subject?.color ?? colorForName(e.module) };
  });
}

function gradesPayload() {
  const byCode = new Map(state.subjects.map((s) => [s.code, s]));
  const g = state.grades;
  return {
    data: g && {
      ...g,
      modules: g.modules.map((m) => {
        const subject = byCode.get(m.subject);
        return { ...m, name: subject?.name ?? m.module, color: subject?.color ?? null };
      }),
    },
    unseen: state.gradesUnseen,
    error: state.gradesError,
  };
}

function faltasPayload() {
  return {
    notas: gradesPayload(),
    schedule: schedulePayload(),
    scheduleSource: state.scheduleSource,
    manualSchedule: state.manualSchedule,
    subjects: summarize(state.subjects, state.absences, state.settings),
    absences: [...state.absences].sort((a, b) => (b.date + (b.time ?? '')).localeCompare(a.date + (a.time ?? ''))),
    settings: state.settings,
    itaca: {
      user: state.itacaUser,
      lastSync: state.itacaLastSync,
      lastError: state.itacaLastError,
      warnings: state.itacaWarnings ?? [],
    },
  };
}

// Un fallo aquí nunca toca las faltas ya guardadas: solo se muestra el aviso.
let syncing = null;
function syncItaca() {
  syncing ??= (async () => {
    if (DEMO) {
      state.itacaLastSync = new Date().toISOString();
      await save();
      return;
    }
    const { itaca: creds } = await readVault();
    if (!creds) throw Object.assign(new Error('Conecta tu cuenta de Web Familia.'), { status: 409 });
    try {
      const result = await fetchAbsences(creds, state.absences, state.subjects);
      state.absences = mergeAbsences(state.absences, result.absences, result.checkedDates);
      if (result.schedule) state.schedule = result.schedule;
      if (result.modules?.length) state.itacaModules = result.modules;
      refreshSubjects();
      state.gradesError = !result.grades;
      if (result.grades) {
        const { grades, newCount } = mergeGrades(state.grades, result.grades);
        state.grades = grades;
        state.gradesUnseen += newCount;
      }
      // Copia local de la página con notas, para poder ajustar el lector si la web no es como se espera.
      if (result.gradesHtml && !result.gradesHtml.includes('imc-sin-datos')) {
        await fs.writeFile(GRADES_SAMPLE_FILE, result.gradesHtml, 'utf8').catch((e) => console.error(e));
      }
      state.itacaLastSync = new Date().toISOString();
      state.itacaLastError = null;
      state.itacaWarnings = result.warnings;
    } catch (e) {
      console.error(e);
      state.itacaLastError = e.code === 'invalidlogin'
        ? 'Web Familia ha rechazado la contraseña. Si la has cambiado, vuelve a conectar la cuenta en Ajustes.'
        : e.code === 'structure'
          ? e.message
          : 'No se ha podido contactar con Web Familia. Se muestran los últimos datos guardados.';
    }
    await save();
  })().finally(() => (syncing = null));
  return syncing;
}

function tasksPayload() {
  const c = state.tasksCache;
  return {
    connected: Boolean(state.aulesUser),
    user: state.aulesUser,
    fetchedAt: c?.fetchedAt ?? null,
    warnings: c?.warnings ?? [],
    courses: (c?.courses ?? []).map((x) => ({ ...x, hidden: state.hiddenCourses.includes(x.id) })),
    tasks: (c?.tasks ?? []).map((t) => ({
      ...t,
      hidden: state.hiddenTasks.includes(t.key) || state.hiddenCourses.includes(t.courseId),
    })),
    subjects: state.subjects.map(({ code, name, color, keywords }) => ({ code, name, color, keywords })),
  };
}

let refreshing = null;
function refreshTasks() {
  refreshing ??= (async () => {
    if (DEMO) {
      if (state.tasksCache) state.tasksCache.fetchedAt = new Date().toISOString();
      await save();
      return;
    }
    const { aules: creds } = await readVault();
    if (!creds?.token) throw Object.assign(new Error('Conecta tu cuenta de Aules.'), { status: 409, code: 'noaccount' });
    try {
      const result = await aules.fetchTasks(creds.token);
      state.tasksCache = result;
      state.aulesUser = result.user;
      await save();
    } catch (e) {
      if (e.code === 'expired') e.status = 401;
      throw e;
    }
  })().finally(() => (refreshing = null));
  return refreshing;
}

// ---------- Bienvenida ----------
app.get('/api/estado', api(() => ({
  aules: Boolean(state.aulesUser),
  user: state.aulesUser,
  itaca: Boolean(state.itacaUser),
  onboardingDone: state.onboardingDone,
  skipped: state.skippedAccounts,
  tutorialDone: state.tutorialDone,
})));

app.post('/api/tutorial', api(async () => {
  state.tutorialDone = true;
  await save();
}));

app.post('/api/bienvenida', api(async () => {
  state.onboardingDone = true;
  await save();
}));

// "No uso Aules / Web Familia": deja de pedirse al abrir la app hasta que se conecte.
const ACCOUNTS = ['aules', 'itaca'];
app.post('/api/bienvenida/omitir', api(async (req) => {
  const account = req.body?.account;
  if (!ACCOUNTS.includes(account)) throw badRequest('Cuenta desconocida.');
  if (!state.skippedAccounts.includes(account)) state.skippedAccounts.push(account);
  await save();
}));
// Cerrar sesión: cuentas, credenciales y datos de este equipo fuera, como una instalación
// nueva. Antes espera a que acabe cualquier actualización, para que no vuelva a escribir datos.
app.post('/api/sesion/cerrar', api(async () => {
  await Promise.allSettled([syncing, refreshing]);
  await clearVault();
  await fs.rm(GRADES_SAMPLE_FILE, { force: true });
  await resetState();
}));

const unskip = (account) => {
  state.skippedAccounts = state.skippedAccounts.filter((a) => a !== account);
};

// ---------- Aules ----------
app.post('/api/aules/connect', api(async (req) => {
  const { username, password } = req.body ?? {};
  if (DEMO) throw demoRefused();
  if (!username || !password) throw badRequest('Escribe tu usuario y tu contraseña.');
  let token;
  try {
    token = await aules.login(String(username).trim(), String(password));
  } catch (e) {
    if (e.code === 'invalidlogin') e.status = 401;
    throw e;
  }
  await updateVault((v) => (v.aules = { token }));
  unskip('aules');
  await refreshTasks();
  return tasksPayload();
}));

// Al desconectar se espera a la actualización en curso: si no, al terminar volvería a dejar
// la cuenta como conectada aunque ya no haya acceso guardado.
app.post('/api/aules/disconnect', api(async () => {
  await Promise.allSettled([refreshing]);
  await updateVault((v) => delete v.aules);
  state.aulesUser = null;
  state.tasksCache = null;
  await save();
}));

app.get('/api/tareas', api(async (req) => {
  const age = state.tasksCache ? Date.now() - new Date(state.tasksCache.fetchedAt).getTime() : Infinity;
  if (state.aulesUser && (req.query.refresh === '1' || age > TASKS_MAX_AGE_MS)) await refreshTasks();
  return tasksPayload();
}));

app.post('/api/tareas/ocultar', api(async (req) => {
  const key = String(req.body?.key ?? '').slice(0, 100);
  if (!key) throw badRequest('Tarea desconocida.');
  state.hiddenTasks = state.hiddenTasks.filter((k) => k !== key);
  if (req.body?.hidden) state.hiddenTasks.push(key);
  await save();
  return tasksPayload();
}));

app.post('/api/cursos/ocultar', api(async (req) => {
  const id = Number(req.body?.courseId);
  if (!Number.isInteger(id)) throw badRequest('Curso desconocido.');
  state.hiddenCourses = state.hiddenCourses.filter((k) => k !== id);
  if (req.body?.hidden) state.hiddenCourses.push(id);
  await save();
  return tasksPayload();
}));

// ---------- Faltas ----------
app.get('/api/faltas', api(() => faltasPayload()));

app.post('/api/faltas', api(async (req) => {
  const { subject, date, hours = 1, justified = false, type = 'falta', note = '' } = req.body ?? {};
  if (!state.subjects.some((s) => s.code === subject)) throw badRequest('Elige una asignatura.');
  if (!isCalendarDate(date)) throw badRequest('Indica una fecha válida.');
  const h = Number(hours);
  if (!Number.isInteger(h) || h < 1 || h > 12) throw badRequest('Las horas deben ser un número entre 1 y 12.');
  if (!['falta', 'retraso'].includes(type)) throw badRequest('Tipo no válido.');
  state.absences.push({
    id: randomUUID(), source: 'manual', subject, date, hours: type === 'retraso' ? 0 : h,
    justified: Boolean(justified), type, note: String(note).slice(0, 200),
  });
  await save();
  return faltasPayload();
}));

app.delete('/api/faltas/:id', api(async (req) => {
  const target = state.absences.find((a) => a.id === req.params.id);
  if (target?.source !== 'manual' && !target?.missing) {
    throw badRequest('Las faltas que siguen en Ítaca no se pueden borrar desde aquí.');
  }
  state.absences = state.absences.filter((a) => a !== target);
  await save();
  return faltasPayload();
}));

app.put('/api/asignaturas/:code', api(async (req) => {
  const subject = state.subjects.find((s) => s.code === req.params.code);
  if (!subject) throw badRequest('Asignatura desconocida.');
  const raw = req.body?.totalHours;
  const total = raw === null || raw === '' ? null : Number(raw);
  if (total !== null && (!Number.isFinite(total) || total <= 0 || total > 2000)) throw badRequest('Horas totales no válidas.');
  // Un número escrito manda sobre la estimación; dejarlo vacío la recupera.
  subject.totalHours = total;
  subject.hoursSource = total === null ? null : 'manual';
  refreshSubjects();
  await save();
  return faltasPayload();
}));

app.put('/api/ajustes', api(async (req) => {
  const { limitPct, countJustified, countLates } = req.body ?? {};
  if (limitPct !== undefined) {
    const n = Number(limitPct);
    if (!(n > 0 && n <= 100)) throw badRequest('Porcentaje no válido.');
    state.settings.limitPct = n;
  }
  if (countJustified !== undefined) state.settings.countJustified = Boolean(countJustified);
  if (countLates !== undefined) state.settings.countLates = Boolean(countLates);
  await save();
  return faltasPayload();
}));

app.put('/api/horario', api(async (req) => {
  state.manualSchedule = normalizeManualSchedule(req.body?.entries, state.subjects);
  state.scheduleSource = 'manual';
  refreshSubjects();
  await save();
  return faltasPayload();
}));

// Vuelve al de Web Familia. El escrito a mano se conserva por si se quiere recuperar.
app.post('/api/horario/web-familia', api(async () => {
  state.scheduleSource = 'itaca';
  refreshSubjects();
  await save();
  return faltasPayload();
}));

app.post('/api/notas/vistas', api(async () => {
  state.gradesUnseen = 0;
  await save();
  return gradesPayload();
}));

// ---------- Web Familia ----------
app.post('/api/itaca/connect', api(async (req) => {
  if (DEMO) throw demoRefused();
  const documento = String(req.body?.documento ?? '').trim().toUpperCase();
  const password = String(req.body?.password ?? '');
  if (!documento || !password) throw badRequest('Escribe tu usuario y tu contraseña.');
  try {
    await new ItacaSession().login(documento, password);
  } catch (e) {
    if (e.code === 'invalidlogin') e.status = 401;
    throw e;
  }
  await updateVault((v) => (v.itaca = { documento, password }));
  state.itacaUser = documento;
  state.itacaLastError = null;
  unskip('itaca');
  await syncItaca();
  return faltasPayload();
}));

app.post('/api/itaca/sync', api(async () => {
  await syncItaca();
  return faltasPayload();
}));

app.post('/api/itaca/disconnect', api(async () => {
  await Promise.allSettled([syncing]);
  await updateVault((v) => delete v.itaca);
  state.itacaUser = null;
  state.itacaLastSync = null;
  state.itacaLastError = null;
  await save();
  return faltasPayload();
}));

// La ventana de escritorio arranca este mismo servidor dentro de su proceso.
const listen = (port) => new Promise((resolve, reject) => {
  const server = app.listen(port, HOST);
  server.once('listening', () => resolve(server));
  server.once('error', reject);
});

export async function startServer() {
  let server;
  try {
    server = await listen(PREFERRED_PORT);
  } catch (e) {
    if (e.code !== 'EADDRINUSE' || process.env.PORT) throw e;
    server = await listen(0);
  }
  const { port } = server.address();
  allowedHosts = new Set([`127.0.0.1:${port}`, `localhost:${port}`]);
  return { server, url: `http://localhost:${port}` };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { url } = await startServer();
  console.log(`Kurso en ${url}`);
}
