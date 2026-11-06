// Tutorial: un recorrido corto por la app que ilumina cada apartado y lo explica en una frase.
export const TOUR_STEPS = [
  { route: 'faltas', target: '[data-nav="faltas"]', title: 'Faltas', text: 'Cuántas horas has faltado en cada asignatura y cuántas te quedan antes de perder la evaluación continua. Con el + añades una falta a mano.' },
  { route: 'tareas', target: '[data-nav="tareas"]', title: 'Tareas', text: 'Tus entregas de Aules por meses: pendientes, vencidas y entregadas. Puedes buscarlas y ocultar las que no te interesen.' },
  { route: 'notas', target: '[data-nav="notas"]', title: 'Notas', text: 'Tus calificaciones de cada evaluación. Cuando se publique alguna nueva, aparecerá un número aquí.' },
  { route: 'horario', target: '[data-nav="horario"]', title: 'Horario', text: 'Qué clase toca ahora y tu semana completa. Con el lápiz puedes corregirlo o escribirlo a mano.' },
  { target: '#side-now', title: 'Tu clase, siempre a la vista', text: 'La clase en curso, cuánto le queda y cuál viene después, estés en el apartado que estés.' },
  { target: '#side-task-btn', title: 'Entregas próximas', text: 'Despliégalo para ver lo que vence en los próximos días.' },
  { route: 'ajustes', target: '[data-nav="ajustes"]', title: 'Ajustes', text: 'Tus cuentas, las horas de cada asignatura y cerrar sesión. Desde aquí puedes volver a ver este recorrido.' },
];

const GAP = 14;
const MARGIN = 12;
const PAD = 6;
const SETTLE_MS = 160;

export function isVisible(el) {
  if (!el || el.hidden || el.closest('[hidden]')) return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
}

// Dónde va la tarjeta: a la derecha del elemento si cabe, si no debajo, y si no a la izquierda.
export function placePopover(target, pop, viewport) {
  const clamp = (v, min, max) => Math.max(min, Math.min(v, max));
  const maxTop = viewport.height - pop.height - MARGIN;
  if (target.right + GAP + pop.width <= viewport.width - MARGIN) {
    return { left: target.right + GAP, top: clamp(target.top + target.height / 2 - pop.height / 2, MARGIN, maxTop) };
  }
  const left = clamp(target.left, MARGIN, viewport.width - pop.width - MARGIN);
  if (target.bottom + GAP + pop.height <= viewport.height - MARGIN) return { left, top: target.bottom + GAP };
  if (target.top - GAP - pop.height >= MARGIN) return { left, top: target.top - GAP - pop.height };
  return { left: clamp(target.left - GAP - pop.width, MARGIN, viewport.width - pop.width - MARGIN), top: clamp(target.top, MARGIN, maxTop) };
}

const nextFrame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export function startTour({ steps, shell, go, onEnd }) {
  if (document.querySelector('.tour')) return;
  const root = document.createElement('div');
  root.className = 'tour';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-labelledby', 'tour-title');
  root.innerHTML = `<div class="tour-spot"></div>
    <div class="card tour-pop">
      <span class="tour-count"></span>
      <h2 id="tour-title"></h2>
      <p></p>
      <div class="tour-actions">
        <button class="btn ghost small" type="button" data-tour="skip">Saltar</button>
        <span class="tour-space"></span>
        <button class="btn small" type="button" data-tour="prev">Atrás</button>
        <button class="btn primary small" type="button" data-tour="next">Siguiente</button>
      </div>
    </div>`;
  document.body.append(root);
  shell.inert = true;
  const spot = root.querySelector('.tour-spot');
  const pop = root.querySelector('.tour-pop');
  const next = root.querySelector('[data-tour="next"]');
  const prev = root.querySelector('[data-tour="prev"]');
  let index = -1;
  let shown = [];
  let busy = false;

  const position = () => {
    const el = document.querySelector(steps[index]?.target);
    if (!isVisible(el)) return;
    const r = el.getBoundingClientRect();
    Object.assign(spot.style, { top: `${r.top - PAD}px`, left: `${r.left - PAD}px`, width: `${r.width + PAD * 2}px`, height: `${r.height + PAD * 2}px` });
    const p = pop.getBoundingClientRect();
    const target = { top: r.top - PAD, left: r.left - PAD, right: r.right + PAD, bottom: r.bottom + PAD, height: r.height + PAD * 2 };
    const at = placePopover(target, { width: p.width, height: p.height }, { width: innerWidth, height: innerHeight });
    Object.assign(pop.style, { top: `${at.top}px`, left: `${at.left}px` });
  };

  // Va al paso pedido; si su elemento no está a la vista, sigue en la misma dirección.
  async function show(to, dir = 1) {
    if (busy) return;
    busy = true;
    let i = to;
    while (i >= 0 && i < steps.length) {
      if (steps[i].route) go(steps[i].route);
      await nextFrame();
      await wait(SETTLE_MS);
      if (isVisible(document.querySelector(steps[i].target))) break;
      i += dir;
    }
    busy = false;
    if (i < 0) return show(0, 1);
    if (i >= steps.length) return end();
    index = i;
    if (!shown.includes(i)) shown = [...shown, i].sort((a, b) => a - b);
    const visible = steps.filter((s) => isVisible(document.querySelector(s.target)) || s.route).length;
    const step = steps[i];
    root.querySelector('.tour-count').textContent = `${steps.slice(0, i + 1).filter((s) => s.route || isVisible(document.querySelector(s.target))).length} de ${visible}`;
    root.querySelector('h2').textContent = step.title;
    root.querySelector('p').textContent = step.text;
    const last = !steps.slice(i + 1).some((s) => s.route || isVisible(document.querySelector(s.target)));
    next.textContent = last ? 'Terminar' : 'Siguiente';
    prev.hidden = shown[0] === i || i === 0;
    position();
    next.focus();
    return undefined;
  }

  function end() {
    removeEventListener('resize', position);
    document.removeEventListener('keydown', onKey, true);
    root.remove();
    shell.inert = false;
    onEnd();
  }

  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); end(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); show(index + 1, 1); }
    else if (e.key === 'ArrowLeft' && index > 0) { e.preventDefault(); show(index - 1, -1); }
  }

  root.addEventListener('click', (e) => {
    const action = e.target.closest('[data-tour]')?.dataset.tour;
    if (action === 'skip') end();
    else if (action === 'next') show(index + 1, 1);
    else if (action === 'prev') show(index - 1, -1);
  });
  addEventListener('resize', position);
  document.addEventListener('keydown', onKey, true);
  show(0, 1);
}
