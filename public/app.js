import { initWelcome } from './bienvenida.js';
import { DAY_NAMES, EDITOR_DAYS, buildDay, dayIndex, draftToEntries, liveState, mergeSessions, nextClass, scheduleToDraft } from './horario.js';
import { effectiveDue, firstDayTasks, formatGrade, isMidnight, liveTasks, matchesSearch, monthSections, noticeCount, upcomingGroups } from './avisos.js';
import { formatAverage, gradeFor, gradeKind, gradesSummary, hasGrades } from './notas.js';
import { TOUR_STEPS, startTour } from './tutorial.js';

// Iconos de Lucide, los oficiales de shadcn/ui (licencia ISC, ver LICENSE-Lucide.txt).
const ICONS = {
  alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  cap: '<path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>',
  calendar: '<path d="M8 2v3"/><path d="M16 2v3"/><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M8 13h.01"/><path d="M12 13h.01"/><path d="M16 13h.01"/><path d="M8 17h.01"/><path d="M12 17h.01"/><path d="M16 17h.01"/>',
  check: '<circle cx="12" cy="12" r="10"/><path d="m16 9-5.5 5.5L8 12"/>',
  chevron: '<path d="m9 18 6-6-6-6"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  close: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  coffee: '<path d="M10 2v2"/><path d="M14 2v2"/><path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1"/><path d="M6 2v2"/>',
  copy: '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  external: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
  eye: '<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/>',
  eyeoff: '<path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"/><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"/><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"/><path d="m2 2 20 20"/>',
  gear: '<path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"/><circle cx="12" cy="12" r="3"/>',
  help: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
  image: '<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>',
  list: '<path d="M13 5h8"/><path d="M13 12h8"/><path d="M13 19h8"/><path d="m3 17 2 2 4-4"/><path d="m3 7 2 2 4-4"/>',
  lock: '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  moon: '<path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"/>',
  pencil: '<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  refresh: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
  search: '<path d="m21 21-4.34-4.34"/><circle cx="11" cy="11" r="8"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
  trash: '<path d="M10 11v6"/><path d="M14 11v6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  x: '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>',
};
const icon = (name) =>
  `<span class="ico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg></span>`;

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const view = document.getElementById('view');
const ui = { openMonths: new Map(), search: '', showHidden: false, tab: 'pendiente', course: 'all', absenceFilter: 'all', adding: false, busy: false };
let faltas = null;
let tareas = null;

async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(`/api/${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || 'Ha ocurrido un error.'), { code: data.code, status: res.status });
  return data;
}

let toastTimer;
function toast(message, type = 'success') {
  const el = document.getElementById('toast');
  el.className = `toast ${type}`;
  el.setAttribute('role', type === 'error' ? 'alert' : 'status');
  el.innerHTML = `${icon(type === 'error' ? 'x' : 'check')}<span>${esc(message)}</span>`;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), type === 'error' ? 6000 : 3800);
}

// Descripción emergente de un elemento, con el aspecto del Tooltip de shadcn. Nunca entra en
// la franja de arriba, donde Windows pone minimizar, maximizar y cerrar: si no cabe encima,
// va debajo.
const TITLEBAR_HEIGHT = 40; // el mismo alto que en electron/main.js y .titlebar
const tooltip = document.getElementById('tooltip');
let tipTimer;
function hideTip() {
  clearTimeout(tipTimer);
  tooltip.hidden = true;
}
function showTip(target) {
  tooltip.textContent = target.dataset.tip;
  tooltip.hidden = false;
  const r = target.getBoundingClientRect();
  const t = tooltip.getBoundingClientRect();
  const below = r.top - t.height - 8 < TITLEBAR_HEIGHT + 4;
  const center = r.left + r.width / 2;
  const left = Math.min(Math.max(8, center - t.width / 2), window.innerWidth - t.width - 8);
  tooltip.classList.toggle('below', below);
  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${below ? r.bottom + 8 : r.top - t.height - 8}px`;
  tooltip.style.setProperty('--arrow', `${center - left}px`);
}
const tipTarget = (e) => {
  const target = e.target.closest?.('[data-tip]');
  // En la barra lateral, el nombre ya se lee salvo en la ventana estrecha.
  return target && !(target.hasAttribute('data-tip-narrow') && window.innerWidth > 760) ? target : null;
};
const scheduleTip = (e) => {
  hideTip();
  const target = tipTarget(e);
  if (target) tipTimer = setTimeout(() => showTip(target), 300);
};
document.addEventListener('mouseover', scheduleTip);
document.addEventListener('focusin', scheduleTip);
document.addEventListener('focusout', hideTip);
document.addEventListener('click', hideTip, true);
document.addEventListener('scroll', hideTip, true);

// Ventana emergente, con el aspecto del Dialog de shadcn. La nativa ya atrapa el foco y cierra con Esc.
const dialog = document.getElementById('dialog');
let dialogResolve = null;
function openDialog({ title, description = '', body = '', actions = '' }) {
  hideTip();
  dialog.returnValue = '';
  paint(`<div class="dialog-inner">
    <button class="btn ghost icon-only dialog-close" type="button" data-dialog-close aria-label="Cerrar">${icon('close')}</button>
    <h2 id="dialog-title">${esc(title)}</h2>
    ${description ? `<p class="dialog-text">${esc(description)}</p>` : ''}
    ${body}
    ${actions ? `<div class="dialog-actions">${actions}</div>` : ''}
  </div>`, dialog);
  dialog.showModal();
}
dialog.addEventListener('click', (e) => {
  // Un clic fuera del contenido cae en el propio diálogo: es el fondo.
  if (e.target === dialog || e.target.closest('[data-dialog-close]')) dialog.close();
  const result = e.target.closest('[data-dialog-result]');
  if (result) dialog.close(result.dataset.dialogResult);
});
dialog.addEventListener('close', () => {
  dialogResolve?.(dialog.returnValue === 'ok');
  dialogResolve = null;
});
// Confirmación: el foco empieza en Cancelar, para que un Enter despistado no borre nada.
const confirmDialog = ({ title, description, action }) => new Promise((resolve) => {
  dialogResolve = resolve;
  openDialog({
    title,
    description,
    actions: `<button class="btn" type="button" data-dialog-result="no" autofocus>Cancelar</button>
      <button class="btn destructive" type="button" data-dialog-result="ok">${esc(action)}</button>`,
  });
});

// 4. Silueta de la pantalla mientras llegan los datos.
const skeletonRows = (n) => Array.from({ length: n }, () => '<div class="sk-row"><i class="sk sk-line short"></i><i class="sk sk-line"></i></div>').join('');
const skeletonHtml = () => `<div class="sk-page" role="status" aria-label="Cargando">
  <div class="page-head"><div><i class="sk sk-title"></i><i class="sk sk-sub"></i></div></div>
  <div class="summary"><i class="sk sk-circle"></i><div class="summary-main"><i class="sk sk-line short"></i><i class="sk sk-line"></i></div></div>
  <i class="sk sk-heading"></i>
  <div class="card">${skeletonRows(7)}</div>
</div>`;

// La CSP prohíbe estilos en línea: colores y medidas se aplican por CSSOM tras pintar.
function applyDynamic(root) {
  root.querySelectorAll('[data-color]').forEach((el) => (el.style.background = el.dataset.color));
  root.querySelectorAll('[data-c]').forEach((el) => el.style.setProperty('--c', el.dataset.c));
  root.querySelectorAll('[data-width]').forEach((el) => (el.style.width = `${el.dataset.width}%`));
  root.querySelectorAll('[data-top]').forEach((el) => (el.style.top = `${el.dataset.top}px`));
  root.querySelectorAll('[data-h]').forEach((el) => (el.style.height = `${el.dataset.h}px`));
}
function paint(html, root = view) {
  hideTip();
  root.innerHTML = html;
  applyDynamic(root);
}

// Botón de actualizar de las cabeceras: solo el icono, que gira mientras carga.
const refreshButton = (action, busy) => {
  const label = busy ? 'Actualizando' : 'Actualizar';
  return `<button class="btn icon-only ${busy ? 'spin' : ''}" data-action="${action}" data-tip="${label}" aria-label="${label}" ${busy ? 'disabled' : ''}>${icon('refresh')}</button>`;
};

// Resumen de cada pantalla: la frase con lo importante y solo los números que no salen en otro sitio.
const summaryStat = (value, label, alert = false) => `<div class="summary-stat ${alert ? 'alert' : ''}"><b>${esc(value)}</b><span>${esc(label)}</span></div>`;

// ---------- Fechas ----------
const dayFmt = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' });
const longFmt = new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const dateFmt = new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const daysFrom = (sec) => Math.round((startOfDay(new Date(sec * 1000)) - startOfDay(new Date())) / 86400000);

function relative(sec) {
  const d = daysFrom(sec);
  if (d === 0) return 'Hoy';
  if (d === 1) return 'Mañana';
  if (d === -1) return 'Ayer';
  return d > 0 ? `En ${d} días` : `Hace ${-d} días`;
}
function agoText(iso) {
  if (!iso) return 'Sin sincronizar';
  const mins = Math.round((Date.now() - new Date(iso)) / 60000);
  if (mins < 1) return 'Actualizado ahora';
  if (mins < 60) return `Actualizado hace ${mins} min`;
  const h = Math.round(mins / 60);
  if (h < 24) return `Actualizado hace ${h} h`;
  return `Actualizado el ${dayFmt.format(new Date(iso))}`;
}
const fmtHours = (n) => `${String(Math.round(n * 100) / 100).replace('.', ',')} h`;
const plural = (n, one, many) => (n === 1 ? one : many);

// ---------- Faltas ----------
const STATUS = {
  good: { label: 'Bien', icon: 'check' },
  warning: { label: 'Atención', icon: 'alert' },
  serious: { label: 'Riesgo alto', icon: 'alert' },
  critical: { label: 'Límite alcanzado', icon: 'x' },
  unknown: { label: 'Sin horas totales', icon: 'help' },
};
const pill = (status) => `<span class="pill ${status}">${icon(STATUS[status].icon)}${STATUS[status].label}</span>`;

