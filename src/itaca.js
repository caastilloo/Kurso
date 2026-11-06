// Web Familia no tiene API pública: es una aplicación Java con sesión por cookies.
// Este cliente hace lo mismo que tu navegador, con tu propia cuenta.
const BASE = 'https://familia.edu.gva.es/wf-front/myitaca';
const ITACA_HOST = new URL(BASE).host;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';

export class ItacaError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

const ENTITIES = { nbsp: ' ', quot: '"', apos: "'", lt: '<', gt: '>', ordf: 'ª', ordm: 'º', aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú', Aacute: 'Á', Eacute: 'É', Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú', ntilde: 'ñ', Ntilde: 'Ñ', uuml: 'ü', Uuml: 'Ü' };
const decode = (s) =>
  s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&([a-zA-Z]+);/g, (whole, name) => ENTITIES[name] ?? whole)
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();

const plain = (html) => decode(html.replace(/<[^>]*>/g, ' '));
const attribute = (attrs, name) => attrs.match(new RegExp(`${name}=["']([^"']*)["']`))?.[1];

const normalize = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Días con registros en la lista de Asistencias: [{ date: '02/11/2026', count: 1 }]
export function parseDayList(html) {
  return [...html.matchAll(/data-id="(\d{2}\/\d{2}\/\d{4})"[^>]*class="bt-av-falta"[\s\S]*?bt-av-falta-num">\s*(\d+)/g)].map(
    (m) => ({ date: m[1], count: Number(m[2]) })
  );
}

const BLOCKS = [
  { marker: 'BLOQUE FALTAS SIN JUSTIFICAR', type: 'falta', justified: false },
  { marker: 'BLOQUE RETRASOS SIN JUSTIFICAR', type: 'retraso', justified: false },
  { marker: 'BLOQUE FALTAS JUSTIFICADAS', type: 'falta', justified: true },
  { marker: 'BLOQUE RETRASOS JUSTIFICADOS', type: 'retraso', justified: true },
];
const END_MARKER = 'BLOQUE COMPORTAMIENTO';

// El detalle de un día separa cada tipo con un comentario HTML; es la marca más estable.
export function parseDayDetail(html) {
  const positions = [...BLOCKS.map((b) => b.marker), END_MARKER]
    .map((marker) => ({ marker, at: html.indexOf(`<!-- ${marker} -->`) }))
    .filter((p) => p.at >= 0)
    .sort((a, b) => a.at - b.at);
  if (!positions.some((p) => p.marker !== END_MARKER)) return null; // página no reconocida

  const items = [];
  positions.forEach((p, i) => {
    const block = BLOCKS.find((b) => b.marker === p.marker);
    if (!block) return;
    const section = html.slice(p.at, positions[i + 1]?.at ?? html.length);
    const re = /M[oó]dulo<\/span>\s*<span class="imc-dato">(?:<strong>)?([^<]+)[\s\S]*?Horario inicio \/ fin<\/span>\s*<span class="imc-dato">([^<]*)/g;
    for (const m of section.matchAll(re)) {
      const time = m[2].match(/(\d{1,2}:\d{2})/);
      items.push({ module: decode(m[1]), time: time ? time[1] : null, type: block.type, justified: block.justified });
    }
  });
  return items;
}

export function matchSubject(moduleName, subjects) {
  const n = normalize(moduleName);
  return subjects.find((s) => s.keywords.some((k) => n.includes(normalize(k))))?.code ?? null;
}

const toIso = (date) => date.split('/').reverse().join('-');
const toItacaDate = (iso) => iso.split('-').reverse().join('/');

function toAbsence(date, item, subjects) {
  const iso = toIso(date);
  return {
    id: `itaca:${iso}|${item.time ?? ''}|${item.module}|${item.type}`,
    source: 'itaca',
    subject: matchSubject(item.module, subjects) ?? 'OTRA',
    module: item.module,
    date: iso,
    time: item.time,
    hours: item.type === 'retraso' ? 0 : 1,
    type: item.type,
    justified: item.justified,
  };
}

// Los días consultados se sustituyen por lo que dice Ítaca. Si un día ya conocido deja de
// tener registros, se conserva marcado: no se sabe si lo han retirado o si la web ya no
// enseña faltas antiguas, y perderla en silencio falsearía el recuento a tu favor.
export function mergeAbsences(existing, fetched, checkedIsoDates) {
  const checked = new Set(checkedIsoDates);
  const fetchedDates = new Set(fetched.map((a) => a.date));
  const kept = existing
    .filter((a) => a.source !== 'itaca' || !fetchedDates.has(a.date))
    .map((a) => (a.source === 'itaca' && checked.has(a.date) ? { ...a, missing: true } : a));
  return [...kept, ...fetched];
}

const DAYS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];

