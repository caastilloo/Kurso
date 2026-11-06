import test from 'node:test';
import assert from 'node:assert/strict';
import { parseGrades } from '../src/itaca.js';
import { mergeGrades } from '../src/notas.js';
import { formatAverage, gradeKind, gradeNumber, gradesSummary, hasGrades } from '../public/notas.js';

const SUBJECTS = [
  { code: 'DWES', keywords: ['entorno servidor'] },
  { code: 'DIW', keywords: ['interfaces'] },
];

const page = (content) => `<input id="tokenSesion" value="secreto"><section><div class="imc-contenido">${content}</div></section><aside><a href="#">Atrás</a></aside>`;

// Estructura deducida de las clases de alumno_ma_calificaciones.css de Web Familia.
const TABLE = `<table class="imc-calificaciones-tabla">
  <thead><tr><th>Módulo</th><th>1&ordf; Eval. <span>10/12/2026</span></th><th>2ª Eval.</th><th>Final</th></tr></thead>
  <tbody>
    <tr class="imc-fecha-evaluacion"><th>Fecha</th><td data-title="2ª Eval.">15/03/2027</td></tr>
    <tr>
      <td>Desarrollo Web en Entorno Servidor</td>
      <td class="imc-tipo"><abbr>Tipo</abbr> Pendiente</td>
      <td data-title="1&ordf; Eval.">7,50</td><td data-title="2ª Eval.">4</td><td data-title="Final">&nbsp;</td>
    </tr>
    <tr>
      <td>Diseño de interfaces WEB</td>
      <td data-title="1&ordf; Eval."><a class="imc-dato" href="#">AP</a></td><td data-title="2ª Eval">-</td>
    </tr>
  </tbody>
</table>
<div class="imc-calificaciones-leyenda"><p>Leyenda</p><dl><dt>AP</dt><dd>Apto</dd><dt>NE</dt><dd>No evaluado</dd></dl></div>
<div class="imc-calificaciones-observaciones imc-ca-ob"><p class="imc-ca-ob-titulo">Observaciones</p>
  <ul><li><p class="imc-ca-ob-evaluacion">1ª Eval.</p><p>Buen trabajo &amp; constancia</p></li></ul></div>`;

test('sin notas publicadas devuelve una lista vacía, no un error', () => {
  const g = parseGrades(page('<p class="imc-sin-datos">No hay calificaciones disponibles.</p>'), SUBJECTS);
  assert.deepEqual(g, { evaluations: [], modules: [], legend: [], notes: [] });
  assert.equal(hasGrades(g), false);
});

test('una página desconocida es null: no se confunde con "no hay notas"', () => {
  assert.equal(parseGrades(page('<p>Otra cosa</p>'), SUBJECTS), null);
  assert.equal(parseGrades('<html>nada</html>', SUBJECTS), null);
  assert.equal(parseGrades(`<form id="imc-form-login"></form>${page('<p class="imc-sin-datos"></p>')}`, SUBJECTS), null);
});

test('lee módulos, evaluaciones, fechas, tipo, leyenda y observaciones', () => {
  const g = parseGrades(page(TABLE), SUBJECTS);
  assert.deepEqual(g.evaluations.slice(0, 3), [
    { name: '1ª Eval.', date: '10/12/2026' },
    { name: '2ª Eval.', date: '15/03/2027' },
    { name: 'Final', date: null },
  ]);
  assert.deepEqual(g.modules[0], {
    module: 'Desarrollo Web en Entorno Servidor',
    type: 'Tipo Pendiente',
    grades: [{ evaluation: '1ª Eval.', value: '7,50' }, { evaluation: '2ª Eval.', value: '4' }],
    subject: 'DWES',
  });
  assert.equal(g.modules[1].subject, 'DIW');
  assert.deepEqual(g.modules[1].grades, [{ evaluation: '1ª Eval.', value: 'AP' }]);
  assert.deepEqual(g.legend, [{ code: 'AP', meaning: 'Apto' }, { code: 'NE', meaning: 'No evaluado' }]);
  assert.deepEqual(g.notes, [{ evaluation: '1ª Eval.', text: 'Buen trabajo & constancia' }]);
});