function subjectRow(s) {
  const parts = [];
  if (s.unjustified) parts.push(`${s.unjustified} sin justificar`);
  if (s.justified) parts.push(`${s.justified} ${plural(s.justified, 'justificada', 'justificadas')}`);
  if (s.lates) parts.push(`${s.lates} ${plural(s.lates, 'retraso', 'retrasos')}`);
  const name = `<td><div class="subj-name"><span class="dot" data-color="${esc(s.color)}"></span>
    <div><strong>${esc(s.name)}</strong><small>${esc(parts.join(', ') || 'Sin faltas')}</small></div></div></td>`;
  if (s.limit === null) {
    return `<tr>${name}
      <td colspan="3"><a href="#ajustes">Añade sus horas totales para calcular el límite</a></td>
      <td class="subj-status">${pill('unknown')}</td></tr>`;
  }
  const margin = s.hours >= s.reachesAt ? 'Superado' : `${s.remaining} h`;
  return `<tr class="${s.hours ? '' : 'idle'}">${name}
    <td class="subj-meter"><div class="meter" role="meter" aria-valuemin="0" aria-valuemax="${s.limit}" aria-valuenow="${Math.min(s.hours, s.limit)}" aria-label="Horas faltadas respecto al límite en ${esc(s.name)}"><i class="${s.status}" data-width="${Math.min(100, s.ratio * 100).toFixed(1)}"></i></div></td>
    <td class="num subj-used"><b>${fmtHours(s.hours)}</b> <small>de ${fmtHours(s.limit)}</small></td>
    <td class="num subj-margin">${esc(margin)}</td>
    <td class="subj-status">${s.status === 'good' ? '' : pill(s.status)}</td>
  </tr>`;
}

// La frase principal de la pantalla: cómo vas, sin tener que interpretar números.
function faltasVerdict(withLimit, totalHours) {
  const worst = [...withLimit].sort((a, b) => b.ratio - a.ratio)[0];
  if (!worst) return { status: 'unknown', title: 'Faltan tus horas totales', sub: 'Añádelas en Ajustes para calcular cuánto puedes faltar.' };
  const used = `${Math.round(worst.ratio * 100)} %`;
  if (worst.status === 'critical') return { status: 'critical', title: `Has alcanzado el límite en ${worst.name}`, sub: 'Habla con tu tutor sobre tu evaluación continua.' };
  if (worst.status === 'serious') return { status: 'serious', title: `${worst.name} está muy justa`, sub: `Has usado el ${used} del límite y puedes faltar ${worst.remaining} ${plural(worst.remaining, 'hora', 'horas')} más.` };
  if (worst.status === 'warning') return { status: 'warning', title: `Vigila ${worst.name}`, sub: `Ya has usado el ${used} del límite.` };
  if (!totalHours) return { status: 'good', title: 'Ninguna falta que cuente', sub: 'Tienes todo el margen disponible en todas las asignaturas.' };
  return { status: 'good', title: 'Vas bien en todas las asignaturas', sub: `La que más has gastado es ${worst.name}, con el ${used} del límite.` };
}

function openAddAbsence() {
  const today = new Date().toLocaleDateString('sv-SE');
  openDialog({
    title: 'Añadir falta',
    description: 'Para las que aún no salen en Web Familia. Se suma a tu recuento en cuanto la guardes.',
    body: `<form class="dialog-form" data-action="add-absence">
    <label class="field"><span>Asignatura</span><select class="input" name="subject" required>
      ${faltas.subjects.map((s) => `<option value="${esc(s.code)}">${esc(s.name)}</option>`).join('')}</select></label>
    <div class="form-row">
      <label class="field"><span>Fecha</span><input class="input" type="date" name="date" value="${today}" max="${today}" required></label>
      <label class="field"><span>Horas</span><input class="input" type="number" name="hours" value="1" min="1" max="12" required></label>
    </div>
    <div class="form-row">
      <label class="check"><input type="checkbox" name="justified"><span>Justificada</span></label>
      <label class="check"><input type="checkbox" name="late"><span>Es un retraso</span></label>
    </div>
    <div class="form-error" data-error role="alert" hidden></div>
    <div class="dialog-actions"><button class="btn" type="button" data-dialog-close>Cancelar</button>
    <button class="btn primary" type="submit">Añadir falta</button></div>
  </form>`,
  });
}

function absencesTable() {
  const codes = new Map(faltas.subjects.map((s) => [s.code, s]));
  const rows = faltas.absences.filter((a) => ui.absenceFilter === 'all' || a.subject === ui.absenceFilter);
  if (!rows.length) {
    return `<div class="card empty">${icon('check')}<strong>Sin faltas registradas</strong>${ui.absenceFilter === 'all' ? 'Cuando haya faltas aparecerán aquí.' : 'No hay faltas en esta asignatura.'}</div>`;
  }
  return `<div class="card table-wrap"><table>
    <thead><tr><th>Fecha</th><th>Asignatura</th><th>Tipo</th><th>Estado</th><th class="num">Horas</th><th>Origen</th><th></th></tr></thead>
    <tbody>${rows.map((a) => {
      const s = codes.get(a.subject);
      return `<tr>
        <td>${esc(dateFmt.format(new Date(`${a.date}T12:00:00`)))}${a.time ? ` <span class="sync-note">${esc(a.time)}</span>` : ''}</td>
        <td><span class="subject-cell"><span class="dot" data-color="${esc(s?.color ?? '#898781')}"></span>${esc(s?.name ?? a.module ?? a.subject)}</span></td>
        <td>${a.type === 'retraso' ? 'Retraso' : 'Falta'}</td>
        <td>${a.justified ? '<span class="tag ok">Justificada</span>' : '<span class="tag bad">Sin justificar</span>'}</td>
        <td class="num">${a.type === 'retraso' ? '-' : a.hours ?? 1}</td>
        <td>${a.missing ? '<span class="tag" data-tip="Sigue contando. Bórrala si sabes que la han retirado.">Ya no sale en Ítaca</span>' : `<span class="sync-note">${a.source === 'manual' ? 'Manual' : 'Ítaca'}</span>`}</td>
        <td class="num">${a.source === 'manual' || a.missing ? `<button class="btn ghost small" data-action="del-absence" data-id="${esc(a.id)}" aria-label="Borrar falta">${icon('trash')}</button>` : ''}</td>
      </tr>`;
    }).join('')}</tbody></table></div>`;
}

