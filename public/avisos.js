// Lógica de las tareas sin interfaz: fechas de entrega, avisos y estado actualizado.
const weekdayFmt = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'short' });
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export function dayDiff(sec, now = new Date()) {
  return Math.round((startOfDay(new Date(sec * 1000)) - startOfDay(now)) / 86400000);
}

// Una entrega "el sábado a las 00:00" termina en realidad el viernes por la noche.
export const isMidnight = (sec) => {
  const d = new Date(sec * 1000);
  return d.getHours() === 0 && d.getMinutes() === 0;
};
// El último día en que de verdad se puede entregar, que es el que se muestra en toda la app.
export const effectiveDue = (sec) => (isMidnight(sec) ? sec - 60 : sec);

// Los datos pueden tener unos minutos: lo que acaba de pasar de fecha ya está vencido.
export function liveTasks(tasks, now = new Date()) {
  const nowSec = now.getTime() / 1000;
  return tasks.map((t) => (t.state === 'pendiente' && t.due && t.due < nowSec
    ? { ...t, state: 'vencida', canStillSubmit: true }
    : t));
}

function dayLabel(diff, sec) {
  if (diff === 0) return 'Hoy';
  if (diff === 1) return 'Mañana';
  if (diff === 2) return 'Pasado mañana';
  const text = weekdayFmt.format(new Date(sec * 1000)).replace('.', '').replace(',', '');
  return `${text[0].toUpperCase()}${text.slice(1)}`;
}

// Incluye todas las tareas de cada día, nunca solo la primera. Si no hay nada en los
// próximos días, enseña el primer día con entregas para que el panel no engañe.
export function upcomingGroups(tasks, now = new Date(), days = 7) {
  const visible = liveTasks(tasks, now).filter((t) => !t.hidden);
  const overdue = visible
    .filter((t) => t.state === 'vencida' && t.canStillSubmit)
    .sort((a, b) => (b.due ?? 0) - (a.due ?? 0));
  const pending = visible
    .filter((t) => t.state === 'pendiente' && t.due)
    .sort((a, b) => a.due - b.due);
  const diffOf = (t) => dayDiff(effectiveDue(t.due), now);

  const soon = pending.filter((t) => diffOf(t) <= days);
  const shown = soon.length || !pending.length
    ? soon
    : pending.filter((t) => diffOf(t) === diffOf(pending[0]));

  const groups = [];
  for (const task of shown) {
    const diff = diffOf(task);
    let group = groups[groups.length - 1];
    if (group?.diff !== diff) {
      group = { diff, label: dayLabel(diff, effectiveDue(task.due)), tasks: [] };
      groups.push(group);
    }
    group.tasks.push(task);
  }
  return { overdue, groups };
}

// El número que muestra el botón: exactamente lo que hay dentro del panel.
export function noticeCount(tasks, now = new Date(), days = 7) {
  const { overdue, groups } = upcomingGroups(tasks, now, days);
  return overdue.length + groups.reduce((n, g) => n + g.tasks.length, 0);
}

const monthFmt = new Intl.DateTimeFormat('es-ES', { month: 'long' });

// Secciones por mes, en el orden en que llegan las tareas.
export function monthSections(tasks, dateOf, now = new Date()) {
  const sections = new Map();
  const undated = [];
  for (const task of tasks) {
    const sec = dateOf(task);
    if (!sec) {
      undated.push(task);
      continue;
    }
    const d = new Date(sec * 1000);
    const id = `${d.getFullYear()}-${d.getMonth()}`;
    if (!sections.has(id)) {
      const month = monthFmt.format(d);
      const name = `${month[0].toUpperCase()}${month.slice(1)}`;
      sections.set(id, { id, label: d.getFullYear() === now.getFullYear() ? name : `${name} ${d.getFullYear()}`, tasks: [] });
    }
    sections.get(id).tasks.push(task);
  }
  const list = [...sections.values()];
  if (undated.length) list.push({ id: 'sin-fecha', label: 'Sin fecha', tasks: undated });
  return list;
}

// Las entregas del primer día que tenga alguna, sea cuando sea. La lista puede venir sin ordenar.
export function firstDayTasks(tasks, now = new Date()) {
  const dated = tasks.filter((t) => t.due);
  if (!dated.length) return [];
  const diffOf = (t) => dayDiff(effectiveDue(t.due), now);
  const first = Math.min(...dated.map(diffOf));
  return dated.filter((t) => diffOf(t) === first).sort((a, b) => a.due - b.due);
}

// "65,00 / 100,00" se lee mejor como "65 / 100". Lo que no es un número se deja igual.
export const formatGrade = (grade) => (grade
  ? grade.replace(/(\d),(\d)0\b/g, '$1,$2').replace(/,0(?=\D|$)/g, '')
  : grade);

const normalize = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Busca sin distinguir mayúsculas ni acentos, y todas las palabras tienen que aparecer.
export function matchesSearch(text, query) {
  const haystack = normalize(text);
  return normalize(query).split(/\s+/).filter(Boolean).every((word) => haystack.includes(word));
}