// La página de horarios tiene una tabla por día. Devuelve null si no la reconoce.
export function parseSchedule(html, subjects) {
  const tables = html.split('<table class="imc-horarios"').slice(1);
  if (!tables.length) return null;
  const entries = [];
  for (const table of tables) {
    const dayName = table.match(/class="imc-dia"[^>]*>\s*([^<]+)/)?.[1];
    const day = dayName ? DAYS.indexOf(normalize(dayName.trim())) : -1;
    if (day < 0) return null;
    const re = /<strong>\s*(\d{1,2}:\d{2})\s*<\/strong>\s*<span>[^<]*?(\d{1,2}:\d{2})[^<]*<\/span>\s*<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>/g;
    for (const m of table.matchAll(re)) {
      const module = decode(m[3].replace(/<[^>]*>/g, ' ')).replace(/\s*\([^()]*\)\s*$/, '');
      entries.push({ day, start: m[1].padStart(5, '0'), end: m[2].padStart(5, '0'), module, subject: matchSubject(module, subjects) });
    }
  }
  return entries.length ? entries : null;
}

// Parte de la página de calificaciones con las notas, sin cabecera ni datos de sesión.
export function gradesContent(html) {
  const start = html.indexOf('class="imc-contenido"');
  if (start < 0 || html.includes('id="imc-form-login"')) return null;
  const end = html.indexOf('<aside', start);
  return html.slice(start, end < 0 ? html.length : end);
}

const EMPTY_GRADE = /^-*$/;

// Tabla de notas: una fila por módulo y una celda por evaluación. La fila de fechas
// y la del tipo de módulo llevan su propia clase. Devuelve null si algo no cuadra.
function parseGradeTable(table, out) {
  const head = table.match(/<thead[\s\S]*?<\/thead>/)?.[0] ?? '';
  const headers = [...head.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/g)].map((m) => ({
    name: plain(m[1].replace(/<span[\s\S]*?<\/span>/g, ' ')),
    date: plain(m[1].match(/<span[^>]*>([\s\S]*?)<\/span>/)?.[1] ?? ''),
  }));
  const columns = headers.slice(1);
  for (const c of columns) if (c.name) out.addEvaluation(c.name, c.date);

  for (const row of table.replace(head, '').matchAll(/<tr([^>]*)>([\s\S]*?)<\/tr>/g)) {
    const cells = [...row[2].matchAll(/<td([^>]*)>([\s\S]*?)<\/td>/g)].map((m) => ({ attrs: m[1], text: plain(m[2]) }));
    if (!cells.length) continue;
    if (row[1].includes('imc-fecha-evaluacion')) {
      for (const c of cells) {
        const title = attribute(c.attrs, 'data-title');
        if (title && c.text) out.addEvaluation(decode(title), c.text);
      }
      continue;
    }
    const [first, ...rest] = cells;
    if (!first.text) return null;
    const entry = { module: first.text, type: null, grades: [] };
    let column = 0;
    for (const c of rest) {
      if (c.attrs.includes('imc-tipo')) {
        entry.type = c.text;
        continue;
      }
      const title = decode(attribute(c.attrs, 'data-title') ?? '') || columns[column]?.name;
      column += 1;
      if (!title) return null; // sin saber de qué evaluación es, mejor no enseñar la nota
      out.addEvaluation(title);
      if (!EMPTY_GRADE.test(c.text)) entry.grades.push({ evaluation: title, value: c.text });
    }
    out.modules.push(entry);
  }
  return true;
}

// Forma alternativa de la misma página: un bloque por módulo con parejas etiqueta y dato.
function parseGradeList(list, out) {
  for (const block of list.split(/<h2[^>]*>/).slice(1)) {
    const [title, body = ''] = block.split('</h2>');
    const module = plain(title.match(/<strong[^>]*>([\s\S]*?)<\/strong>/)?.[1] ?? title);
    if (!module) return null;
    const grades = [];
    for (const m of body.matchAll(/imc-etiqueta[^>]*>([\s\S]*?)<\/span>\s*<span[^>]*imc-dato[^>]*>([\s\S]*?)<\/span>/g)) {
      const evaluation = plain(m[1]);
      const value = plain(m[2]);
      if (!evaluation) return null;
      out.addEvaluation(evaluation);
      if (!EMPTY_GRADE.test(value)) grades.push({ evaluation, value });
    }
    out.modules.push({ module, type: null, grades });
  }
  return true;
}