function renderFaltas() {
  const { subjects, settings, absences, itaca } = faltas;
  if (!itaca.user) return connectItaca('<header class="page-head"><div><h1>Faltas</h1><p>Cuántas horas llevas y cuántas puedes faltar en cada asignatura.</p></div></header>');
  const withLimit =subjects.filter((s) => s.limit !== null);
  const missing = subjects.length - withLimit.length;
  const total = subjects.reduce((n, s) => n + s.hours, 0);
  const unjustified = subjects.reduce((n, s) => n + s.unjustified, 0);
  const justified = subjects.reduce((n, s) => n + s.justified, 0);
  const verdict = faltasVerdict(withLimit, total);
  const usedPct = Math.round(Math.max(0, ...withLimit.map((s) => s.ratio)) * 100);

  const sorted = [...subjects].sort((a, b) => (b.ratio ?? -1) - (a.ratio ?? -1) || b.hours - a.hours);
  paint(`
    <header class="page-head">
      <div><h1>Faltas</h1><p>Cuántas horas llevas y cuántas puedes faltar en cada asignatura.</p></div>
      <div class="head-actions">
        <span class="sync-note">${esc(agoText(itaca.lastSync))}</span>
        ${refreshButton('sync-itaca', ui.syncing)}
        <button class="btn icon-only" data-action="open-add-absence" data-tip="Añadir falta" aria-label="Añadir falta">${icon('plus')}</button>
      </div>
    </header>
    ${itaca.lastError ? `<div class="banner error"><span>${esc(itaca.lastError)}</span></div>` : ''}
    ${itaca.warnings.map((w) => `<div class="banner"><span>${esc(w)}</span></div>`).join('')}
    ${missing ? `<div class="banner"><span>Faltan las horas totales de ${missing} ${plural(missing, 'asignatura', 'asignaturas')}. Sin ese dato no se puede calcular cuánto puedes faltar.</span><a class="btn small" href="#ajustes">Completar</a></div>` : ''}
    <section class="summary ${verdict.status}">
      <div class="ring" role="img" aria-label="Has usado el ${usedPct} % del límite en la asignatura más gastada">
        <svg viewBox="0 0 64 64" aria-hidden="true">
          <circle class="ring-track" cx="32" cy="32" r="26"></circle>
          <circle class="ring-fill" cx="32" cy="32" r="26" stroke-dasharray="${(Math.min(usedPct, 100) * 1.6336).toFixed(1)} 163.4"></circle>
        </svg>
        <span>${usedPct}%</span>
      </div>
      <div class="summary-main">
        <h2>${esc(verdict.title)}</h2>
        <p>${esc(verdict.sub)}</p>
      </div>
      <div class="summary-stats">
        ${total !== unjustified ? summaryStat(total, 'Horas que cuentan') : ''}
        ${summaryStat(unjustified, 'Sin justificar')}
        ${summaryStat(justified, 'Justificadas')}
      </div>
    </section>
    <h2 class="section-title">Por asignatura</h2>
    <div class="card table-wrap"><table class="subj-table">
      <thead><tr><th>Asignatura</th><th><span data-tip="Con el ${settings.limitPct} % de las horas de una asignatura pierdes la evaluación continua.${settings.countJustified ? '' : ' Las justificadas no cuentan.'}">Límite usado</span></th><th class="num">Faltadas</th><th class="num">Puedes faltar</th><th></th></tr></thead>
      <tbody>${sorted.map(subjectRow).join('')}</tbody>
    </table></div>
    <div class="toolbar">
      <h2 class="section-title flush">Registro de faltas</h2>
      <select class="input" data-action="filter-absences" aria-label="Filtrar por asignatura">
        <option value="all">Todas las asignaturas</option>
        ${subjects.map((s) => `<option value="${esc(s.code)}" ${ui.absenceFilter === s.code ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}
      </select>
    </div>
    ${absencesTable()}
  `);
}

// ---------- Tareas ----------
const normalize = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
function courseSubject(name) {
  const n = normalize(name ?? '');
  return tareas.subjects.find((s) => s.keywords.some((k) => n.includes(normalize(k))));
}
const courseColor = (name) => courseSubject(name)?.color ?? '#898781';
// Aules mezcla valenciano y castellano: se muestra siempre el nombre de tu asignatura.
const courseLabel = (name) => courseSubject(name)?.name ?? (/^tutoria/.test(normalize(name ?? '')) ? 'Tutoría' : name);

const timeFmt = new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' });

// Hora de la entrega; las de las 00:00 se muestran como el final del día anterior.
const dueTime = (sec) => (isMidnight(sec) ? 'medianoche' : timeFmt.format(new Date(sec * 1000)));

// Fila de tarea: la fecha a la izquierda, el nombre y sus datos en el centro.
function taskRow(t, sameDay = false) {
  const done = t.state === 'entregada';
  const due = t.due ? effectiveDue(t.due) : null;
  let when;
  if (done) {
    const sec = t.submittedAt ?? due;
    when = `<b>${t.gradedOnly ? 'Calificada' : 'Entregada'}</b>${sec ? esc(dayFmt.format(new Date(sec * 1000))) : ''}`;
  } else if (due) {
    when = sameDay ? '' : `<b>${esc(relative(due))}</b>${esc(dayFmt.format(new Date(due * 1000)))}`;
  } else {
    when = '<b>Sin fecha</b>';
  }
  const tone = t.state === 'vencida' ? 'overdue' : !done && due && daysFrom(due) <= 2 ? 'soon' : '';

  const meta = [`<span class="dot" data-color="${esc(courseColor(t.courseName))}"></span><span>${esc(courseLabel(t.courseName))}</span>`];
  if (t.kind !== 'Tarea') meta.push(`<span>${esc(t.kind)}</span>`);
  if (t.due && !done) meta.push(`<span>${esc(dueTime(t.due))}</span>`);
  if (t.draft) meta.push('<span class="tag">Borrador guardado</span>');
  if (t.opensAt) meta.push(`<span class="tag">Abre el ${esc(dayFmt.format(new Date(t.opensAt * 1000)))}</span>`);
  if (t.grade) meta.push(`<span class="tag ok">Nota: ${esc(formatGrade(t.grade))}</span>`);
  if (t.state === 'vencida') {
    meta.push(t.canStillSubmit ? '<span class="tag">Aún admite entrega</span>' : '<span class="tag bad">Entrega cerrada</span>');
  }
  const hideLabel = t.hidden ? 'Volver a mostrar' : 'Ocultar de la lista';
  return `<article class="task ${t.hidden ? 'is-hidden' : ''} ${sameDay ? 'same-day' : ''}">
    <div class="task-when ${tone}">${when}</div>
    <div class="task-main"><a class="task-name" href="${esc(t.url)}" target="_blank" rel="noopener noreferrer">${esc(t.name)}</a>
      <div class="task-meta">${meta.join('')}</div></div>
    <div class="task-actions">
      <button class="btn ghost small icon-only" data-action="hide-task" data-key="${esc(t.key)}" data-hidden="${t.hidden}" data-tip="${hideLabel}" aria-label="${hideLabel}">${icon(t.hidden ? 'eye' : 'eyeoff')}</button>
      <span class="task-open" aria-hidden="true">${icon('external')}</span>
    </div>
  </article>`;
}

const dayKey = (sec) => (sec ? startOfDay(new Date(sec * 1000)).getTime() : null);

// Lista por meses plegables: el primero abierto y el resto recogidos. Al filtrar se abre todo.
function monthList(items, dateOf, mergeDays) {
  const filtering = Boolean(ui.search.trim()) || ui.course !== 'all';
  return monthSections(items, dateOf).map((s, i) => {
    const key = `${ui.tab}:${s.id}`;
    const open = filtering || (ui.openMonths.get(key) ?? i === 0);
    const rows = s.tasks.map((t, n) => {
      const day = dayKey(dateOf(t));
      return taskRow(t, mergeDays && n > 0 && day !== null && day === dayKey(dateOf(s.tasks[n - 1])));
    }).join('');
    return `<section class="month">
      <button class="month-head" type="button" aria-expanded="${open}" data-action="toggle-month" data-key="${esc(key)}" data-open="${open}">
        <span class="ico month-chevron" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS.chevron}</svg></span>
        <span class="month-label">${esc(s.label)}</span>
        <span class="month-count">${s.tasks.length} ${plural(s.tasks.length, 'tarea', 'tareas')}</span>
      </button>
      ${open ? `<div class="card task-list">${rows}</div>` : ''}
    </section>`;
  }).join('');
}

function connectAules(error = '') {
  paint(`
    <header class="page-head"><div><h1>Tareas</h1><p>Lo que tienes por entregar en Aules, siempre a mano.</p></div></header>
    <section class="card connect">
      <h2>Conecta tu cuenta de Aules</h2>
      <p>Usa el mismo usuario y contraseña con los que entras en Aules.</p>
      <form data-action="connect-aules">
        <label class="field"><span>Usuario</span><input class="input" name="username" autocomplete="username" required></label>
        <label class="field"><span>Contraseña</span><input class="input" name="password" type="password" autocomplete="current-password" required></label>
        ${error ? `<div class="form-error" role="alert">${esc(error)}</div>` : ''}
        <div class="head-actions"><button class="btn primary" type="submit">Conectar</button></div>
        <p class="privacy">${icon('lock')}<span>La contraseña se usa una sola vez para pedir acceso a Aules y no se guarda. Solo se conserva un token, cifrado con tu usuario de Windows.</span></p>
      </form>
    </section>`);
}

// Faltas, Notas y Horario dependen de Web Familia: sin la cuenta piden conectarla, como Tareas con Aules.
function connectItaca(head, extra = '') {
  paint(`${head}
    <section class="card connect">
      <h2>Conecta Web Familia</h2>
      <p>Tu usuario es tu NIF o NIE, igual que en Web Familia. Con esto verás tus faltas, tus notas y tu horario.</p>
      <form data-action="connect-itaca">
        <label class="field"><span>Usuario (NIF/NIE)</span><input class="input" name="documento" autocomplete="off" required></label>
        <label class="field"><span>Contraseña</span><input class="input" name="password" type="password" autocomplete="off" required></label>
        <div class="form-error" data-error role="alert" hidden></div>
        <div class="head-actions"><button class="btn primary" type="submit">Conectar</button></div>
        <p class="privacy">${icon('lock')}<span>Se guarda solo en este equipo, cifrada con tu usuario de Windows, porque Web Familia no ofrece tokens.</span></p>
      </form>
      ${extra}
    </section>`);
}

const doneDate =(t) => t.submittedAt ??(t.due ? effectiveDue(t.due) : null);
const dueDate = (t) => (t.due ? effectiveDue(t.due) : null);

// Lo que se ve según la pestaña y los filtros. Las cifras de arriba no dependen de ellos.
function taskView() {
  const shown = liveTasks(tareas.tasks)
    .filter((t) => ui.showHidden || !t.hidden)
    .filter((t) => matchesSearch(`${t.name} ${courseLabel(t.courseName)}`, ui.search))
    .filter((t) => ui.course === 'all' || String(t.courseId) === ui.course);
  const by = (state) => shown.filter((t) => t.state === state);
  return {
    pendiente: by('pendiente').sort((a, b) => (a.due ?? Infinity) - (b.due ?? Infinity)),
    vencida: by('vencida').sort((a, b) => (b.due ?? 0) - (a.due ?? 0)),
    entregada: by('entregada').sort((a, b) => (doneDate(b) ?? 0) - (doneDate(a) ?? 0)),
  };
}

function taskTabsHtml(v) {
  const tab = (id, label) => `<button role="tab" aria-selected="${ui.tab === id}" data-action="tab" data-tab="${id}">${label}<span class="count">${v[id].length}</span></button>`;
  return `${tab('pendiente', 'Pendientes')}${tab('vencida', 'Vencidas')}${tab('entregada', 'Entregadas')}`;
}

function taskListHtml(v) {
  const list = v[ui.tab];
  if (!list.length) {
    const filtering = ui.search.trim() || ui.course !== 'all';
    const [title, text] = filtering
      ? ['Sin resultados', 'Ninguna tarea coincide con tu búsqueda.']
      : { pendiente: ['Nada pendiente', 'No tienes entregas por delante.'], vencida: ['Ninguna vencida', 'Vas al día.'], entregada: ['Aún no hay entregas', ''] }[ui.tab];
    return `<div class="card empty">${filtering ? '' : icon('check')}<strong>${esc(title)}</strong>${esc(text)}</div>`;
  }
  return ui.tab === 'entregada' ? monthList(list, doneDate, false) : monthList(list, dueDate, true);
}

// Al escribir en el buscador solo se repinta lo necesario, para no perder el foco.
function updateTaskResults() {
  const list = document.getElementById('task-list');
  const tabs = document.getElementById('task-tabs');
  if (!list || !tabs) return;
  const v = taskView();
  paint(taskTabsHtml(v), tabs);
  paint(taskListHtml(v), list);
}

// Las pendientes y entregadas ya salen en las pestañas: aquí va lo que hay que saber antes de mirarlas.
function tasksSummaryHtml(pendientes, semana, vencidas, open) {
  const first = firstDayTasks(pendientes);
  const firstName = first.length === 1 ? first[0].name.replace(/\.\s*$/, '') : `${first.length} entregas`;
  const next = first.length ? `${relative(effectiveDue(first[0].due))}: ${firstName}` : '';
  let title;
  if (semana.length) title = `${semana.length} ${plural(semana.length, 'entrega', 'entregas')} en los próximos 7 días`;
  else title = pendientes.length ? 'Semana despejada' : 'Nada pendiente por delante';
  const sub = next || (pendientes.length ? 'Tus entregas pendientes no tienen fecha.' : 'No tienes más entregas con fecha.');
  return `<section class="summary ${open ? 'warning' : 'good'}">
    <span class="summary-mark">${icon(open ? 'alert' : 'check')}</span>
    <div class="summary-main">
      <h2>${esc(title)}</h2>
      <p>${esc(sub)}</p>
    </div>
    ${vencidas.length ? `<div class="summary-stats">
      <button class="summary-stat alert" type="button" data-action="tab" data-tab="vencida" data-tip="Ver las vencidas"><b>${vencidas.length}</b><span>${plural(vencidas.length, 'Vencida', 'Vencidas')}</span></button>
    </div>` : ''}
  </section>`;
}

function renderTareas() {
  if (!tareas.connected) return connectAules();
  const v = taskView();
  const all = liveTasks(tareas.tasks).filter((t) => !t.hidden);
  const by = (state) => all.filter((t) => t.state === state);
  const vencidas = by('vencida');
  const open = vencidas.filter((t) => t.canStillSubmit).length;
  const pendientes = by('pendiente').sort((a, b) => (a.due ?? Infinity) - (b.due ?? Infinity));
  const semana = pendientes.filter((t) => t.due && daysFrom(effectiveDue(t.due)) <= 7);
  const courseIds = new Set(tareas.tasks.filter((t) => !t.hidden).map((t) => t.courseId));
  const courseOptions = tareas.courses.filter((c) => courseIds.has(c.id));

  paint(`
    <header class="page-head">
      <div><h1>Tareas</h1><p>Lo que tienes por entregar en Aules.</p></div>
      <div class="head-actions">
        <span class="sync-note">${esc(agoText(tareas.fetchedAt))}</span>
        ${refreshButton('refresh-tasks', ui.busy)}
      </div>
    </header>
    ${tareas.warnings.map((w) => `<div class="banner"><span>${esc(w)}</span></div>`).join('')}
    ${tasksSummaryHtml(pendientes, semana, vencidas, open)}
    <div class="toolbar">
      <div class="tabs" id="task-tabs" role="tablist" aria-label="Ver tareas">${taskTabsHtml(v)}</div>
      <div class="head-actions">
        <label class="task-search">${icon('search')}<input class="input" type="search" data-action="task-search" placeholder="Buscar" aria-label="Buscar tarea o asignatura" value="${esc(ui.search)}"></label>
        <label class="check"><input type="checkbox" data-action="show-hidden" ${ui.showHidden ? 'checked' : ''}><span>Ver ocultas</span></label>
        <select class="input" data-action="filter-course" aria-label="Filtrar por asignatura">
          <option value="all">Todas las asignaturas</option>
          ${courseOptions.map((c) => `<option value="${c.id}" ${ui.course === String(c.id) ? 'selected' : ''}>${esc(courseLabel(c.name))}</option>`).join('')}
        </select>
      </div>
    </div>
    <div id="task-list" role="tabpanel">${taskListHtml(v)}</div>`);
}

// ---------- Ajustes ----------
// Aules da el nombre en mayúsculas: "MARÍA DE LOS ÁNGELES RUIZ" -> "María de los Ángeles Ruiz".
const PARTICLES = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'i']);
const personName = (full) => String(full).trim().toLocaleLowerCase('es').split(/\s+/)
  .map((w, i) => (i > 0 && PARTICLES.has(w) ? w : `${w[0].toLocaleUpperCase('es')}${w.slice(1)}`))
  .join(' ');
const hoursTag = (s) => (s.hoursSource === 'estimado'
  ? `<span class="tag" data-tip="${s.weeklySessions} ${plural(s.weeklySessions, 'sesión', 'sesiones')} a la semana en tu horario, unas 33 horas al año cada una.">Estimadas</span>`
  : '');
function renderAjustes() {
  const { settings, subjects, itaca } = faltas;
  paint(`
    <header class="page-head"><div><h1>Ajustes</h1><p>Tus cuentas y las reglas con las que se calculan las faltas.</p></div></header>
    <div class="settings">
      <section class="card">
        <h2>Web Familia (Ítaca)</h2>
        ${itaca.user ? `<div class="conn-row"><span>Conectado como <b>${esc(itaca.user)}</b></span><button class="btn small" data-action="disconnect-itaca">Desconectar</button></div>` : `
        <p class="help">Tu usuario es tu NIF o NIE, igual que en Web Familia.</p>
        <form class="stack" data-action="connect-itaca">
          <div class="form-row">
            <label class="field"><span>Usuario (NIF/NIE)</span><input class="input" name="documento" autocomplete="off" required></label>
            <label class="field"><span>Contraseña</span><input class="input" name="password" type="password" autocomplete="off" required></label>
          </div>
          <div class="form-error" data-error role="alert" hidden></div>
          <div class="head-actions"><button class="btn primary" type="submit">Conectar</button></div>
          <p class="privacy">${icon('lock')}<span>Se guarda solo en este equipo, cifrada con tu usuario de Windows, porque Web Familia no ofrece tokens.</span></p>
        </form>`}
      </section>
      <section class="card">
        <h2>Aules</h2>
        ${tareas?.connected ? `<div class="conn-row"><span>Conectado como <b>${esc(tareas.user)}</b></span><button class="btn small" data-action="disconnect-aules">Desconectar</button></div>` : `<div class="conn-row"><span>Sin conectar</span><a class="btn small" href="#tareas">Conectar</a></div>`}
        ${tareas?.courses?.length ? `<h3 class="group-title">Cursos que se muestran</h3><div class="stack">${tareas.courses.map((c) => `
          <label class="check"><input type="checkbox" data-action="toggle-course" data-id="${c.id}" ${c.hidden ? '' : 'checked'}><span>${esc(courseLabel(c.name))}</span></label>`).join('')}</div>` : ''}
      </section>
      <section class="card">
        <h2>Asignaturas y horas totales</h2>
        <p class="help">Con estas horas se calcula cuánto puedes faltar. Cámbialas si no coinciden con tu programación.</p>
        ${subjects.length ? `<table class="hours-table"><tbody>${subjects.map((s) => `<tr>
          <td><span class="subject-cell"><span class="dot" data-color="${esc(s.color)}"></span>${esc(s.name)}</span></td>
          <td class="hours-source" data-code="${esc(s.code)}">${hoursTag(s)}</td>
          <td><input class="input" type="number" min="1" max="2000" value="${s.totalHours ?? ''}" data-action="hours-input" data-code="${esc(s.code)}" aria-label="Horas totales de ${esc(s.name)}"></td>
        </tr>`).join('')}</tbody></table>` : '<p class="help">Aparecerán aquí al conectar Web Familia o al escribir tu horario a mano.</p>'}
      </section>
      <section class="card">
        <h2>Reglas de cómputo</h2>
        <p class="help">Cada centro lo regula a su manera: comprueba el reglamento de tu instituto.</p>
        <div class="stack">
          <label class="field"><span>Límite de faltas (%)</span><input class="input" type="number" min="1" max="100" step="0.5" value="${settings.limitPct}" data-action="setting-pct"></label>
          <label class="check"><input type="checkbox" data-action="setting" data-key="countJustified" ${settings.countJustified ? 'checked' : ''}><span>Contar las faltas justificadas<small>Actívalo solo si en tu centro cuentan para el límite.</small></span></label>
          <label class="check"><input type="checkbox" data-action="setting" data-key="countLates" ${settings.countLates ? 'checked' : ''}><span>Contar los retrasos como una hora</span></label>
        </div>
      </section>
      <section class="card session-card">
        <h2>Tutorial</h2>
        <p class="help">Un repaso rápido de cada apartado de Kurso.</p>
        <div><button class="btn" type="button" data-action="start-tour">Ver el tutorial</button></div>
      </section>
      <section class="card session-card">
        <h2>${tareas?.user ? `Sesión: ${esc(personName(tareas.user))}` : 'Sesión'}</h2>
        <p class="help">Cierra la sesión en este equipo: desconecta Aules y Web Familia y borra todo lo que Kurso guarda aquí (faltas, notas, horario, tareas y ajustes). La app vuelve a empezar desde la bienvenida, como recién instalada. En Aules y Web Familia no se toca nada.</p>
        <div><button class="btn destructive" type="button" data-action="logout">Cerrar sesión</button></div>
      </section>
    </div>`);
}

// ---------- Horario ----------
function fmtDuration(minutes) {
  const total = Math.max(1, Math.ceil(minutes));
  if (total < 60) return `${total} min`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}
const slotName = (row) => row.entries.map((e) => e.name).join(' / ');
const NEUTRAL = '#898781';
const slotColor = (row) => row.entries[0]?.color ?? NEUTRAL;
const nameWithDot = (e) => `<span class="tl-name"><span class="dot" data-color="${esc(e.color ?? NEUTRAL)}"></span>${esc(e.name)}</span>`;

function nextText(next) {
  if (next.daysAhead === 0) return `A las ${next.row.start}, dentro de ${fmtDuration(next.minutes)}`;
  if (next.daysAhead === 1) return `Mañana a las ${next.row.start}`;
  return `El ${DAY_NAMES[next.day].toLowerCase()} a las ${next.row.start}`;
}

function liveHero(s) {
  if (s.current) {
    const r = s.current;
    return `<div class="spot now-card" data-c="${esc(slotColor(r))}">
      <div class="sn-top"><span class="sn-label"><span class="pulse" aria-hidden="true"></span>En clase ahora</span><span class="sn-range">${r.start} - ${r.end}</span></div>
      <div class="live-title">${esc(slotName(r))}</div>
      <div class="now-count"><b>${esc(fmtDuration(r.minutesLeft))}</b> para terminar</div>
      <div class="spot-meter" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(r.progress)}" aria-label="Progreso de la clase"><i data-width="${r.progress.toFixed(1)}"></i></div>
    </div>`;
  }
  if (s.currentBreak) {
    const r = s.currentBreak;
    return `<div class="spot now-card" data-c="${esc(s.next ? slotColor(s.next.row) : NEUTRAL)}">
      <div class="sn-top"><span class="sn-label">${icon('coffee')}Ahora</span><span class="sn-range">${r.start} - ${r.end}</span></div>
      <div class="live-title">${esc(r.label)}</div>
      <div class="now-count"><b>${esc(fmtDuration(r.minutesLeft))}</b> para volver a clase</div>
      <div class="spot-meter" aria-hidden="true"><i data-width="${r.progress.toFixed(1)}"></i></div>
    </div>`;
  }
  const [title, sub] = s.finished
    ? ['Clases terminadas por hoy', `Has acabado las ${s.totalCount} sesiones de hoy.`]
    : s.hasClassesToday
      ? ['Aún no han empezado las clases', `Hoy tienes ${s.totalCount} ${plural(s.totalCount, 'sesión', 'sesiones')}.`]
      : ['Hoy no hay clase', 'Disfruta del día libre.'];
  return `<div class="spot now-card" data-c="${esc(s.next ? slotColor(s.next.row) : NEUTRAL)}">
    <div class="sn-top"><span class="sn-label">Ahora</span></div>
    <div class="live-title">${esc(title)}</div>
    <div class="now-count">${esc(sub)}</div>
  </div>`;
}

function liveRow(row) {
  if (row.kind === 'break') {
    return `<li class="tl-row tl-break ${row.status}"><span class="tl-time">${row.start}</span><span class="tl-node"></span><div class="tl-body"><span class="tl-name">${esc(row.label)}</span>${row.status === 'now' ? '<span class="tl-tag now">Ahora</span>' : ''}</div></li>`;
  }
  const tag = row.status === 'now'
    ? '<span class="tl-tag now">Ahora</span>'
    : row.status === 'next'
      ? '<span class="tl-tag">Siguiente</span>'
      : row.status === 'done'
        ? '<span class="sr">Completada</span>'
        : '';
  return `<li class="tl-row ${row.status}" data-c="${esc(slotColor(row))}" ${row.status === 'now' ? 'aria-current="time"' : ''}>
    <span class="tl-time">${row.start}</span>
    <span class="tl-node">${row.status === 'done' ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONS.tick + '</svg>' : ''}</span>
    <div class="tl-body">
      <div class="tl-line"><span class="tl-names">${row.entries.map(nameWithDot).join('')}</span>${tag}</div>
      ${row.status === 'now' ? `<div class="meter tl-meter" aria-hidden="true"><i class="subject" data-width="${row.progress.toFixed(1)}"></i></div>` : ''}
    </div>
  </li>`;
}

function liveHtml() {
  const s = liveState(faltas.schedule);
  const after = s.next
    ? `<div class="card next-card">
        <div class="live-label">Después</div>
        <div class="next-names">${s.next.row.entries.map(nameWithDot).join('')}</div>
        <div class="live-sub">${esc(nextText(s.next))}</div>
      </div>`
    : '';
  const timeline = s.rows.length
    ? `<ol class="timeline">${s.rows.map(liveRow).join('')}</ol>`
    : '<div class="empty">Hoy no tienes clases.</div>';
  return `
    <div class="live-side">${liveHero(s)}${after}</div>
    <div class="card live-day">
      <h2 class="live-day-title"><span>Hoy, ${esc(DAY_NAMES[s.day].toLowerCase())}</span>${s.totalCount ? `<small>${s.doneCount} de ${s.totalCount} completadas</small>` : ''}</h2>
      ${timeline}
    </div>`;
}

// Semana como calendario a escala: cada clase mide lo que dura y los huecos se ven.
const PX_PER_MIN = 1.35;
const minutesNow = () => {
  const n = new Date();
  return n.getHours() * 60 + n.getMinutes() + n.getSeconds() / 60;
};
const hhmm = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:00`;

