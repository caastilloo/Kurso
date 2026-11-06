import test from 'node:test';
import assert from 'node:assert/strict';
import { firstDayTasks, monthSections, effectiveDue, formatGrade, isMidnight, liveTasks, matchesSearch, noticeCount, upcomingGroups, dayDiff } from '../public/avisos.js';

const now = new Date(2026, 10, 5, 12, 0);
const at = (d, h = 23, m = 59) => Math.floor(new Date(2026, 10, d, h, m).getTime() / 1000);
const task = (name, due, extra = {}) => ({ name, due, state: 'pendiente', hidden: false, ...extra });

test('varias entregas del mismo día salen todas en su grupo', () => {
  const { groups } = upcomingGroups([task('A', at(6)), task('B', at(6, 10)), task('C', at(6, 12))], now);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].label, 'Mañana');
  assert.deepEqual(groups[0].tasks.map((t) => t.name), ['B', 'C', 'A']);
});
test('nombra los días cercanos y luego la fecha', () => {
  const { groups } = upcomingGroups([task('A', at(5)), task('B', at(6)), task('C', at(7)), task('D', at(9))], now);
  assert.deepEqual(groups.map((g) => g.label), ['Hoy', 'Mañana', 'Pasado mañana', 'Lunes 9 nov']);
});
test('una entrega a medianoche cuenta en su día, no en el anterior', () => {
  assert.equal(dayDiff(at(14, 0, 0), now), 9);
});
test('más allá de la semana no llena el panel', () => {
  const { groups } = upcomingGroups([task('A', at(6)), task('B', at(20))], now);
  assert.deepEqual(groups.flatMap((g) => g.tasks.map((t) => t.name)), ['A']);
});
test('si no hay nada esta semana enseña el primer día con entregas', () => {
  const { groups } = upcomingGroups([task('A', at(20)), task('B', at(20, 10)), task('C', at(25))], now);
  assert.deepEqual(groups.flatMap((g) => g.tasks.map((t) => t.name)), ['B', 'A']);
});
test('las vencidas solo aparecen si aún admiten entrega', () => {
  const { overdue } = upcomingGroups([
    task('Abierta', at(1), { state: 'vencida', canStillSubmit: true }),
    task('Cerrada', at(1), { state: 'vencida', canStillSubmit: false }),
  ], now);
  assert.deepEqual(overdue.map((t) => t.name), ['Abierta']);
});
test('una pendiente que acaba de pasar de fecha cuenta como vencida', () => {
  const { overdue, groups } = upcomingGroups([task('Pasada', at(5, 11, 0)), task('Luego', at(5, 18, 0))], now);
  assert.deepEqual(overdue.map((t) => t.name), ['Pasada']);
  assert.deepEqual(groups.flatMap((g) => g.tasks.map((t) => t.name)), ['Luego']);
});
test('no incluye ocultas, entregadas ni tareas sin fecha', () => {
  const r = upcomingGroups([
    task('Oculta', at(6), { hidden: true }),
    task('Hecha', at(6), { state: 'entregada' }),
    task('Sin fecha', null),
  ], now);
  assert.deepEqual(r, { overdue: [], groups: [] });
});
test('el número del botón coincide con lo que hay en el panel', () => {
  const tasks = [
    task('Vencida', at(1), { state: 'vencida', canStillSubmit: true }),
    task('Mañana 1', at(6)),
    task('Mañana 2', at(6, 10)),
    task('Lejana', at(25)),
    task('Oculta', at(6), { hidden: true }),
  ];
  assert.equal(noticeCount(tasks, now), 3);
  assert.equal(noticeCount([], now), 0);
});
test('una entrega a las 00:00 se cuenta en el día anterior', () => {
  assert.equal(isMidnight(at(14, 0, 0)), true);
  assert.equal(isMidnight(at(14, 23, 59)), false);
  assert.equal(new Date(effectiveDue(at(14, 0, 0)) * 1000).getDate(), 13);
  assert.equal(effectiveDue(at(14, 10, 0)), at(14, 10, 0));
  const { groups } = upcomingGroups([task('Medianoche', at(7, 0, 0))], now);
  assert.equal(groups[0].label, 'Mañana');
});
test('el estado se actualiza si la fecha ya ha pasado', () => {
  const [pasada, futura] = liveTasks([task('P', at(5, 11, 0)), task('F', at(5, 18, 0))], now);
  assert.equal(pasada.state, 'vencida');
  assert.equal(pasada.canStillSubmit, true);
  assert.equal(futura.state, 'pendiente');
});
test('las notas se muestran sin ceros de más', () => {
  assert.equal(formatGrade('65,00 / 100,00'), '65 / 100');
  assert.equal(formatGrade('9,30 / 10,00'), '9,3 / 10');
  assert.equal(formatGrade('8,05 / 10,00'), '8,05 / 10');
  assert.equal(formatGrade('Apto'), 'Apto');
  assert.equal(formatGrade(null), null);
});
test('la búsqueda ignora acentos y mayúsculas', () => {
  assert.equal(matchesSearch('Maquetación RESPONSIVE', 'maquetacion resp'), true);
  assert.equal(matchesSearch('Diseño de Interfaces', 'diseno'), true);
  assert.equal(matchesSearch('Diseño de Interfaces', 'docker'), false);
  assert.equal(matchesSearch('Lo que sea', '   '), true);
});
test('las entregas hechas se agrupan por su mes', () => {
  const m = monthSections([task('A', at(3))], (x) => x.due, now);
  assert.equal(m[0].label, 'Noviembre');
});
test('el resumen encuentra todas las entregas del primer día con alguna', () => {
  const tasks = [task('Lejana', at(20)), task('B', at(8, 23, 0)), task('A', at(8, 10, 0)), task('Sin fecha', null)];
  assert.deepEqual(firstDayTasks(tasks, now).map((x) => x.name), ['A', 'B']);
  assert.deepEqual(firstDayTasks([], now), []);
  assert.deepEqual(firstDayTasks([task('Sin fecha', null)], now), []);
});
test('una entrega de medianoche cuenta para el día anterior en el resumen', () => {
  const tasks = [task('Medianoche', at(8, 0, 0)), task('Ese dia', at(7, 22, 0)), task('Otro', at(8, 12, 0))];
  assert.deepEqual(firstDayTasks(tasks, now).map((x) => x.name), ['Ese dia', 'Medianoche']);
});
