import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDay, liveState, dayIndex } from '../public/horario.js';
import { parseSchedule } from '../src/itaca.js';

const e = (day, start, end, name) => ({ day, start, end, name, module: name, subject: null });
const schedule = [
  e(0, '15:30', '16:25', 'Diseño'),
  e(0, '17:20', '18:15', 'Cliente'),
  e(0, '17:20', '18:15', 'Tutoría'),
  e(0, '18:35', '19:30', 'Cliente'),
  e(4, '14:35', '15:30', 'Itinerario'),
];
// 2 de noviembre de 2026 es lunes; 6 es viernes; 7 es sábado.
const at = (d, h, m = 0) => new Date(2026, 10, d, h, m);

test('el lunes es el día 0 y el domingo el 6', () => {
  assert.equal(dayIndex(at(2, 10)), 0);
  assert.equal(dayIndex(at(8, 10)), 6);
});
test('dos asignaturas a la misma hora comparten franja', () => {
  const rows = buildDay(schedule, 0).filter((r) => r.kind === 'class');
  assert.equal(rows.length, 3);
  assert.deepEqual(rows[1].entries.map((x) => x.name), ['Cliente', 'Tutoría']);
});
test('el hueco corto es recreo y el largo no', () => {
  const breaks = buildDay(schedule, 0).filter((r) => r.kind === 'break');
  assert.deepEqual(breaks.map((b) => [b.start, b.end, b.label]), [['16:25', '17:20', 'Hueco libre'], ['18:15', '18:35', 'Recreo']]);
});
test('en mitad de una clase: actual, progreso y siguiente', () => {
  const s = liveState(schedule, at(2, 15, 40));
  assert.equal(s.current.start, '15:30');
  assert.ok(Math.abs(s.current.minutesLeft - 45) < 1e-9);
  assert.ok(s.current.progress > 18 && s.current.progress < 19);
  assert.equal(s.next.row.start, '17:20');
  assert.equal(s.next.daysAhead, 0);
  assert.equal(s.doneCount, 0);
});
test('las clases pasadas quedan completadas', () => {
  const s = liveState(schedule, at(2, 18, 40));
  assert.deepEqual(s.rows.filter((r) => r.kind === 'class').map((r) => r.status), ['done', 'done', 'now']);
  assert.equal(s.doneCount, 2);
});
test('el cambio de clase exacto ya cuenta como la nueva', () => {
  const s = liveState(schedule, at(2, 15, 30));
  assert.equal(s.current.start, '15:30');
  assert.equal(liveState(schedule, at(2, 16, 25)).current, null);
});
test('durante el recreo no hay clase actual', () => {
  const s = liveState(schedule, at(2, 18, 20));
  assert.equal(s.current, null);
  assert.equal(s.currentBreak.label, 'Recreo');
  assert.equal(s.next.row.start, '18:35');
});
test('antes de empezar, la primera clase es la siguiente', () => {
  const s = liveState(schedule, at(2, 9));
  assert.equal(s.current, null);
  assert.equal(s.finished, false);
  assert.equal(s.next.row.start, '15:30');
});
test('al terminar, la siguiente es del próximo día con clase', () => {
  const s = liveState(schedule, at(2, 22));
  assert.equal(s.finished, true);
  assert.equal(s.next.daysAhead, 4);
  assert.equal(s.next.day, 4);
});
test('el fin de semana no hay clases y salta al lunes', () => {
  const s = liveState(schedule, at(7, 12));
  assert.equal(s.hasClassesToday, false);
  assert.equal(s.next.day, 0);
  assert.equal(s.next.daysAhead, 2);
});
test('sin horario no falla', () => {
  assert.equal(liveState([], at(2, 12)).next, null);
});

const HTML = `<div class="imc-contenido"><table class="imc-horarios"><thead><tr><th class="imc-dia" colspan="2">Miércoles</th></tr></thead><tbody>
<tr><th class="imc-hora"><strong>15:30</strong><span>- 16:25</span></th>
<td>Diseño de interfaces WEB (2CFS)</td></tr>
<tr><th class="imc-hora"><strong>17:20</strong><span>- 18:15</span></th>
<td>Tutoría Segundo (2CFS)</td></tr></tbody></table></div>`;
test('lee las tablas de Web Familia y quita el grupo del nombre', () => {
  assert.deepEqual(parseSchedule(HTML, [{ code: 'DIW', keywords: ['interfaces'] }]), [
    { day: 2, start: '15:30', end: '16:25', module: 'Diseño de interfaces WEB', subject: 'DIW' },
    { day: 2, start: '17:20', end: '18:15', module: 'Tutoría Segundo', subject: null },
  ]);
});
test('una página sin tablas no se toma por un horario vacío', () => {
  assert.equal(parseSchedule('<html></html>', []), null);
});

test('une sesiones seguidas de la misma asignatura', async () => {
  const { mergeSessions } = await import('../public/horario.js');
  const day = [e(0, '15:30', '16:25', 'DIW'), e(0, '16:25', '17:20', 'DIW'), e(0, '17:20', '18:15', 'Cliente'), e(0, '18:35', '19:30', 'Cliente')];
  const rows = mergeSessions(buildDay(day, 0));
  assert.deepEqual(rows.map((r) => [r.kind, r.start, r.end, r.sessions]), [
    ['class', '15:30', '17:20', 2],
    ['class', '17:20', '18:15', 1],
    ['break', '18:15', '18:35', undefined],
    ['class', '18:35', '19:30', 1],
  ]);
});
test('no une franjas compartidas con otra distinta', async () => {
  const { mergeSessions } = await import('../public/horario.js');
  const rows = mergeSessions(buildDay([e(0, '16:25', '17:20', 'Cliente'), e(0, '17:20', '18:15', 'Cliente'), e(0, '17:20', '18:15', 'Tutoría')], 0));
  assert.equal(rows.length, 2);
});