function weekHtml() {
  const today = dayIndex(new Date());
  const nowMin = minutesNow();
  const columns = [0, 1, 2, 3, 4].map((day) => ({ day, rows: mergeSessions(buildDay(faltas.schedule, day)) }));
  const all = columns.flatMap((c) => c.rows);
  if (!all.length) return '';
  const from = Math.floor(Math.min(...all.map((r) => r.startMin)) / 30) * 30;
  const to = Math.ceil(Math.max(...all.map((r) => r.endMin)) / 30) * 30;
  const y = (min) => ((min - from) * PX_PER_MIN).toFixed(1);
  const span = (row) => ((row.endMin - row.startMin) * PX_PER_MIN).toFixed(1);
  const height = y(to);
  const hours = [];
  for (let h = Math.ceil(from / 60) * 60; h <= to; h += 60) hours.push(h);
  const lines = hours.map((h) => `<i class="cal-line" data-top="${y(h)}"></i>`).join('');

  const cols = columns.map(({ day, rows }) => {
    const isToday = day === today;
    const blocks = rows.map((row) => {
      if (row.kind === 'break') {
        return `<div class="cal-gap" data-top="${y(row.startMin)}" data-h="${span(row)}">${esc(row.label)}</div>`;
      }
      const isNow = isToday && row.startMin <= nowMin && nowMin < row.endMin;
      return `<div class="cal-block ${isNow ? 'now' : ''}" data-c="${esc(slotColor(row))}" data-top="${y(row.startMin)}" data-h="${span(row)}">
        ${row.entries.map((e) => `<div class="cal-name">${esc(e.name)}</div>`).join('')}
        <div class="cal-time">${row.start} - ${row.end}${row.sessions > 1 ? ` (${row.sessions} h)` : ''}</div>
      </div>`;
    }).join('');
    const showNow = isToday && nowMin >= from && nowMin <= to;
    return `<div class="cal-col ${isToday ? 'today' : ''}" data-h="${height}">${lines}${blocks}${showNow ? `<i class="cal-now" id="cal-now" data-top="${y(nowMin)}"></i>` : ''}</div>`;
  }).join('');

  const heads = columns.map(({ day }) => `<div class="cal-head ${day === today ? 'today' : ''}">${DAY_NAMES[day]}${day === today ? '<span class="tl-tag now">Hoy</span>' : ''}</div>`).join('');
  const axis = hours.map((h) => `<span class="cal-hour" data-top="${y(h)}">${hhmm(h)}</span>`).join('');
  return `<div class="card cal-card"><div class="cal-scroll"><div class="cal" data-from="${from}">
    <div class="cal-corner"></div>${heads}
    <div class="cal-axis" data-h="${height}">${axis}</div>${cols}
  </div></div></div>`;
}