test('sin data-title usa el orden de la cabecera', () => {
  const g = parseGrades(page(`<table class="imc-calificaciones-tabla"><thead><tr><th>Módulo</th><th>1ª</th><th>2ª</th></tr></thead>
    <tbody><tr><td>Inglés</td><td>6</td><td>8</td></tr></tbody></table>`), SUBJECTS);
  assert.deepEqual(g.modules[0].grades, [{ evaluation: '1ª', value: '6' }, { evaluation: '2ª', value: '8' }]);
  assert.equal(g.modules[0].subject, null);
});

test('una nota de la que no se sabe la evaluación invalida la página entera', () => {
  const html = page(`<table class="imc-calificaciones-tabla"><tbody><tr><td>Inglés</td><td>6</td></tr></tbody></table>`);
  assert.equal(parseGrades(html, SUBJECTS), null);
});

test('lee también la forma de listado', () => {
  const g = parseGrades(page(`<ul class="imc-calificaciones-listado"><li><h2><strong>Diseño de interfaces</strong><span>2º</span></h2>
    <ul><li><span class="imc-etiqueta">1ª Eval.</span><span class="imc-dato">9</span></li></ul></li></ul>`), SUBJECTS);
  assert.deepEqual(g.modules, [{ module: 'Diseño de interfaces', type: null, grades: [{ evaluation: '1ª Eval.', value: '9' }], subject: 'DIW' }]);
});

const graded = (value) => ({ evaluations: [{ name: '1ª', date: null }], modules: [{ module: 'Inglés', type: null, subject: null, grades: value ? [{ evaluation: '1ª', value }] : [] }], legend: [], notes: [] });

test('cuenta las notas nuevas y las que cambian, no las repetidas', () => {
  assert.equal(mergeGrades(null, graded('7')).newCount, 1);
  assert.equal(mergeGrades(graded('7'), graded('7')).newCount, 0);
  assert.equal(mergeGrades(graded('7'), graded('8')).newCount, 1);
  assert.equal(mergeGrades(null, graded(null)).newCount, 0);
});

test('si la web deja de enseñar notas conocidas, se conservan marcadas', () => {
  const { grades, newCount } = mergeGrades(graded('7'), { evaluations: [], modules: [], legend: [], notes: [] });
  assert.equal(newCount, 0);
  assert.equal(grades.stale, true);
  assert.equal(grades.modules[0].grades[0].value, '7');
  assert.equal(mergeGrades(grades, graded('7')).grades.stale, false);
});

test('distingue notas numéricas y abreviaturas', () => {
  assert.equal(gradeNumber('7,50'), 7.5);
  assert.equal(gradeNumber('10'), 10);
  assert.equal(gradeNumber('11'), null);
  assert.equal(gradeNumber('AP'), null);
  assert.equal(gradeKind('4,99'), 'fail');
  assert.equal(gradeKind('5'), 'pass');
  assert.equal(gradeKind('NE'), 'other');
});

test('el resumen usa la última evaluación con notas y deja las abreviaturas fuera de la media', () => {
  const data = {
    evaluations: [{ name: '1ª' }, { name: '2ª' }, { name: 'Final' }],
    modules: [
      { name: 'A', grades: [{ evaluation: '1ª', value: '2' }, { evaluation: '2ª', value: '8' }] },
      { name: 'B', grades: [{ evaluation: '2ª', value: '4' }] },
      { name: 'C', grades: [{ evaluation: '2ª', value: 'AP' }] },
    ],
  };
  assert.deepEqual(gradesSummary(data), { evaluation: '2ª', count: 3, average: 6, passed: 1, failed: ['B'] });
  assert.equal(formatAverage(7.25), '7,25');
  assert.equal(gradesSummary({ evaluations: [{ name: '1ª' }], modules: [{ name: 'A', grades: [] }] }), null);
});
