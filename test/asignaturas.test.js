import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanModuleName, reconcileSubjects, weeklySessions } from '../src/asignaturas.js';
import { parseModules } from '../src/itaca.js';

// Recorte de la pantalla real "Módulo", con los datos de las personas cambiados.
const MODULES_PAGE = `<input id="tokenSesion" value="x"><div class="imc-contenido">
<table class="imc-materias-tabla"><thead><tr><th class="imc-area">Módulo</th><th class="imc-profesor">Profesor/a</th></tr></thead>
<tbody>
  <tr><td><p>Desarrollo WEB en entorno cliente (2CFS)</p></td><td data-title='Profesor/a'><p class="imc-profesor-nombre">NOMBRE</p></td><td>Miércoles, de 18:35 a 19:30 h.</td></tr>
  <tr><td>
    <p>INGL&Eacute;S ORAL PARA ENTORNOS PROFESIONALES (2CFS)</p>
  </td><td data-title='Profesor/a'><p>NOMBRE</p></td></tr>
</tbody></table></div><aside></aside>`;

test('lee los módulos matriculados de Web Familia', () => {
  assert.deepEqual(parseModules(MODULES_PAGE), ['Desarrollo WEB en entorno cliente (2CFS)', 'INGLÉS ORAL PARA ENTORNOS PROFESIONALES (2CFS)']);
  assert.deepEqual(parseModules('<div class="imc-contenido"><p class="imc-sin-datos">No hay</p></div>'), []);
  assert.equal(parseModules('<div class="imc-contenido"><p>Otra cosa</p></div>'), null);
  assert.equal(parseModules('<form id="imc-form-login"></form>'), null);
});

// Los módulos tal como los da la pantalla "Módulo" de Web Familia.
const MODULES = [
  'Desarrollo WEB en entorno cliente (2CFS)',
  'Digitalización aplicada al sistema productivo GS (2CFS)',
  'INGLÉS ORAL PARA ENTORNOS PROFESIONALES (2CFS)',
  'Tutoría Segundo (2CFS)',
];
const slot = (module, start, end, day = 0) => ({ day, start, end, module });

test('limpia los nombres de Web Familia', () => {
  assert.equal(cleanModuleName('Desarrollo WEB en entorno cliente (2CFS)'), 'Desarrollo WEB en entorno cliente');
  assert.equal(cleanModuleName('Digitalización aplicada al sistema productivo GS (2CFS)'), 'Digitalización aplicada al sistema productivo');
  assert.equal(cleanModuleName('INGLÉS ORAL PARA ENTORNOS PROFESIONALES (2CFS)'), 'Inglés oral para entornos profesionales');
});

test('un usuario nuevo recibe sus asignaturas, optativa incluida, sin la tutoría', () => {
  const out = reconcileSubjects([], MODULES, []);
  assert.deepEqual(out.map((s) => s.name), [
    'Desarrollo WEB en entorno cliente',
    'Digitalización aplicada al sistema productivo',
    'Inglés oral para entornos profesionales',
  ]);
  assert.ok(out.every((s) => s.code && /^#[0-9A-F]{6}$/.test(s.color) && s.totalHours === null));
  assert.equal(new Set(out.map((s) => s.code)).size, 3);
});

test('cada asignatura nueva tiene un color distinto mientras queden', () => {
  const names = Array.from({ length: 9 }, (_, i) => `Modulo ${i}`);
  const out = reconcileSubjects([{ code: 'X', name: 'Ya estaba', color: '#4986e7', keywords: ['ya estaba'] }], names, []);
  assert.equal(new Set(out.map((s) => s.color.toUpperCase())).size, 10);
});

test('las horas se estiman con las sesiones semanales del horario', () => {
  const schedule = [
    ...['15:30', '16:25', '17:20'].map((t, i) => slot('Desarrollo WEB en entorno cliente', t, ['16:25', '17:20', '18:15'][i])),
    slot('Desarrollo WEB en entorno cliente', '15:30', '17:20', 1), // clase doble: dos sesiones
    slot('Digitalización aplicada al sistema productivo GS', '18:35', '19:30', 2),
    slot('Tutoría Segundo', '19:30', '20:25', 2),
  ];
  const out = reconcileSubjects([], MODULES, schedule);
  const byName = Object.fromEntries(out.map((s) => [s.name, s]));
  assert.equal(byName['Desarrollo WEB en entorno cliente'].weeklySessions, 5);
  assert.equal(byName['Desarrollo WEB en entorno cliente'].totalHours, 167);
  assert.equal(byName['Desarrollo WEB en entorno cliente'].hoursSource, 'estimado');
  assert.equal(byName['Digitalización aplicada al sistema productivo'].totalHours, 33);
  assert.equal(byName['Inglés oral para entornos profesionales'].totalHours, null); // sin clases en el horario
});

test('con el horario de 2º DAW sale lo mismo que el currículo, con un margen de una hora', () => {
  const weekly = { A: 6, B: 6, C: 3, D: 4, E: 3, F: 3, G: 3, H: 1, I: 1 };
  const real = { A: 200, B: 200, C: 100, D: 133, E: 100, F: 100, G: 99, H: 34, I: 34 };
  const schedule = Object.entries(weekly).flatMap(([name, n]) => Array.from({ length: n }, (_, i) => slot(`Modulo ${name}`, `${String(8 + i).padStart(2, '0')}:00`, `${String(8 + i).padStart(2, '0')}:55`)));
  const out = reconcileSubjects([], [], schedule);
  for (const s of out) assert.ok(Math.abs(s.totalHours - real[s.name.at(-1).toUpperCase()]) <= 1, `${s.name}: ${s.totalHours}`);
});

test('nunca toca horas puestas a mano ni duplica asignaturas que ya existen', () => {
  const existing = [
    { code: 'DWEC', name: 'Desarrollo Web en Entorno Cliente', keywords: ['entorno cliente'], totalHours: 210, hoursSource: 'manual' },
    { code: 'ING', name: 'Inglés Profesional 2', keywords: ['ingles'], totalHours: 99 }, // de versiones anteriores
  ];
  const schedule = [slot('Desarrollo WEB en entorno cliente', '15:30', '16:25'), slot('INGLÉS ORAL', '16:25', '17:20')];
  const out = reconcileSubjects(existing, MODULES, schedule);
  assert.equal(out.find((s) => s.code === 'DWEC').totalHours, 210);
  assert.equal(out.find((s) => s.code === 'ING').totalHours, 99);
  assert.equal(out.filter((s) => /cliente/i.test(s.name)).length, 1);
  assert.equal(out.filter((s) => /ngl/i.test(s.name)).length, 1);
  assert.equal(out.length, 3); // solo se añade Digitalización
});

test('una estimación se rehace si cambia el horario', () => {
  const first = reconcileSubjects([], ['Lengua'], [slot('Lengua', '08:00', '08:55')]);
  assert.equal(first[0].totalHours, 33);
  const second = reconcileSubjects(first, ['Lengua'], [slot('Lengua', '08:00', '08:55'), slot('Lengua', '09:00', '09:55', 1)]);
  assert.equal(second[0].totalHours, 67);
});

test('cuenta sesiones por asignatura', () => {
  const subjects = [{ code: 'L', keywords: ['lengua'] }];
  assert.equal(weeklySessions(subjects, [slot('Lengua', '08:00', '08:55'), slot('Lengua', '09:00', '10:50')]).get('L'), 3);
});