// ---------- Barra lateral ----------
const longDateFmt = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
const clockFmt = new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' });
const capitalize = (s) => `${s[0].toUpperCase()}${s.slice(1)}`;

function updateClock() {
  const now = new Date();
  const el = document.getElementById('side-clock');
  const html = `<div class="clock-time">${esc(clockFmt.format(now))}</div><div class="clock-date">${esc(capitalize(longDateFmt.format(now)))}</div>`;
  if (el.dataset.last !== html) {
    el.innerHTML = html;
    el.dataset.last = html;
  }
}

// Tarjeta de la clase: sobria, con el color de la asignatura solo como detalle.
function classCard({ color, label, right = '', name, big, small, extra = '' }) {
  return `<div class="sc" data-c="${esc(color)}">
    <div class="sc-top"><span class="sc-label">${label}</span>${right ? `<span class="sc-right">${esc(right)}</span>` : ''}</div>
    <div class="sc-name"><i class="sc-bar"></i><span>${esc(name)}</span></div>
    <div class="sc-when"><b>${esc(big)}</b> <span>${esc(small)}</span></div>
    ${extra}
  </div>`;
}

function sideNowHtml(s) {
  const whenNext = (n) => {
    if (n.daysAhead === 0) return { big: `En ${fmtDuration(n.minutes)}`, small: `a las ${n.row.start}` };
    if (n.daysAhead === 1) return { big: 'Mañana', small: `a las ${n.row.start}` };
    return { big: `El ${DAY_NAMES[n.day].toLowerCase()}`, small: `a las ${n.row.start}` };
  };
  const progress = (row) => `<div class="meter sc-meter" aria-hidden="true"><i class="subject" data-width="${row.progress.toFixed(1)}"></i></div>`;
  const after = () => {
    if (!s.next) return '';
    const w = whenNext(s.next);
    return `<div class="sc-collapse"><div><div class="sc-after">
      <div class="sc-after-top"><span>Después</span><span>${esc(s.next.daysAhead === 0 ? w.small : `${w.big} ${w.small}`)}</span></div>
      <div class="sc-after-name"><span class="dot" data-color="${esc(slotColor(s.next.row))}"></span><span>${esc(slotName(s.next.row))}</span></div>
    </div></div></div>`;
  };

  if (s.current) {
    return classCard({
      color: slotColor(s.current),
      label: '<span class="pulse" aria-hidden="true"></span>En clase',
      right: `${s.current.start} - ${s.current.end}`,
      name: slotName(s.current),
      big: fmtDuration(s.current.minutesLeft),
      small: 'para terminar',
      extra: progress(s.current) + after(),
    });
  }
  if (s.currentBreak) {
    return classCard({
      color: NEUTRAL,
      label: 'Ahora',
      right: `${s.currentBreak.start} - ${s.currentBreak.end}`,
      name: s.currentBreak.label,
      big: fmtDuration(s.currentBreak.minutesLeft),
      small: 'para volver a clase',
      extra: progress(s.currentBreak) + after(),
    });
  }
  if (!s.next) return '';
  const w = whenNext(s.next);
  return classCard({ color: slotColor(s.next.row), label: 'Siguiente clase', name: slotName(s.next.row), big: w.big, small: w.small });
}

// Panel de avisos: todas las entregas cercanas, agrupadas por día.
function noticeRow(t) {
  const meta = t.due ? dueTime(t.due) : '';
  return `<a class="notice" href="${esc(t.url)}" target="_blank" rel="noopener noreferrer" data-tip="${esc(t.name)}">
    <span class="dot" data-color="${esc(courseColor(t.courseName))}"></span>
    <span class="notice-main">
      <span class="notice-name">${esc(t.name)}</span>
      <span class="notice-meta"><span>${esc(courseLabel(t.courseName))}</span><span>${esc(meta)}</span></span>
    </span>
  </a>`;
}

function noticeGroup(label, tasks, tone = '') {
  return `<div class="notice-group">
    <div class="notice-day ${tone}"><span>${esc(label)}</span><span>${tasks.length}</span></div>
    ${tasks.map(noticeRow).join('')}
  </div>`;
}

function sideTaskHtml() {
  const { overdue, groups } = upcomingGroups(tareas?.tasks ?? []);
  const body = [
    overdue.length ? noticeGroup('Vencidas, aún admiten entrega', overdue, 'overdue') : '',
    ...groups.map((g) => noticeGroup(g.label, g.tasks, g.diff <= 1 ? 'soon' : '')),
  ].join('');
  return `<div class="side-panel-body">${body || '<p class="notice-empty">No tienes entregas pendientes.</p>'}</div>
    <div class="side-panel-foot"><a href="#tareas">Ver todas las tareas</a></div>`;
}

// Botón de la barra lateral: despliega el panel de entregas hacia arriba, en la propia barra.
const taskButton = document.getElementById('side-task-btn');
const taskPanel = document.getElementById('side-task');
let taskPanelOpen = false;

function updateTaskButton() {
  taskButton.hidden = !tareas?.connected;
  if (taskButton.hidden) setTaskPanel(false);
  const count = document.getElementById('side-task-count');
  const n = noticeCount(tareas?.tasks ?? []);
  count.textContent = n;
  count.hidden = !n;
  taskButton.setAttribute('aria-label', `Entregas próximas: ${n}`);
}

