// Horario escrito a mano, para quien no lo tiene en Web Familia o quiere corregirlo.
import { matchSubject } from './itaca.js';

const DAY_LABELS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes'];
const MAX_ENTRIES = 200;
const MAX_NAME = 80;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

const invalid = (message) => Object.assign(new Error(message), { status: 400 });

// Comprueba lo escrito y lo deja igual que el horario de Web Familia. Solo se aceptan dos
// clases a la vez si coinciden exactamente (desdobles): un solape parcial no se puede pintar.
export function normalizeManualSchedule(entries, subjects) {
  if (!Array.isArray(entries) || !entries.length) throw invalid('Añade al menos una clase.');
  if (entries.length > MAX_ENTRIES) throw invalid('Hay demasiadas clases.');
  const out = entries.map((e) => {
    const day = Number(e?.day);
    const module = String(e?.name ?? '').trim();
    const { start, end } = e ?? {};
    if (!Number.isInteger(day) || !DAY_LABELS[day]) throw invalid('Hay una clase en un día que no es válido.');
    const where = `del ${DAY_LABELS[day]}`;
    if (!module) throw invalid(`Falta el nombre de una clase ${where}.`);
    if (module.length > MAX_NAME) throw invalid(`El nombre "${module.slice(0, 20)}..." es demasiado largo.`);
    if (!TIME.test(start) || !TIME.test(end)) throw invalid(`Revisa las horas de ${module} ${where}.`);
    if (start >= end) throw invalid(`${module} ${where} termina antes de empezar.`);
    return { day, start, end, module, subject: matchSubject(module, subjects) };
  });

  out.sort((a, b) => a.day - b.day || a.start.localeCompare(b.start));
  out.forEach((a, i) => {
    const b = out[i + 1];
    if (!b || a.day !== b.day || b.start >= a.end) return;
    if (a.start !== b.start || a.end !== b.end) {
      throw invalid(`${a.module} y ${b.module} se pisan el ${DAY_LABELS[a.day]}.`);
    }
  });
  return out;
}

// Colores para las asignaturas que Kurso no conoce: siempre el mismo para el mismo nombre.
export const PALETTE = ['#4986E7', '#16A765', '#CD74E6', '#FF7537', '#C2A878', '#9A9CFF', '#AC725E', '#E66B7D', '#2CA6A4', '#D9A520'];

export function colorForName(name) {
  let hash = 0;
  for (const ch of String(name).toLowerCase()) hash = (hash * 31 + ch.codePointAt(0)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}