// Sin notas publicadas devuelve una lista vacía. Si la página no se reconoce devuelve
// null, que no es lo mismo: así nunca se confunde un cambio de la web con "no hay notas".
export function parseGrades(html, subjects) {
  const content = gradesContent(html);
  if (content === null) return null;

  const evaluations = new Map();
  const out = {
    modules: [],
    addEvaluation(name, date = '') {
      if (!evaluations.has(name) || date) evaluations.set(name, date || evaluations.get(name) || null);
    },
  };
  const tables = content.split(/<table[^>]*imc-calificaciones-tabla[^>]*>/).slice(1);
  for (const t of tables) {
    if (!parseGradeTable(t.split('</table>')[0], out)) return null;
  }
  if (!out.modules.length) {
    const lists = content.split(/<ul[^>]*imc-calificaciones-listado[^>]*>/).slice(1);
    for (const l of lists) {
      if (!parseGradeList(l, out)) return null;
    }
  }
  if (!out.modules.length && !content.includes('imc-sin-datos')) return null;

  const legendAt = content.indexOf('imc-calificaciones-leyenda');
  const legendHtml = legendAt < 0 ? '' : content.slice(legendAt, content.indexOf('</dl>', legendAt) + 1 || content.length);
  const legend = [...legendHtml.matchAll(/<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/g)]
    .map((m) => ({ code: plain(m[1]), meaning: plain(m[2]) }))
    .filter((l) => l.code);

  const notesAt = content.indexOf('imc-calificaciones-observaciones');
  const notesEnd = content.indexOf('imc-calificaciones-avanzada', notesAt);
  const notesHtml = notesAt < 0 ? '' : content.slice(notesAt, notesEnd < 0 ? content.length : notesEnd);
  const notes = [...notesHtml.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)]
    .map((m) => ({
      evaluation: plain(m[1].match(/<p[^>]*imc-ca-ob-evaluacion[^>]*>([\s\S]*?)<\/p>/)?.[1] ?? ''),
      text: plain(m[1].replace(/<p[^>]*imc-ca-ob-evaluacion[^>]*>[\s\S]*?<\/p>/, ' ')),
    }))
    .filter((n) => n.text);

  return {
    evaluations: [...evaluations].map(([name, date]) => ({ name, date })),
    modules: out.modules.map((m) => ({ ...m, subject: matchSubject(m.module, subjects) })),
    legend,
    notes,
  };
}

