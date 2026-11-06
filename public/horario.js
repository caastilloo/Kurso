// Lógica del horario, sin interfaz: dado el horario y la hora, qué toca ahora.
export const DAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const toMin = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

// Lunes = 0, como en el horario de Ítaca (getDay empieza en domingo).
export const dayIndex = (date) => (date.getDay() + 6) % 7;

// Filas de un día en orden. Dos asignaturas a la misma hora van en la misma franja, y un
// hueco entre clases es una fila propia (el recreo no sale en Ítaca, se deduce de ahí).
export function buildDay(schedule, day) {
  const slots = new Map();
  for (const entry of schedule.filter((e) => e.day === day)) {
    const key = `${entry.start}-${entry.end}`;
    if (!slots.has(key)) {
      slots.set(key, { kind: 'class', start: entry.start, end: entry.end, startMin: toMin(entry.start), endMin: toMin(entry.end), entries: [] });
    }
    slots.get(key).entries.push(entry);
  }
  const sorted = [...slots.values()].sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);
  const rows = [];
  sorted.forEach((slot, i) => {
    const prev = sorted[i - 1];
    if (prev && slot.startMin > prev.endMin) {
      rows.push({
        kind: 'break',
        label: slot.startMin - prev.endMin <= 40 ? 'Recreo' : 'Hueco libre',
        start: prev.end,
        end: slot.start,
        startMin: prev.endMin,
        endMin: slot.startMin,
        entries: [],
      });
    }
    rows.push(slot);
  });
  return rows;
}

export function liveState(schedule, now = new Date()) {
  const day = dayIndex(now);
  const nowMin = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
  let next = null;

  const rows = buildDay(schedule, day).map((row) => {
    let status = 'later';
    if (row.endMin <= nowMin) status = 'done';
    else if (row.startMin <= nowMin) status = 'now';
    else if (!next && row.kind === 'class') {
      status = 'next';
      next = { row, daysAhead: 0, day, minutes: row.startMin - nowMin };
    }
    const live = status === 'now'
      ? { progress: ((nowMin - row.startMin) / (row.endMin - row.startMin)) * 100, minutesLeft: row.endMin - nowMin }
      : {};
    return { ...row, status, ...live };
  });

  if (!next) {
    for (let ahead = 1; ahead <= 7; ahead += 1) {
      const target = (day + ahead) % 7;
      const first = buildDay(schedule, target).find((r) => r.kind === 'class');
      if (first) {
        next = { row: first, daysAhead: ahead, day: target };
        break;
      }
    }
  }

  const classes = rows.filter((r) => r.kind === 'class');
  const finished = classes.length > 0 && classes.every((r) => r.status === 'done');
  return {
    day,
    rows,
    current: rows.find((r) => r.status === 'now' && r.kind === 'class') ?? null,
    currentBreak: rows.find((r) => r.status === 'now' && r.kind === 'break') ?? null,
    next,
    hasClassesToday: classes.length > 0,
    finished,
    doneCount: classes.filter((r) => r.status === 'done').length,
    totalCount: classes.length,
  };
}

// ---------- Editor del horario ----------
export const EDITOR_DAYS = [0, 1, 2, 3, 4];
const DEFAULT_START = '08:00';
const DEFAULT_LENGTH_MIN = 55;
const LAST_MIN = 23 * 60 + 59;

const pad = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

// Un borrador por día, en orden. El editor solo llega de lunes a viernes, como la semana.
export function scheduleToDraft(schedule) {
  return EDITOR_DAYS.map((day) => (schedule ?? [])
    .filter((e) => e.day === day)
    .sort((a, b) => a.start.localeCompare(b.start))
    .map(({ start, end, name, module }) => ({ start, end, name: name ?? module })));
}

export const draftToEntries = (draft) => draft.flatMap((rows, day) => rows.map((r) => ({ day, ...r })));

// La clase nueva empieza donde acaba la anterior y dura lo mismo.
export function nextClass(rows) {
  const last = rows[rows.length - 1];
  const valid = last && /^\d\d:\d\d$/.test(last.start) && /^\d\d:\d\d$/.test(last.end) && last.start < last.end;
  const start = valid ? toMin(last.end) : toMin(DEFAULT_START);
  const length = valid ? toMin(last.end) - toMin(last.start) : DEFAULT_LENGTH_MIN;
  return { start: pad(Math.min(start, LAST_MIN - 1)), end: pad(Math.min(start + length, LAST_MIN)), name: '' };
}

// Une las sesiones seguidas de la misma asignatura en un solo bloque, como en un calendario.
export function mergeSessions(rows) {
  const out = [];
  for (const row of rows) {
    const prev = out[out.length - 1];
    const same = (a, b) => a.entries.map((e) => e.name).join('|') === b.entries.map((e) => e.name).join('|');
    if (row.kind === 'class' && prev?.kind === 'class' && prev.endMin === row.startMin && same(prev, row)) {
      prev.end = row.end;
      prev.endMin = row.endMin;
      prev.sessions += 1;
    } else {
      out.push(row.kind === 'class' ? { ...row, sessions: 1 } : row);
    }
  }
  return out;
}
