import test from 'node:test';
import assert from 'node:assert/strict';
import { firstNames, greetingFor, welcomePlan } from '../public/bienvenida.js';

test('saluda por el nombre, no por los apellidos', () => {
  assert.equal(firstNames('JOSÉ RAMÓN CASTILLO AMAT'), 'José Ramón');
  assert.equal(firstNames('ANA GARCÍA LÓPEZ'), 'Ana');
  assert.equal(firstNames('Ana García'), 'Ana');
  assert.equal(firstNames('Ana'), 'Ana');
  assert.equal(firstNames(''), '');
  assert.equal(firstNames(null), '');
  assert.equal(firstNames('  ÁLVARO   RUIZ   PÉREZ  '), 'Álvaro');
});
test('el saludo depende de la hora', () => {
  assert.equal(greetingFor(5), 'Buenas noches');
  assert.equal(greetingFor(6), 'Buenos días');
  assert.equal(greetingFor(13), 'Buenos días');
  assert.equal(greetingFor(14), 'Buenas tardes');
  assert.equal(greetingFor(20), 'Buenas tardes');
  assert.equal(greetingFor(21), 'Buenas noches');
});
test('con las dos cuentas conectadas solo saluda', () => {
  assert.equal(welcomePlan({ aules: true, itaca: true, onboardingDone: false }).mode, 'splash');
  assert.equal(welcomePlan({ aules: true, itaca: true, onboardingDone: true }).mode, 'splash');
});
test('la primera vez: presentación y las cuentas que falten', () => {
  assert.deepEqual(welcomePlan({ aules: false, itaca: false, onboardingDone: false }), { mode: 'wizard', steps: ['intro', 'aules', 'itaca'], returning: false });
  assert.deepEqual(welcomePlan({ aules: true, itaca: false, onboardingDone: false }).steps, ['intro', 'itaca']);
});
test('al volver sin alguna cuenta, pide solo esa y sin presentación', () => {
  assert.deepEqual(welcomePlan({ aules: false, itaca: false, onboardingDone: true }), { mode: 'wizard', steps: ['aules', 'itaca'], returning: true });
  assert.deepEqual(welcomePlan({ aules: true, itaca: false, onboardingDone: true }), { mode: 'wizard', steps: ['itaca'], returning: true });
  assert.deepEqual(welcomePlan({ aules: false, itaca: true, onboardingDone: true }).steps, ['aules']);
});
test('no vuelve a pedir la cuenta que dijiste que no usas', () => {
  assert.deepEqual(welcomePlan({ aules: false, itaca: false, onboardingDone: true, skipped: ['aules'] }).steps, ['itaca']);
  assert.equal(welcomePlan({ aules: true, itaca: false, onboardingDone: true, skipped: ['itaca'] }).mode, 'splash');
  assert.equal(welcomePlan({ aules: false, itaca: false, onboardingDone: true, skipped: ['aules', 'itaca'] }).mode, 'splash');
});
