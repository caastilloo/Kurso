// Pantalla inicial: asistente la primera vez y un saludo breve en las siguientes.
const AUTO_ENTER_MS = 3000; // el mismo tiempo que la barra de carga en styles.css

// Aules da el nombre completo en mayúsculas. Con cuatro palabras o más se asume nombre
// compuesto ("JOSÉ RAMÓN CASTILLO AMAT"); con menos, solo el primer nombre.
export function firstNames(fullName) {
  const words = String(fullName ?? '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '';
  return words
    .slice(0, words.length >= 4 ? 2 : 1)
    .map((w) => `${w[0].toLocaleUpperCase('es')}${w.slice(1).toLocaleLowerCase('es')}`)
    .join(' ');
}

export function greetingFor(hour) {
  if (hour < 6 || hour >= 21) return 'Buenas noches';
  return hour < 14 ? 'Buenos días' : 'Buenas tardes';
}

// Qué se enseña al abrir la app. La primera vez, la presentación y las cuentas. Después, solo
// las cuentas que falten, salvo las que el usuario ha dicho que no usa. Con todo, el saludo.
export function welcomePlan({ aules, itaca, onboardingDone, skipped = [] }) {
  const missing = [!aules && 'aules', !itaca && 'itaca'].filter((a) => a && !skipped.includes(a));
  if (!missing.length) return { mode: 'splash', steps: [], returning: false };
  if (!onboardingDone) return { mode: 'wizard', steps: ['intro', ...missing], returning: false };
  return { mode: 'wizard', steps: missing, returning: true };
}

const ACCOUNT_NAMES = { aules: 'Aules', itaca: 'Web Familia' };

const FEATURES = [
  ['calendar', 'Faltas', 'Cuántas horas llevas y cuántas puedes faltar en cada asignatura.'],
  ['list', 'Tareas', 'Lo que tienes por entregar y lo que ya venció en Aules.'],
  ['cap', 'Notas', 'Tus calificaciones de cada evaluación en cuanto se publican.'],
  ['clock', 'Horario', 'Qué clase toca ahora, cuál viene después y tu semana completa.'],
];

export function initWelcome({ root, shell, api, icon, esc, onTareas, onFaltas, onClose }) {
  let mode = null;
  let steps = [];
  let index = 0;
  let timer = null;
  let closed = false;
  let userName = '';
  let returning = false;
  let firstRegistration = false; // la presentación y el registro de alguien nuevo

  const close = () => {
    if (closed) return;
    closed = true;
    clearTimeout(timer);
    document.removeEventListener('keydown', onSplashKey);
    shell.inert = false;
    root.classList.add('leaving');
    const finish = () => { root.hidden = true; };
    root.addEventListener('transitionend', finish, { once: true });
    setTimeout(finish, 300); // por si la animación está desactivada
    onClose({ firstRegistration });
  };

  function onSplashKey(e) {
    if (e.key === 'Enter' || e.key === 'Escape' || e.key === ' ') {
      e.preventDefault();
      close();
    }
  }

  const stepMark = () => {
    const forms = steps.filter((s) => s === 'aules' || s === 'itaca');
    const n = forms.indexOf(steps[index]);
    return n < 0 || forms.length < 2 ? '' : `<div class="welcome-step">Paso ${n + 1} de ${forms.length}</div>`;
  };

  // Al volver, el título y el texto dicen que es para recuperar el acceso, no una presentación.
  const credentialForm = (kind, help, fields, privacy) => {
    const name = ACCOUNT_NAMES[kind];
    return `
    ${stepMark()}
    <h1>${returning ? `Vuelve a conectar ${name}` : `Conecta ${name}`}</h1>
    <p class="welcome-lead">${esc(returning ? `Kurso no tiene acceso a tu cuenta de ${name}. ${help}` : help)}</p>
    <form class="welcome-form" data-welcome="${kind}">
      ${fields}
      <div class="form-error" data-error role="alert" hidden></div>
      <div class="welcome-actions">
        <button class="btn primary" type="submit">Conectar</button>
        <button class="btn ghost" type="button" data-skip>Ahora no</button>
      </div>
      <p class="privacy">${icon('lock')}<span>${esc(privacy)}</span></p>
      <button class="link-btn" type="button" data-never="${kind}">No uso ${name}, no volver a preguntar</button>
    </form>`;
  };

  const SCREENS = {
    intro: () => `
      <span class="welcome-mark" aria-hidden="true"></span>
      <h1>Te damos la bienvenida a Kurso</h1>
      <p class="welcome-lead">Tu curso en un solo sitio. Conecta tus cuentas una vez y la app se encarga del resto.</p>
      <ul class="welcome-features">${FEATURES.map(([ico, name, text]) => `<li>${icon(ico)}<span><b>${esc(name)}</b>${esc(text)}</span></li>`).join('')}</ul>
      <div class="welcome-actions"><button class="btn primary" type="button" data-next>Empezar</button></div>`,
    aules: () => credentialForm('aules', 'Usa el mismo usuario y contraseña con los que entras en Aules. Con esto verás tus tareas.', `
      <label class="field"><span>Usuario</span><input class="input" name="username" autocomplete="username" required></label>
      <label class="field"><span>Contraseña</span><input class="input" name="password" type="password" autocomplete="current-password" required></label>`,
    'La contraseña se usa una sola vez para pedir acceso a Aules y no se guarda. Solo se conserva un token, cifrado con tu usuario de Windows.'),
    itaca: () => credentialForm('itaca', 'Tu usuario es tu NIF o NIE, igual que en Web Familia. Con esto verás tus faltas, tus notas y tu horario.', `
      <label class="field"><span>Usuario (NIF/NIE)</span><input class="input" name="documento" autocomplete="off" required></label>
      <label class="field"><span>Contraseña</span><input class="input" name="password" type="password" autocomplete="off" required></label>`,
    'Se guarda solo en este equipo, cifrada con tu usuario de Windows, porque Web Familia no ofrece otra forma de acceso.'),
  };

  function showStep() {
    const step = steps[index];
    root.innerHTML = `<div class="welcome-drag"></div><div class="welcome-panel">${SCREENS[step]()}</div>`;
    (root.querySelector('input') ?? root.querySelector('.btn.primary'))?.focus();
  }

  // Al terminar, si ya se sabe quién eres, el saludo de siempre; si no, directo a la app.
  async function finishWizard() {
    await api('bienvenida', { method: 'POST' }).catch(() => {});
    const estado = await api('estado').catch(() => null);
    if (!estado?.user) return close();
    userName = estado.user;
    return showSplash();
  }

  function showSplash() {
    mode = 'splash';
    root.innerHTML = splashHtml();
    document.addEventListener('keydown', onSplashKey);
    timer = setTimeout(close, AUTO_ENTER_MS);
  }

  // Tras el último paso se entra directamente en la app.
  const nextStep = () => {
    index += 1;
    if (index >= steps.length) return finishWizard();
    return showStep();
  };

  root.addEventListener('click', (e) => {
    if (mode === 'splash') return close();
    if (e.target.closest('[data-next], [data-skip]')) return nextStep();
    const never = e.target.closest('[data-never]');
    if (never) {
      never.disabled = true;
      api('bienvenida/omitir', { method: 'POST', body: { account: never.dataset.never } })
        .catch(() => {}) // si falla, como mucho se volverá a preguntar
        .finally(nextStep);
    }
    return undefined;
  });

  root.addEventListener('submit', async (e) => {
    const form = e.target.closest('form[data-welcome]');
    if (!form) return;
    e.preventDefault();
    const kind = form.dataset.welcome;
    const button = form.querySelector('[type=submit]');
    const box = form.querySelector('[data-error]');
    const skip = form.querySelector('[data-skip]');
    box.hidden = true;
    button.disabled = true;
    skip.disabled = true;
    button.textContent = 'Conectando...';
    try {
      const data = await api(`${kind}/connect`, { method: 'POST', body: Object.fromEntries(new FormData(form)) });
      if (kind === 'aules') onTareas(data);
      else onFaltas(data);
      nextStep();
    } catch (err) {
      box.textContent = err.message;
      box.hidden = false;
      button.disabled = false;
      skip.disabled = false;
      button.textContent = 'Conectar';
      const password = form.querySelector('input[type=password]');
      password.value = '';
      password.focus();
    }
  });

  function splashHtml() {
    const name = firstNames(userName);
    return `<div class="welcome-drag"></div>
      <div class="welcome-panel wide">
        <h1>${esc(greetingFor(new Date().getHours()))}${name ? `, ${esc(name)}` : ''}</h1>
        <p class="welcome-lead">Te damos la bienvenida a tu panel de Formación Profesional</p>
        <div class="welcome-timer" aria-hidden="true"><i></i></div>
      </div>`;
  }

  (async () => {
    let estado;
    try {
      estado = await api('estado');
    } catch {
      close(); // sin estado no se bloquea la entrada a la app
      return;
    }
    userName = estado.user ?? '';
    const plan = welcomePlan(estado);
    shell.inert = true;
    if (plan.mode === 'wizard') {
      mode = 'wizard';
      steps = plan.steps;
      returning = plan.returning;
      firstRegistration = !plan.returning;
      index = 0;
      showStep();
      return;
    }
    showSplash();
  })();
}