const animationsOff = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const sideWidgets = taskPanel.parentElement;

// El panel y el bloque "Después" de la tarjeta se animan a la vez y con la misma curva, para
// que nada salte. La altura final se mide antes de pintar: es lo que cabe de verdad en la barra.
function setTaskPanel(open) {
  if (open === taskPanelOpen) return;
  taskPanelOpen = open;
  taskButton.setAttribute('aria-expanded', String(open));
  if (animationsOff()) {
    taskPanel.hidden = !open;
    sideWidgets.classList.toggle('panel-open', open);
    return;
  }
  const start = taskPanel.hidden ? 0 : taskPanel.offsetHeight;
  sideWidgets.classList.add('no-anim');
  if (open) {
    taskPanel.style.maxHeight = '';
    taskPanel.hidden = false;
    sideWidgets.classList.add('panel-open');
    const target = taskPanel.offsetHeight;
    sideWidgets.classList.remove('panel-open');
    taskPanel.style.maxHeight = `${start}px`;
    void taskPanel.offsetHeight;
    sideWidgets.classList.remove('no-anim');
    void taskPanel.offsetHeight;
    sideWidgets.classList.add('panel-open');
    taskPanel.style.maxHeight = target === start ? '' : `${target}px`;
    return;
  }
  taskPanel.style.maxHeight = `${start}px`;
  void taskPanel.offsetHeight;
  sideWidgets.classList.remove('no-anim');
  void taskPanel.offsetHeight;
  sideWidgets.classList.remove('panel-open');
  taskPanel.style.maxHeight = '0px';
  if (start === 0) taskPanel.hidden = true;
}

taskPanel.addEventListener('transitionend', (e) => {
  if (e.target !== taskPanel || e.propertyName !== 'max-height') return;
  if (taskPanelOpen) taskPanel.style.maxHeight = '';
  else taskPanel.hidden = true;
});
taskButton.addEventListener('click', () => setTaskPanel(!taskPanelOpen));
taskPanel.addEventListener('click', (e) => {
  if (e.target.closest('a[href^="#"]')) setTaskPanel(false);
});

const sideLast = {};
function fillSide(id, html, manageVisibility = true) {
  const el = document.getElementById(id);
  if (manageVisibility) el.hidden = !html;
  if (html !== sideLast[id]) paint(html, el); // sin cambios no se repinta, para no reiniciar animaciones
  sideLast[id] = html;
}

function updateBadges() {
  const badge = document.getElementById('faltas-badge');
  const hasItaca = Boolean(faltas?.itaca.user);
  const risk = hasItaca ? faltas.subjects.filter((s) => s.status === 'serious' || s.status === 'critical').length : 0;
  badge.textContent = risk;
  badge.hidden = !risk;
  badge.setAttribute('aria-label', `${risk} en riesgo`);

  const gradesBadge = document.getElementById('notas-badge');
  const unseen = hasItaca ? faltas.notas.unseen : 0;
  const unreadable = hasItaca && faltas.notas.error;
  gradesBadge.textContent = unseen || '!';
  gradesBadge.hidden = !unseen && !unreadable;
  gradesBadge.classList.toggle('neutral', unseen > 0); // una nota nueva no es una alarma
  gradesBadge.setAttribute('aria-label', unseen ? `${unseen} ${plural(unseen, 'nota nueva', 'notas nuevas')}` : 'No se han podido leer las notas');
}

function updateSideNow() {
  updateClock();
  updateBadges();
  const state = faltas?.schedule ? liveState(faltas.schedule) : null;
  fillSide('side-now', state ? sideNowHtml(state) : '');
  fillSide('side-task', tareas?.connected ? sideTaskHtml() : '', false);
  updateTaskButton();
}

let liveKey = '';
const currentLiveKey = () => {
  const s = liveState(faltas.schedule);
  return `${s.day}|${s.current?.start ?? ''}|${s.currentBreak?.start ?? ''}`;
};

function renderHorario() {
  if (ui.scheduleDraft) return renderScheduleEditor();
  const { schedule, itaca, scheduleSource } = faltas;
  const manual = scheduleSource === 'manual';
  const title = '<div><h1>Horario</h1><p>Qué toca ahora y tu semana completa.</p></div>';
  const createManual = (text) => `<div class="connect-alt"><span>${text}</span><button class="btn small" type="button" data-action="edit-schedule">${icon('pencil')}Escribirlo a mano</button></div>`;
  if (!schedule && !itaca.user) {
    return connectItaca(`<header class="page-head">${title}</header>`, createManual('¿Tu centro no usa Web Familia?'));
  }
  const edit = `<button class="btn icon-only" data-action="edit-schedule" data-tip="Editar horario" aria-label="Editar horario">${icon('pencil')}</button>`;
  const head = `<header class="page-head">
      ${title}
      <div class="head-actions">
        ${manual ? '<span class="sync-note">Escrito a mano</span>' : `<span class="sync-note">${esc(agoText(itaca.lastSync))}</span>${refreshButton('sync-itaca', ui.syncing)}`}
        ${schedule ? edit : ''}
      </div>
    </header>`;
  if (!schedule) {
    return paint(`${head}<div class="card empty">${
      ui.syncing
        ? `<div role="status" aria-label="Cargando tu horario">${skeletonRows(5)}</div>`
        : `<strong>Aún no hay horario</strong>${esc(itaca.lastError ?? 'Pulsa Actualizar para leerlo de Web Familia.')}${createManual('O si lo prefieres:')}`
    }</div>`);
  }
  liveKey = currentLiveKey();
  paint(`${head}
    ${manual && itaca.user ? '<div class="banner"><span>Este horario lo has escrito tú, así que no se actualiza desde Web Familia.</span><button class="btn small" data-action="use-itaca-schedule">Usar el de Web Familia</button></div>' : ''}
    <section class="live" id="live-panel" aria-label="Horario en directo">${liveHtml()}</section>
    <h2 class="section-title">Semana completa</h2>
    ${weekHtml()}`);
}

// ---------- Editor del horario ----------
const MAX_PHOTO_BYTES = 15 * 1024 * 1024;

// Lo escrito se guarda en el borrador antes de cada repintado, para no perderlo nunca. Los
// botones del editor lo leen, lo cambian y repintan con renderScheduleEditor, no con render,
// que volvería a leer la pantalla y desharía el cambio.
function readScheduleDraft() {
  const form = document.getElementById('schedule-form');
  if (!form || !ui.scheduleDraft) return;
  const draft = EDITOR_DAYS.map(() => []);
  form.querySelectorAll('.sched-row').forEach((row) => {
    draft[Number(row.dataset.day)].push({
      start: row.querySelector('[name="start"]').value,
      end: row.querySelector('[name="end"]').value,
      name: row.querySelector('[name="name"]').value,
    });
  });
  ui.scheduleDraft = draft;
}

function renderScheduleEditor() {
  const { itaca, scheduleSource, subjects } = faltas;
  const names = [...new Set([...subjects.map((s) => s.name), ...ui.scheduleDraft.flat().map((r) => r.name)])].filter(Boolean);
  const dayCard = (day) => {
    const rows = ui.scheduleDraft[day];
    return `<section class="card sched-day">
      <div class="sched-day-head">
        <h2>${DAY_NAMES[day]}</h2>
        ${day > 0 ? `<button class="btn ghost small" type="button" data-action="copy-day" data-day="${day}">${icon('copy')}Copiar el día anterior</button>` : ''}
      </div>
      ${rows.map((r, i) => `<div class="sched-row" data-day="${day}">
        <input class="input" type="time" name="start" value="${esc(r.start)}" aria-label="Empieza" required>
        <input class="input" type="time" name="end" value="${esc(r.end)}" aria-label="Termina" required>
        <input class="input" name="name" value="${esc(r.name)}" list="sched-names" maxlength="80" placeholder="Asignatura" aria-label="Asignatura" required>
        <button class="btn ghost icon-only" type="button" data-action="del-class" data-day="${day}" data-i="${i}" data-tip="Quitar esta clase" aria-label="Quitar esta clase">${icon('trash')}</button>
      </div>`).join('')}
      <button class="btn small" type="button" data-action="add-class" data-day="${day}">${icon('plus')}Añadir clase</button>
    </section>`;
  };
  paint(`
    <header class="page-head">
      <div><h1>Editar horario</h1><p>Escribe tus clases de lunes a viernes. Los huecos entre clases salen como recreo.</p></div>
      <div class="head-actions">
        <label class="btn small file-btn">${icon('image')}Poner una foto al lado<input type="file" id="schedule-photo" accept="image/*"></label>
      </div>
    </header>
    ${itaca.user && scheduleSource !== 'manual' ? '<div class="banner"><span>Al guardar, Kurso usará este horario en lugar del de Web Familia. Podrás volver a ese cuando quieras.</span></div>' : ''}
    <div class="sched-layout ${ui.schedulePhoto ? 'with-photo' : ''}">
      <form id="schedule-form" data-action="save-schedule" class="sched-form">
        <datalist id="sched-names">${names.map((n) => `<option value="${esc(n)}"></option>`).join('')}</datalist>
        ${EDITOR_DAYS.map(dayCard).join('')}
        <div class="form-error" data-error role="alert" hidden></div>
        <div class="sched-actions">
          <button class="btn primary" type="submit">Guardar horario</button>
          <button class="btn ghost" type="button" data-action="cancel-schedule">Cancelar</button>
        </div>
      </form>
      ${ui.schedulePhoto ? `<aside class="card sched-photo">
        <div class="sched-day-head"><h2>Tu foto</h2><button class="btn ghost small" type="button" data-action="remove-photo">Quitar</button></div>
        <img src="${esc(ui.schedulePhoto)}" alt="Foto de tu horario">
        <p class="help">Es solo para copiarla mientras escribes: no sale de este equipo ni se guarda.</p>
      </aside>` : ''}
    </div>`);
}

function closeScheduleEditor() {
  ui.scheduleDraft = null;
  ui.schedulePhoto = null;
}

