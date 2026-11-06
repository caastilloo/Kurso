import { promises as fs } from 'node:fs';
import { DATA_FILE, ensureDataDir } from './paths.js';

// Una instalación nueva empieza sin asignaturas: salen de Web Familia o del horario escrito
// a mano (src/asignaturas.js). Quien ya las tenía guardadas las conserva tal cual.
const DEFAULTS = {
  subjects: [],
  itacaModules: [],
  absences: [],
  settings: { limitPct: 15, countJustified: false, countLates: false },
  hiddenTasks: [],
  hiddenCourses: [],
  tasksCache: null,
  aulesUser: null,
  itacaUser: null,
  itacaLastSync: null,
  itacaLastError: null,
  schedule: null,
  manualSchedule: null,
  scheduleSource: 'itaca',
  grades: null,
  gradesUnseen: 0,
  gradesError: false,
  onboardingDone: false,
  tutorialDone: false,
  skippedAccounts: [],
};

let state = null;
let queue = Promise.resolve();

export async function load() {
  if (state) return state;
  await ensureDataDir();
  try {
    state = { ...structuredClone(DEFAULTS), ...JSON.parse(await fs.readFile(DATA_FILE, 'utf8')) };
  } catch (e) {
    if (e.code === 'ENOENT') {
      state = structuredClone(DEFAULTS);
    } else if (e instanceof SyntaxError) {
      // Un archivo dañado no debe impedir abrir la app: se aparta (sin borrarlo) y se empieza de nuevo.
      const aside = `${DATA_FILE}.danado-${Date.now()}`;
      await fs.rename(DATA_FILE, aside);
      console.error(`data.json no se podía leer; se ha guardado como ${aside}`);
      state = structuredClone(DEFAULTS);
    } else {
      throw e;
    }
  }
  return state;
}

// Cerrar sesión: vuelve a los valores de una instalación nueva. Se cambia el mismo objeto,
// porque el servidor guarda una referencia a él.
// Lo único que sobrevive es saber que en este equipo ya se registró alguien, para no volver
// a enseñar el tutorial: no es un dato personal.
export async function resetState() {
  const tutorialDone = Boolean(state.tutorialDone || state.onboardingDone);
  for (const key of Object.keys(state)) delete state[key];
  Object.assign(state, structuredClone(DEFAULTS), { tutorialDone });
  await save();
}

// Las escrituras se encolan y son atómicas: un cierre a medias nunca corrompe el archivo.
// Si una falla (disco lleno, archivo bloqueado...), quien guardaba recibe el error, pero la
// cola sigue viva: las siguientes escrituras se intentan igualmente.
export function save() {
  const run = queue.catch(() => {}).then(async () => {
    const tmp = `${DATA_FILE}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(state, null, 2), 'utf8');
    await fs.rename(tmp, DATA_FILE);
  });
  queue = run;
  return run;
}
