// Asignaturas sin escribirlas a mano: salen de los módulos en los que Web Familia dice que
// estás matriculado (optativa incluida) o, sin Web Familia, de tu horario escrito a mano.
// Las horas totales no están en Web Familia: se estiman con las sesiones semanales.
import { matchSubject } from './itaca.js';
import { PALETTE, colorForName } from './horario.js';

// Un curso de grado superior son 1000 horas repartidas en 30 sesiones semanales: cada
// sesión semanal equivale a unas 33 horas al año. Con el horario de 2º DAW cuadra a la hora.
export const HOURS_PER_WEEKLY_SESSION = 1000 / 30;
const SESSION_MIN = 55;

const normalize = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const isTutoring = (name) => /^tutor[ií]a\b/i.test(name.trim());

// "Desarrollo WEB en entorno cliente (2CFS)" -> "Desarrollo WEB en entorno cliente".
export function cleanModuleName(raw) {
  const name = String(raw).replace(/\s*\([^()]*\)\s*$/, '').replace(/\s+G[SM]$/, '').trim();
  return /\p{Ll}/u.test(name) ? name : `${name[0]}${name.slice(1).toLocaleLowerCase('es')}`;
}

const slug = (name) => normalize(name).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'asignatura';
const minutes = (e) => {
  const toMin = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  return toMin(e.end) - toMin(e.start);
};

// Sesiones semanales de cada asignatura. Una clase de dos horas cuenta como dos sesiones.
export function weeklySessions(subjects, schedule) {
  const counts = new Map();
  for (const e of schedule ?? []) {
    const code = matchSubject(e.module, subjects);
    if (code) counts.set(code, (counts.get(code) ?? 0) + Math.max(1, Math.round(minutes(e) / SESSION_MIN)));
  }
  return counts;
}

// Añade las asignaturas que falten y rellena las horas que no ha puesto el usuario. Nunca
// borra asignaturas ni toca horas escritas a mano: esas mandan siempre.
export function reconcileSubjects(subjects, moduleNames, schedule) {
  const out = subjects.map((s) => ({ ...s }));
  const names = [...moduleNames, ...(schedule ?? []).map((e) => e.module)]
    .filter((n) => n && !isTutoring(n))
    .map(cleanModuleName);
  for (const name of names) {
    if (matchSubject(name, out)) continue;
    let code = slug(name);
    for (let i = 2; out.some((s) => s.code === code); i += 1) code = `${slug(name)}-${i}`;
    // Un color que no tenga ya otra asignatura; solo si se acaban se repiten.
    const used = new Set(out.map((s) => s.color?.toUpperCase()));
    const color = PALETTE.find((c) => !used.has(c)) ?? colorForName(name);
    out.push({ code, name, color, keywords: [normalize(name)], totalHours: null, hoursSource: null });
  }
  const sessions = weeklySessions(out, schedule);
  for (const s of out) {
    if (s.hoursSource === 'manual' || (s.totalHours && !s.hoursSource)) continue; // puestas a mano
    const weekly = sessions.get(s.code) ?? 0;
    s.weeklySessions = weekly;
    s.totalHours = weekly ? Math.round(weekly * HOURS_PER_WEEKLY_SESSION) : null;
    s.hoursSource = weekly ? 'estimado' : null;
  }
  return out;
}