// Mantiene el directo al día sin repintar lo demás. Al cambiar de clase repinta todo,
// para que también se mueva el resaltado de la semana.
setInterval(() => {
  updateSideNow();
  if (route() !== 'horario' || !faltas?.schedule || ui.scheduleDraft) return;
  if (currentLiveKey() !== liveKey) return renderIfIdle();
  const panel = document.getElementById('live-panel');
  if (panel) paint(liveHtml(), panel);
  const line = document.getElementById('cal-now');
  const cal = document.querySelector('.cal');
  if (line && cal) line.style.top = `${((minutesNow() - Number(cal.dataset.from)) * PX_PER_MIN).toFixed(1)}px`;
}, 20000);

// ---------- Notas ----------
const WEB_FAMILIA_URL = 'https://familia.edu.gva.es/wf-front/myitaca/login_wf?idioma=C';

function gradesSummaryHtml(s) {
  const fails = s.failed.length;
  const title = s.average === null
    ? `${s.count} ${plural(s.count, 'nota', 'notas')} en ${s.evaluation}`
    : `Media de ${formatAverage(s.average)} en ${s.evaluation}`;
  const sub = fails
    ? `Por debajo de 5: ${s.failed.join(', ')}.`
    : s.passed === s.count
      ? 'Todas aprobadas.'
      : `${s.passed} ${plural(s.passed, 'aprobada', 'aprobadas')}. El resto va con abreviatura.`;
  return `<section class="summary ${fails ? 'serious' : 'good'}">
    <span class="summary-mark">${icon('cap')}</span>
    <div class="summary-main"><h2>${esc(title)}</h2><p>${esc(sub)}</p></div>
    <div class="summary-stats">
      ${summaryStat(s.passed, plural(s.passed, 'Aprobada', 'Aprobadas'))}
      ${summaryStat(fails, plural(fails, 'Suspendida', 'Suspendidas'), fails > 0)}
    </div>
  </section>`;
}

function gradesTableHtml(data) {
  const heads = data.evaluations.map((e) => `<th class="num">${e.date ? `<span data-tip="${esc(e.date)}">${esc(e.name)}</span>` : esc(e.name)}</th>`).join('');
  const rows = data.modules.map((m) => `<tr>
    <td><div class="subj-name"><span class="dot" data-color="${esc(m.color ?? NEUTRAL)}"></span><div><strong>${esc(m.name)}</strong>${m.type ? `<small>${esc(m.type)}</small>` : ''}</div></div></td>
    ${data.evaluations.map((e) => {
      const value = gradeFor(m, e.name);
      return `<td class="num">${value === null ? '<span class="grade none" aria-label="Sin nota">-</span>' : `<span class="grade ${gradeKind(value)}">${esc(value)}</span>`}</td>`;
    }).join('')}
  </tr>`).join('');
  return `<div class="card table-wrap"><table class="grades-table"><thead><tr><th>Asignatura</th>${heads}</tr></thead><tbody>${rows}</tbody></table></div>`;
}

function renderNotas() {
  const { itaca, notas } = faltas;
  const { data, error } = notas;
  if (!itaca.user) return connectItaca('<header class="page-head"><div><h1>Notas</h1><p>Tus calificaciones de cada evaluación, tal como salen en Web Familia.</p></div></header>');
  const open =`<a class="btn small" href="${WEB_FAMILIA_URL}" target="_blank" rel="noopener">Abrir Web Familia</a>`;
  let body;
  if (hasGrades(data)) {
    const summary = gradesSummary(data);
    body = `${summary ? gradesSummaryHtml(summary) : ''}
      <h2 class="section-title">Por asignatura</h2>
      ${gradesTableHtml(data)}
      ${data.legend.length ? `<h2 class="section-title">Abreviaturas</h2><dl class="card grades-legend">${data.legend.map((l) => `<div><dt>${esc(l.code)}</dt><dd>${esc(l.meaning)}</dd></div>`).join('')}</dl>` : ''}
      ${data.notes.length ? `<h2 class="section-title">Observaciones</h2><ul class="card grades-notes">${data.notes.map((n) => `<li>${n.evaluation ? `<small>${esc(n.evaluation)}</small>` : ''}<p>${esc(n.text)}</p></li>`).join('')}</ul>` : ''}`;
  } else if (error) {
    body = `<div class="card empty">${icon('cap')}<strong>No se han podido comprobar tus notas</strong>Kurso volverá a intentarlo la próxima vez que se actualice.</div>`;
  } else if (!data) {
    body =`<div class="card empty">${icon('cap')}<strong>${ui.syncing ? 'Comprobando tus notas' : 'Aún no se han comprobado tus notas'}</strong>Kurso las busca en Web Familia cada vez que se actualiza.</div>`;
  } else {
    body = `<div class="card empty">${icon('cap')}<strong>Todavía no hay notas publicadas</strong>Aparecerán aquí en cuanto tu centro las publique en Web Familia.</div>`;
  }
  paint(`
    <header class="page-head">
      <div><h1>Notas</h1><p>Tus calificaciones de cada evaluación, tal como salen en Web Familia.</p></div>
      <div class="head-actions"><span class="sync-note">${esc(agoText(itaca.lastSync))}</span>${refreshButton('sync-itaca', ui.syncing)}</div>
    </header>
    ${itaca.lastError ? `<div class="banner error"><span>${esc(itaca.lastError)}</span></div>` : ''}
    ${error ? `<div class="banner error"><span>Kurso no ha podido leer la página de calificaciones de Web Familia, así que puede que falten notas. Revísalas allí.</span>${open}</div>` : ''}
    ${data?.stale ? `<div class="banner"><span>Web Familia ya no enseña estas notas. Son las últimas que Kurso leyó.</span>${open}</div>` : ''}
    ${body}
  `);
  if (notas.unseen) {
    notas.unseen = 0;
    updateBadges();
    api('notas/vistas', { method: 'POST' }).catch((e) => console.error(e));
  }
}

// ---------- Navegación ----------
const route = () => (location.hash.slice(1) || 'faltas');

