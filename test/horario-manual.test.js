import test from 'node:test';
import assert from 'node:assert/strict';
import { colorForName, normalizeManualSchedule } from '../src/horario.js';
import { draftToEntries, liveState, nextClass, scheduleToDraft } from '../public/horario.js';

const SUBJECTS = [{ code: 'DWES', keywords: ['entorno servidor'] }];
const entry = (over) => ({ day: 0, start: '08:00', end: '09:00', name: 'Matemáticas', ...over });
const rejects = (entries, re) => assert.throws(() => normalizeManualSchedule(entries, SUBJECTS), (e) => e.status === 400 && re.test(e.message));

test('deja el horario escrito igual que el de Web Familia y en orden', () => {
  const out = normalizeManualSchedule([
    entry({ day: 1, name: '  Lengua ' }),
    entry({ start: '09:00', end: '10:00', name: 'Desarrollo Web en Entorno Servidor' }),
    entry(),
  ], SUBJECTS);
  assert.deepEqual(out, [
    { day: 0, start: '08:00', end: '09:00', module: 'Matemáticas', subject: null },
    { day: 0, start: '09:00', end: '10:00', module: 'Desarrollo Web en Entorno Servidor', subject: 'DWES' },
    { day: 1, start: '08:00', end: '09:00', module: 'Lengua', subject: null },
  ]);
});

test('rechaza lo que no se podría usar, diciendo qué falla', () => {
  rejects([], /al menos una clase/);
  rejects(null, /al menos una clase/);
  rejects([entry({ name: '   ' })], /Falta el nombre/);
  rejects([entry({ start: '10:00', end: '09:00' })], /termina antes de empezar/);
  rejects([entry({ start: '09:00', end: '09:00' })], /termina antes de empezar/);
  rejects([entry({ start: '25:00' })], /Revisa las horas/);
  rejects([entry({ start: '8:00' })], /Revisa las horas/);
  rejects([entry({ day: 5 })], /día que no es válido/);
  rejects([entry({ day: 'x' })], /día que no es válido/);
  rejects([entry({ name: 'x'.repeat(81) })], /demasiado largo/);
  rejects(Array.from({ length: 201 }, () => entry()), /demasiadas/);
});

test('dos clases que se pisan no pasan, salvo que coincidan exactamente', () => {
  rejects([entry(), entry({ start: '08:30', end: '09:30', name: 'Lengua' })], /se pisan el lunes/);
  assert.equal(normalizeManualSchedule([entry(), entry({ name: 'Lengua' })], SUBJECTS).length, 2);
  assert.equal(normalizeManualSchedule([entry(), entry({ start: '09:00', end: '10:00' })], SUBJECTS).length, 2);
  assert.equal(normalizeManualSchedule([entry(), entry({ day: 1, start: '08:30', end: '09:30' })], SUBJECTS).length, 2);
});

test('una asignatura desconocida tiene siempre el mismo color', () => {
  assert.equal(colorForName('Matemáticas'), colorForName('matemáticas'));
  assert.match(colorForName('Lengua'), /^#[0-9A-F]{6}$/);
});

test('la clase nueva sigue a la anterior con la misma duración', () => {
  assert.deepEqual(nextClass([]), { start: '08:00', end: '08:55', name: '' });
  assert.deepEqual(nextClass([{ start: '15:30', end: '16:25', name: 'A' }]), { start: '16:25', end: '17:20', name: '' });
  assert.deepEqual(nextClass([{ start: '', end: '', name: 'A' }]), { start: '08:00', end: '08:55', name: '' });
  assert.deepEqual(nextClass([{ start: '23:00', end: '23:50', name: 'A' }]), { start: '23:50', end: '23:59', name: '' });
});

test('del horario al editor y vuelta', () => {
  const schedule = [
    { day: 1, start: '10:00', end: '11:00', name: 'B', module: 'b' },
    { day: 1, start: '09:00', end: '10:00', name: 'A', module: 'a' },
    { day: 6, start: '09:00', end: '10:00', name: 'Domingo', module: 'd' },
  ];
  const draft = scheduleToDraft(schedule);
  assert.equal(draft.length, 5);
  assert.deepEqual(draft[1].map((r) => r.name), ['A', 'B']);
  assert.deepEqual(draftToEntries(draft), [
    { day: 1, start: '09:00', end: '10:00', name: 'A' },
    { day: 1, start: '10:00', end: '11:00', name: 'B' },
  ]);
  assert.deepEqual(scheduleToDraft(null), [[], [], [], [], []]);
});

test('el horario en directo funciona igual con uno escrito a mano', () => {
  const schedule = normalizeManualSchedule([entry({ start: '08:00', end: '09:00' }), entry({ start: '09:30', end: '10:30', name: 'Lengua' })], SUBJECTS)
    .map((e) => ({ ...e, name: e.module }));
  const monday = new Date(2026, 10, 2, 8, 30);
  assert.equal(liveState(schedule, monday).current.entries[0].name, 'Matemáticas');
  assert.equal(liveState(schedule, new Date(2026, 10, 2, 9, 10)).currentBreak.label, 'Recreo');
});