// Pantalla "Módulo": los módulos en los que está matriculado el alumno, optativa incluida.
// Devuelve null si no la reconoce.
export function parseModules(html) {
  const content = gradesContent(html);
  if (content === null) return null;
  const table = content.match(/<table[^>]*imc-materias-tabla[\s\S]*?<\/table>/)?.[0];
  if (!table) return content.includes('imc-sin-datos') ? [] : null;
  const body = table.match(/<tbody[\s\S]*?<\/tbody>/)?.[0] ?? '';
  return [...body.matchAll(/<tr[^>]*>\s*<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => plain(m[1])).filter(Boolean);
}

const pause = (ms) => new Promise((r) => setTimeout(r, ms));

// Inicia sesión, lee la lista y el detalle de cada día. Solo hace lecturas.
// Lanza un error si algo no se reconoce: así nunca se sustituyen datos por algo incompleto.
export async function fetchAbsences({ documento, password }, known, subjects) {
  const s = new ItacaSession();
  const home = await s.login(documento, password);
  const link = home.body.match(/alumno_matricula_wf\?[^"']+/);
  if (!link) throw new ItacaError('No se ha encontrado tu matrícula en Web Familia.', 'structure');
  try {
    await s.text(link[0].replace(/&amp;/g, '&'));
    const list = await s.text('alumno_avisos_wf?tipo=fa');
    if (!list.body.includes('imc-contenido') || list.body.includes('id="imc-form-login"')) {
      throw new ItacaError('Web Familia ha cambiado o ha cerrado la sesión: no se ha podido leer la lista de asistencias.', 'structure');
    }
    const days = parseDayList(list.body);
    const expected = new Map(days.map((d) => [d.date, d.count]));
    const knownDates = known.filter((a) => a.source === 'itaca').map((a) => toItacaDate(a.date));
    const dates = [...new Set([...expected.keys(), ...knownDates])];

    const fetched = [];
    const warnings = [];
    for (const date of dates) {
      const page = await s.text(`alumno_avisos_wf?tipo=fa&fecha_id=${date}`);
      const items = parseDayDetail(page.body);
      const listed = expected.get(date);
      if (items === null && listed) {
        throw new ItacaError(`Web Familia ha cambiado: no se ha podido leer el detalle del ${date}.`, 'structure');
      }
      const found = items ?? [];
      if (listed && found.length < listed) {
        warnings.push(`El ${date} Ítaca indica ${listed} registros y solo se han podido leer ${found.length}. Revísalo en Web Familia.`);
      }
      fetched.push(...found.map((item) => toAbsence(date, item, subjects)));
      await pause(150);
    }
    const unmatched = [...new Set(fetched.filter((a) => a.subject === 'OTRA').map((a) => a.module))];
    if (unmatched.length) warnings.push(`Faltas que no cuentan en ninguna asignatura del panel: ${unmatched.join(', ')}.`);

    // Si el horario falla, las faltas siguen valiendo: se conserva el último horario leído.
    let schedule = null;
    try {
      schedule = parseSchedule((await s.text('alumno_horarios_wf')).body, subjects);
    } catch (e) {
      console.error(e);
    }
    if (!schedule) warnings.push('No se ha podido actualizar el horario desde Web Familia.');

    // Lo mismo con las notas: si fallan, se conservan las últimas y se avisa en su pantalla.
    let grades = null;
    let gradesHtml = null;
    try {
      const page = await s.text('alumno_calificaciones_wf');
      grades = parseGrades(page.body, subjects);
      gradesHtml = gradesContent(page.body);
    } catch (e) {
      console.error(e);
    }
    // Y con los módulos matriculados: si fallan, se usan los últimos leídos.
    let modules = null;
    try {
      modules = parseModules((await s.text('alumno_materias_wf')).body);
    } catch (e) {
      console.error(e);
    }
    return { absences: fetched, checkedDates: dates.map(toIso), warnings, schedule, grades, gradesHtml, modules };
  } finally {
    await s.text('logout_wf?tipo=out').catch(() => {});
  }
}

export class ItacaSession {
  cookies = new Map();

  remember(res) {
    for (const line of res.headers.getSetCookie()) {
      const [pair] = line.split(';');
      const eq = pair.indexOf('=');
      if (eq > 0) this.cookies.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
    }
  }

  // Las cookies de sesión solo viajan a Web Familia: una redirección a otra web se corta.
  async request(url, init = {}) {
    let target = new URL(url, `${BASE}/`).href;
    let options = init;
    for (let hop = 0; hop < 6; hop += 1) {
      if (new URL(target).host !== ITACA_HOST) throw new ItacaError('Web Familia ha redirigido a otra web.', 'redirects');
      const res = await fetch(target, {
        ...options,
        redirect: 'manual',
        signal: AbortSignal.timeout(30000),
        headers: {
          'User-Agent': UA,
          Cookie: [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; '),
          ...options.headers,
        },
      });
      this.remember(res);
      if (res.status < 300 || res.status >= 400) return { res, url: target };
      const location = res.headers.get('location');
      if (!location) throw new ItacaError('Web Familia ha respondido con una redirección vacía.', 'redirects');
      target = new URL(location, target).href;
      options = {};
    }
    throw new ItacaError('Web Familia ha redirigido demasiadas veces.', 'redirects');
  }

  async text(url, init) {
    const { res, url: finalUrl } = await this.request(url, init);
    const buf = Buffer.from(await res.arrayBuffer());
    const type = res.headers.get('content-type') ?? '';
    const charset = /utf-?8/i.test(type) ? 'utf-8' : 'latin1';
    return { status: res.status, type, url: finalUrl, body: new TextDecoder(charset).decode(buf) };
  }

  async login(documento, password) {
    await this.text('login_wf?idioma=C');
    const page = await this.text('main_wf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ documento, contrasenya: password, idioma: 'C', loginParam: '' }),
    });
    if (page.status >= 400 || page.body.includes('id="imc-form-login"')) {
      throw new ItacaError('Web Familia no ha aceptado el usuario o la contraseña.', 'invalidlogin');
    }
    return page;
  }
}