function render() {
  readScheduleDraft();
  updateSideNow();
  updateBadges();
  const r = route();
  document.querySelectorAll('[data-nav]').forEach((a) => {
    a.classList.toggle('active', a.dataset.nav === r);
    if (a.dataset.nav === r) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  const titles = { faltas: 'Faltas', tareas: 'Tareas', notas: 'Notas', horario: 'Horario', ajustes: 'Ajustes' };
  document.title = `${titles[r] ?? 'Inicio'} - Kurso`;
  if (r === 'tareas') {
    if (!tareas) return paint(skeletonHtml());
    return renderTareas();
  }
  if (!faltas) return paint(skeletonHtml());
  if (r === 'horario') return renderHorario();
  if (r === 'notas') return renderNotas();
  return r === 'ajustes' ? renderAjustes() : renderFaltas();
}

function updateBadge() {
  const badge = document.getElementById('tasks-badge');
  const n = liveTasks(tareas?.tasks ?? []).filter((t) => t.state === 'vencida' && !t.hidden && t.canStillSubmit).length;
  badge.textContent = n;
  badge.hidden = !n;
  badge.setAttribute('aria-label', `${n} vencidas`);
}
function setTareas(data) {
  tareas = data;
  updateBadge();
  updateSideNow();
}

// quiet: las actualizaciones automáticas no avisan de errores (por ejemplo, sin internet);
// si la sesión ha caducado, la pantalla de Tareas ya lo enseña.
async function loadTasks(refresh = false, { quiet = false } = {}) {
  ui.busy = true;
  if (route() === 'tareas' && tareas) renderIfIdle();
  try {
    setTareas(await api(`tareas${refresh ? '?refresh=1' : ''}`));
    if (refresh) toast('Tareas actualizadas');
  } catch (e) {
    if (!tareas) tareas = { connected: e.status !== 401 && e.code !== 'noaccount', tasks: [], courses: [], subjects: [], warnings: [] };
    if (e.status === 401 || e.code === 'noaccount') tareas.connected = false;
    // Sin cuenta no hay nada que avisar: la pantalla de Tareas ya pide conectarla.
    if (e.code !== 'noaccount' && !quiet) toast(e.message, 'error');
  } finally {
    ui.busy = false;
    renderIfIdle();
  }
}

// Las cargas en segundo plano no repintan mientras escribes, para no borrarte el formulario.
function renderIfIdle() {
  const typing = view.contains(document.activeElement) && document.activeElement.matches('input, select');
  if (!typing) render();
}

// Con la app abierta mucho rato, las entregas se mantienen al día sin tocar nada.
setInterval(() => {
  if (tareas?.connected) loadTasks(false, { quiet: true });
}, 15 * 60 * 1000);

const SYNC_MAX_AGE_MS = 60 * 60 * 1000;
async function syncItaca({ manual = false } = {}) {
  ui.syncing = true;
  renderIfIdle();
  try {
    const unseenBefore = faltas?.notas.unseen ?? 0;
    faltas = await api('itaca/sync', { method: 'POST' });
    const newGrades = faltas.notas.unseen - unseenBefore;
    if (newGrades > 0) toast(newGrades === 1 ? 'Tienes una nota nueva' : `Tienes ${newGrades} notas nuevas`);
    else if (manual) {
      if (faltas.itaca.lastError) toast('No se ha podido actualizar', 'error');
      else toast(route() === 'notas' ? 'Notas actualizadas' : 'Faltas actualizadas');
    }
  } catch (e) {
    toast(e.message, 'error');
  } finally {
    ui.syncing = false;
    renderIfIdle();
  }
}

// Con la app abierta todo el día, las notas nuevas también llegan sin tocar nada.
setInterval(() => {
  if (faltas?.itaca.user && !ui.syncing) syncItaca();
}, SYNC_MAX_AGE_MS);

// ---------- Eventos ----------
const handlers = {
  'open-add-absence': () => openAddAbsence(),
  tab: (el) => { ui.tab = el.dataset.tab; render(); },
  'toggle-month': (el) => { ui.openMonths.set(el.dataset.key, el.dataset.open !== 'true'); updateTaskResults(); },
  'refresh-tasks': () => loadTasks(true),
  'sync-itaca': () => syncItaca({ manual: true }),
  'hide-task': async (el) => {
    setTareas(await api('tareas/ocultar', { method: 'POST', body: { key: el.dataset.key, hidden: el.dataset.hidden !== 'true' } }));
    render();
  },
  'del-absence': async (el) => {
    faltas = await api(`faltas/${el.dataset.id}`, { method: 'DELETE' });
    render();
  },
  'disconnect-itaca': async () => {
    const ok = await confirmDialog({
      title: '¿Desconectar Web Familia?',
      description: faltas.scheduleSource === 'manual'
        ? 'Se borrará la contraseña guardada en este equipo. No verás tus faltas ni tus notas hasta que vuelvas a conectar la cuenta, pero no se pierden. Tu horario escrito a mano seguirá funcionando.'
        : 'Se borrará la contraseña guardada en este equipo. No verás tus faltas, tus notas ni tu horario hasta que vuelvas a conectar la cuenta, pero no se pierden.',
      action: 'Desconectar',
    });
    if (!ok) return;
    faltas = await api('itaca/disconnect', { method: 'POST' });
    render();
    toast('Web Familia desconectada');
  },
  'disconnect-aules': async () => {
    const ok = await confirmDialog({
      title: '¿Desconectar Aules?',
      description: 'Se borrará el acceso guardado en este equipo y dejarás de ver tus tareas hasta que vuelvas a conectar la cuenta con tu contraseña.',
      action: 'Desconectar',
    });
    if (!ok) return;
    await api('aules/disconnect', { method: 'POST' });
    await loadTasks();
    toast('Aules desconectado');
  },
  'start-tour': () => runTour(),
  logout: async (el) => {
    const ok = await confirmDialog({
      title: '¿Cerrar sesión?',
      description: 'Se desconectarán Aules y Web Familia y se borrarán de este equipo tus faltas, notas, horario, tareas y ajustes, incluidas las horas de cada asignatura y lo que hayas escrito a mano. No se puede deshacer. Tus datos en Aules y Web Familia no cambian.',
      action: 'Cerrar sesión',
    });
    if (!ok) return;
    el.disabled = true;
    await api('sesion/cerrar', { method: 'POST' });
    // Se vuelve a cargar desde cero, sin nada de la sesión anterior en memoria.
    location.replace(location.pathname);
  },
  'edit-schedule': () => {
    ui.scheduleDraft = scheduleToDraft(faltas.schedule ?? faltas.manualSchedule);
    render();
    view.scrollTop = 0;
  },
  'cancel-schedule': () => {
    closeScheduleEditor();
    render();
  },
  'add-class': (el) => {
    readScheduleDraft();
    const rows = ui.scheduleDraft[Number(el.dataset.day)];
    rows.push(nextClass(rows));
    keepScroll(renderScheduleEditor);
    document.querySelector(`.sched-row[data-day="${el.dataset.day}"]:last-of-type [name="name"]`)?.focus();
  },
  'del-class': (el) => {
    readScheduleDraft();
    ui.scheduleDraft[Number(el.dataset.day)].splice(Number(el.dataset.i), 1);
    keepScroll(renderScheduleEditor);
  },
  'copy-day': (el) => {
    readScheduleDraft();
    const day = Number(el.dataset.day);
    ui.scheduleDraft[day] = ui.scheduleDraft[day - 1].map((r) => ({ ...r }));
    keepScroll(renderScheduleEditor);
  },
  'remove-photo': () => {
    readScheduleDraft();
    ui.schedulePhoto = null;
    keepScroll(renderScheduleEditor);
  },
  'use-itaca-schedule': async () => {
    faltas = await api('horario/web-familia', { method: 'POST' });
    render();
    toast('Usando el horario de Web Familia');
    if (!faltas.schedule) syncItaca();
  },
};

// Repinta el editor sin que la página salte arriba.
function keepScroll(fn) {
  const top = view.scrollTop;
  fn();
  view.scrollTop = top;
}

document.addEventListener('change', (e) => {
  if (e.target.id !== 'schedule-photo') return;
  const file = e.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) return toast('Elige una imagen.', 'error');
  if (file.size > MAX_PHOTO_BYTES) return toast('La imagen es demasiado grande.', 'error');
  const reader = new FileReader();
  reader.onload = () => {
    if (!document.getElementById('schedule-form')) return; // ya no se está editando
    readScheduleDraft();
    ui.schedulePhoto = reader.result;
    keepScroll(renderScheduleEditor);
  };
  reader.onerror = () => toast('No se ha podido abrir la imagen.', 'error');
  reader.readAsDataURL(file);
  return undefined;
});

document.addEventListener('click', async (e) => {
  const el = e.target.closest('[data-action]');
  if (!el || el.matches('form, select, input')) return;
  try {
    await handlers[el.dataset.action]?.(el);
  } catch (err) {
    toast(err.message, 'error');
  }
});

document.addEventListener('input', (e) => {
  if (e.target.dataset?.action !== 'task-search') return;
  ui.search = e.target.value;
  updateTaskResults();
});

document.addEventListener('change', async (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  try {
    switch (el.dataset.action) {
      case 'filter-absences': ui.absenceFilter = el.value; render(); break;
      case 'filter-course': ui.course = el.value; render(); break;
      case 'show-hidden': ui.showHidden = el.checked; render(); break;
      case 'hours-input':
        const cleared = el.value === '';
        faltas = await api(`asignaturas/${el.dataset.code}`, { method: 'PUT', body: { totalHours: el.value } });
        {
          // Se actualiza solo esa fila, para no mover el foco del campo siguiente.
          const s = faltas.subjects.find((x) => x.code === el.dataset.code);
          if (s) {
            if (document.activeElement !== el) el.value = s.totalHours ?? '';
            const cell = document.querySelector(`.hours-source[data-code="${CSS.escape(s.code)}"]`);
            if (cell) cell.innerHTML = hoursTag(s);
          }
        }
        toast(cleared ? 'Vuelve la estimación' : 'Horas guardadas');
        break;
      case 'setting-pct':
        faltas = await api('ajustes', { method: 'PUT', body: { limitPct: el.value } });
        toast('Límite guardado');
        break;
      case 'setting':
        faltas = await api('ajustes', { method: 'PUT', body: { [el.dataset.key]: el.checked } });
        toast('Ajuste guardado');
        break;
      case 'toggle-course':
        setTareas(await api('cursos/ocultar', { method: 'POST', body: { courseId: el.dataset.id, hidden: !el.checked } }));
        break;
    }
  } catch (err) {
    toast(err.message, 'error');
  }
});

document.addEventListener('submit', async (e) => {
  const form = e.target.closest('form[data-action]');
  if (!form) return;
  e.preventDefault();
  const data = Object.fromEntries(new FormData(form));
  const submit = form.querySelector('[type=submit]');
  const submitText = submit.textContent;
  submit.disabled = true;
  try {
    switch (form.dataset.action) {
      case 'connect-aules':
        submit.textContent = 'Conectando...';
        setTareas(await api('aules/connect', { method: 'POST', body: data }));
        toast('Aules conectado');
        render();
        break;
      case 'connect-itaca':
        submit.textContent = 'Conectando...';
        faltas = await api('itaca/connect', { method: 'POST', body: data });
        toast('Web Familia conectada');
        render();
        break;
      case 'save-schedule':
        readScheduleDraft();
        faltas = await api('horario', { method: 'PUT', body: { entries: draftToEntries(ui.scheduleDraft) } });
        closeScheduleEditor();
        render();
        view.scrollTop = 0;
        toast('Horario guardado');
        break;
      case 'add-absence':
        faltas = await api('faltas', {
          method: 'POST',
          body: { subject: data.subject, date: data.date, hours: data.hours, justified: 'justified' in data, type: 'late' in data ? 'retraso' : 'falta' },
        });
        dialog.close();
        render();
        toast('Falta añadida');
        break;
    }
  } catch (err) {
    submit.disabled = false;
    submit.textContent = submitText;
    if (form.dataset.action === 'connect-aules') return connectAules(err.message);
    const box = form.querySelector('[data-error]');
    if (box) { box.textContent = err.message; box.hidden = false; } else toast(err.message, 'error');
  }
});

// ---------- Tema ----------
const themeBtn = document.getElementById('theme-toggle');
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const label = theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro';
  themeBtn.innerHTML = icon(theme === 'dark' ? 'sun' : 'moon');
  themeBtn.dataset.tip = label;
  themeBtn.setAttribute('aria-label', label);
  window.kursoDesktop?.setTheme(theme);
  try { localStorage.setItem('tema', theme); } catch { /* sin almacenamiento: tema solo de esta sesión */ }
}
let savedTheme = null;
try { savedTheme = localStorage.getItem('tema'); } catch { /* idem */ }
applyTheme(savedTheme ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
themeBtn.addEventListener('click', () => applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));

document.querySelectorAll('[data-icon]').forEach((el) => {
  el.outerHTML = icon(el.dataset.icon);
});

// ---------- Tutorial ----------
function runTour() {
  startTour({
    steps: TOUR_STEPS,
    shell: document.getElementById('shell'),
    go: (r) => { if (route() !== r) location.hash = r; },
    onEnd: () => {
      api('tutorial', { method: 'POST' }).catch(() => {}); // si falla, como mucho se vuelve a ofrecer
      view.focus({ preventScroll: true });
    },
  });
}

// Solo tras el primer registro en este equipo. Un usuario ya registrado, o uno nuevo en un
// equipo donde ya hubo otro, no lo vuelve a ver (siempre está en Ajustes).
async function tourAfterFirstRegistration() {
  const estado = await api('estado').catch(() => null);
  if (estado && !estado.tutorialDone) setTimeout(runTour, 350);
}

// ---------- Arranque ----------
initWelcome({
  root: document.getElementById('welcome'),
  shell: document.getElementById('shell'),
  api,
  icon,
  esc,
  onTareas: (data) => { setTareas(data); render(); },
  onFaltas: (data) => { faltas = data; render(); },
  onClose: ({ firstRegistration }) => {
    view.focus({ preventScroll: true });
    if (firstRegistration) tourAfterFirstRegistration();
  },
});
window.addEventListener('hashchange', () => {
  view.classList.remove('enter');
  render();
  void view.offsetWidth; // reinicia la animación de entrada
  view.classList.add('enter');
  view.focus({ preventScroll: true });
  view.scrollTop = 0;
});
render();
api('faltas')
  .then((d) => {
    faltas = d;
    render();
    const age = d.itaca.lastSync ? Date.now() - new Date(d.itaca.lastSync) : Infinity;
    if (d.itaca.user && (age > SYNC_MAX_AGE_MS || !d.schedule || !d.notas.data)) syncItaca();
  })
  .catch((e) => toast(e.message, 'error'));
loadTasks();
