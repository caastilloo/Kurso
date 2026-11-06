import test from 'node:test';
import assert from 'node:assert/strict';
import { summarize } from '../src/faltas.js';
import { classifyAssignment, academicYearStart } from '../src/aules.js';

const settings = { limitPct: 15, countJustified: true, countLates: false };
const subject = (totalHours) => [{ code: 'X', name: 'X', color: '#000', totalHours }];
const faltas = (n, extra = {}) => Array.from({ length: n }, () => ({ subject: 'X', hours: 1, type: 'falta', justified: false, ...extra }));

test('llegar justo al 15% ya supera el límite', () => {
  const [s] = summarize(subject(100), faltas(15), settings);
  assert.equal(s.status, 'critical');
  assert.equal(s.remaining, 0);
});
test('las horas seguras quedan por debajo del límite', () => {
  const [s] = summarize(subject(100), faltas(10), settings);
  assert.equal(s.remaining, 4); // 14 es lo máximo sin alcanzar 15
});
test('un límite con decimales se redondea hacia arriba al alcanzarlo', () => {
  const [a] = summarize(subject(132), faltas(19), settings); // 19,8 h
  assert.equal(a.remaining, 0);
  assert.notEqual(a.status, 'critical');
  const [b] = summarize(subject(132), faltas(20), settings);
  assert.equal(b.status, 'critical');
});
test('sin horas totales no se inventa un límite', () => {
  const [s] = summarize(subject(null), faltas(3), settings);
  assert.equal(s.limit, null);
  assert.equal(s.status, 'unknown');
  assert.equal(s.hours, 3);
});
test('las justificadas y retrasos respetan los ajustes', () => {
  const list = [...faltas(2, { justified: true }), ...faltas(1), { subject: 'X', type: 'retraso', hours: 0, justified: false }];
  assert.equal(summarize(subject(100), list, settings)[0].hours, 3);
  assert.equal(summarize(subject(100), list, { ...settings, countJustified: false })[0].hours, 1);
});

const now = 1_800_000_000;
const status = (s, extra = {}) => ({ lastattempt: { submissionsenabled: true, submission: { status: s, timemodified: 5 }, ...extra } });
test('tarea entregada', () => {
  assert.equal(classifyAssignment({ duedate: now - 10 }, status('submitted'), now).state, 'entregada');
});
test('tarea futura sin entregar es pendiente', () => {
  assert.equal(classifyAssignment({ duedate: now + 10 }, status('new'), now).state, 'pendiente');
});
test('vencida con y sin fecha de corte', () => {
  assert.equal(classifyAssignment({ duedate: now - 10 }, status('new'), now).canStillSubmit, true);
  const closed = classifyAssignment({ duedate: now - 10, cutoffdate: now - 5 }, status('new'), now);
  assert.equal(closed.state, 'vencida');
  assert.equal(closed.canStillSubmit, false);
});
test('una prórroga evita que salga como vencida', () => {
  assert.equal(classifyAssignment({ duedate: now - 10 }, status('new', { extensionduedate: now + 100 }), now).state, 'pendiente');
});
test('una tarea reabierta vuelve a estar pendiente', () => {
  assert.equal(classifyAssignment({ duedate: now + 10 }, status('reopened'), now).state, 'pendiente');
});
test('sin entrega online no aparece', () => {
  assert.equal(classifyAssignment({ nosubmissions: 1 }, status('new'), now), null);
});
test('calificada sin entrega online cuenta como hecha', () => {
  assert.equal(classifyAssignment({ duedate: now - 10 }, status('new', { gradingstatus: 'graded' }), now).state, 'entregada');
});
test('el curso empieza el 1 de septiembre', () => {
  assert.equal(new Date(academicYearStart(new Date(2026, 10, 4)) * 1000).getFullYear(), 2026);
  assert.equal(new Date(academicYearStart(new Date(2027, 1, 4)) * 1000).getFullYear(), 2026);
});
test('un retraso contado suma una hora', () => {
  const list = [{ subject: 'X', type: 'retraso', hours: 0, justified: false }];
  assert.equal(summarize(subject(100), list, { ...settings, countLates: true })[0].hours, 1);
});
test('un evento de Aules se reconoce por el cmid de su URL', async () => {
  const { eventCmid } = await import('../src/aules.js');
  assert.equal(eventCmid({ url: 'https://aules.edu.gva.es/fp/mod/assign/view.php?id=11616339', instance: 1 }), 11616339);
  assert.equal(eventCmid({ url: 'no-es-url', instance: 7 }), 7);
});
test('calificada sin entrega no finge una fecha de entrega', () => {
  const r = classifyAssignment({ duedate: now - 10 }, status('new', { gradingstatus: 'graded' }), now);
  assert.equal(r.gradedOnly, true);
  assert.equal(r.submittedAt, null);
});
test('una vencida que Aules ya no deja editar está cerrada', () => {
  assert.equal(classifyAssignment({ duedate: now - 10 }, status('new', { canedit: false }), now).canStillSubmit, false);
});
test('avisa de cuándo abre una tarea futura', () => {
  assert.equal(classifyAssignment({ duedate: now + 99, allowsubmissionsfromdate: now + 9 }, status('new'), now).opensAt, now + 9);
});
test('limpia entidades HTML de notas y nombres', async () => {
  const { stripHtml } = await import('../src/aules.js');
  assert.equal(stripHtml('65,00&nbsp;/&nbsp;100,00'), '65,00 / 100,00');
  assert.equal(stripHtml('Relational mapping (10/12 &amp; 11/12)'), 'Relational mapping (10/12 & 11/12)');
});
test('limpia las coletillas de los nombres de curso', async () => {
  const { cleanCourseName } = await import('../src/aules.js');
  assert.equal(cleanCourseName("Desarrollo Web en Entorno servidor'-'2CFSC"), 'Desarrollo Web en Entorno servidor');
  assert.equal(cleanCourseName("Projecte intermodular 2 de Desenvolupament d'aplicacions WEB-2CFSC"), "Projecte intermodular 2 de Desenvolupament d'aplicacions WEB");
  assert.equal(cleanCourseName('Sostenibilidad aplicada al sistema productivo  2026-2027'), 'Sostenibilidad aplicada al sistema productivo');
  assert.equal(cleanCourseName('2DAW - Diseño de Interfaces Web'), 'Diseño de Interfaces Web');
  assert.equal(cleanCourseName('TUTORIA 2DAW'), 'TUTORIA 2DAW');
});
