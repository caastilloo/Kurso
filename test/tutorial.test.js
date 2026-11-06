import test from 'node:test';
import assert from 'node:assert/strict';
import { TOUR_STEPS, placePopover } from '../public/tutorial.js';

const viewport = { width: 1280, height: 800 };
const pop = { width: 320, height: 160 };
const box = (left, top, width, height) => ({ left, top, width, height, right: left + width, bottom: top + height });

test('el recorrido pasa por todos los apartados, de uno en uno', () => {
  assert.deepEqual(TOUR_STEPS.filter((s) => s.route).map((s) => s.route), ['faltas', 'tareas', 'notas', 'horario', 'ajustes']);
  assert.ok(TOUR_STEPS.every((s) => s.title && s.text && s.target));
  assert.ok(TOUR_STEPS.every((s) => !s.text.includes('—') && !s.text.includes('·')));
});

test('la tarjeta va a la derecha de la barra lateral, a la altura del elemento', () => {
  const at = placePopover(box(10, 200, 280, 40), pop, viewport);
  assert.equal(at.left, 304);
  assert.equal(at.top, 140);
});

test('nunca se sale de la ventana', () => {
  const top = placePopover(box(10, 5, 280, 20), pop, viewport);
  assert.equal(top.top, 12);
  const bottom = placePopover(box(10, 780, 280, 20), pop, viewport);
  assert.equal(bottom.top, 800 - 160 - 12);
});

test('sin sitio a la derecha va debajo, y si no arriba', () => {
  const below = placePopover(box(1000, 100, 260, 40), pop, viewport);
  assert.deepEqual(below, { left: 948, top: 154 });
  const above = placePopover(box(1000, 700, 260, 60), pop, viewport);
  assert.deepEqual(above, { left: 948, top: 526 });
});
