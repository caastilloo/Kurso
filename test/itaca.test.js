import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDayList, parseDayDetail, matchSubject, mergeAbsences } from '../src/itaca.js';

const item = (mod, time) => `<ul class="imc-av-detalle"><li><ul>
  <li><span class="imc-etiqueta">Módulo</span>
      <span class="imc-dato"><strong>${mod}</strong></span></li>
  <li><span class="imc-etiqueta">Horario inicio / fin</span>
      <span class="imc-dato">De ${time} h.</span></li>
  <li><span class="imc-etiqueta">Profesor/a</span><span class="imc-dato">NOMBRE</span></li>
</ul></li></ul>`;

const LIST = `<ul class="imc-listado-detalle imc-listado-faltas">
<li class="imc-li-de-nuevo" data-date='02-11-2026'>
<a href="alumno_avisos_wf?tipo=fa&fecha_id=02/11/2026" data-id="02/11/2026" class="bt-av-falta">Lunes, <span class="bt-av-falta-fecha">02/11/2026</span> <span class="bt-av-falta-num">1</span></a></li>
<li data-date='21-10-2026'>
<a href="alumno_avisos_wf?tipo=fa&fecha_id=21/10/2026" data-id="21/10/2026" class="bt-av-falta">Miércoles, <span class="bt-av-falta-fecha">21/10/2026</span> <span class="bt-av-falta-num">3</span></a></li>
</ul>`;

test('lee los días y cuántos registros tiene cada uno', () => {
  assert.deepEqual(parseDayList(LIST), [{ date: '02/11/2026', count: 1 }, { date: '21/10/2026', count: 3 }]);
});
test('una lista sin faltas devuelve cero días', () => {
  assert.deepEqual(parseDayList('<ul class="imc-listado-faltas"></ul>'), []);
});
test('distingue faltas y retrasos, justificados o no', () => {
  const html = `<!-- BLOQUE FALTAS SIN JUSTIFICAR -->${item('Diseño de interfaces WEB', '15:30 - 16:25')}${item('Diseño &amp; algo', '16:25 - 17:20')}
    <!-- BLOQUE RETRASOS SIN JUSTIFICAR -->${item('Inglés', '17:20 - 18:15')}
    <!-- BLOQUE FALTAS JUSTIFICADAS -->${item('Despliegue', '18:35 - 19:30')}
    <!-- BLOQUE RETRASOS JUSTIFICADOS -->${item('Sostenibilidad', '19:30 - 20:25')}
    <!-- BLOQUE COMPORTAMIENTO -->${item('Tutoría', '20:25 - 21:20')}`;
  assert.deepEqual(parseDayDetail(html), [
    { module: 'Diseño de interfaces WEB', time: '15:30', type: 'falta', justified: false },
    { module: 'Diseño & algo', time: '16:25', type: 'falta', justified: false },
    { module: 'Inglés', time: '17:20', type: 'retraso', justified: false },
    { module: 'Despliegue', time: '18:35', type: 'falta', justified: true },
    { module: 'Sostenibilidad', time: '19:30', type: 'retraso', justified: true },
  ]);
});
test('una página sin marcas se considera no reconocida, no "sin faltas"', () => {
  assert.equal(parseDayDetail('<html>otra cosa</html>'), null);
});

const subjects = [
  { code: 'PI2', keywords: ['intermodular', 'proyecto'] },
  { code: 'DIW', keywords: ['interfaces'] },
  { code: 'ING', keywords: ['inglés'] },
  { code: 'DAW', keywords: ['despliegue'] },
];
test('asocia los nombres de Ítaca con tus asignaturas', () => {
  assert.equal(matchSubject('Proyecto intermodular 2 de Desarrollo de aplicaciones WEB', subjects), 'PI2');
  assert.equal(matchSubject('Diseño de interfaces WEB', subjects), 'DIW');
  assert.equal(matchSubject('INGLÉS ORAL PARA ENTORNOS PROFESIONALES', subjects), 'ING');
  assert.equal(matchSubject('Tutoría Segundo', subjects), null);
});

const itaca = (id, date, extra = {}) => ({ id, source: 'itaca', date, ...extra });
test('una falta que pasa a justificada se actualiza sin duplicarse', () => {
  const r = mergeAbsences([itaca('a', '2026-10-07', { justified: false })], [itaca('a', '2026-10-07', { justified: true })], ['2026-10-07']);
  assert.equal(r.length, 1);
  assert.equal(r[0].justified, true);
});
test('una falta que ya no sale se conserva y se marca', () => {
  const r = mergeAbsences([itaca('a', '2026-10-07')], [], ['2026-10-07']);
  assert.equal(r.length, 1);
  assert.equal(r[0].missing, true);
});
test('las faltas manuales no se tocan', () => {
  const manual = { id: 'm', source: 'manual', date: '2026-10-07' };
  assert.deepEqual(mergeAbsences([manual], [], ['2026-10-07']), [manual]);
});
test('si vuelve a aparecer deja de estar marcada', () => {
  const r = mergeAbsences([itaca('a', '2026-10-07', { missing: true })], [itaca('a', '2026-10-07')], ['2026-10-07']);
  assert.equal(r[0].missing, undefined);
});
