// Cliente de Aules (Moodle) a través de su API oficial de la app móvil.
// La contraseña solo se usa para obtener el token y no se guarda.
const BASE = 'https://aules.edu.gva.es/fp';
const SERVICE = 'moodle_mobile_app';
const CONCURRENCY = 6;

export class AulesError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

async function post(path, params) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'Kurso/1.0' },
    body: new URLSearchParams(params),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new AulesError(`Aules ha respondido con un error ${res.status}.`, 'http');
  return res.json();
}

export async function login(username, password) {
  const data = await post('/login/token.php', { username, password, service: SERVICE });
  if (data.token) return data.token;
  if (data.errorcode === 'invalidlogin') {
    throw new AulesError('Usuario o contraseña de Aules incorrectos.', 'invalidlogin');
  }
  throw new AulesError(data.error || 'Aules no ha permitido iniciar sesión.', data.errorcode);
}

async function call(token, wsfunction, params = {}) {
  const data = await post('/webservice/rest/server.php?moodlewsrestformat=json', {
    wstoken: token,
    wsfunction,
    ...params,
  });
  if (data && data.exception) {
    const expired = data.errorcode === 'invalidtoken' || data.errorcode === 'accessexception';
    throw new AulesError(
      expired ? 'La sesión de Aules ha caducado. Vuelve a conectar tu cuenta.' : data.message,
      expired ? 'expired' : data.errorcode
    );
  }
  return data;
}

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    })
  );
  return out;
}

// Aules devuelve textos con entidades HTML (&nbsp;, &amp;...); la interfaz ya escapa
// por su cuenta, así que aquí tienen que quedar como texto normal.
const ENTITIES = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", '#39': "'" };
export const stripHtml = (s) =>
  s
    ? String(s)
        .replace(/<[^>]*>/g, ' ')
        .replace(/&(nbsp|amp|lt|gt|quot|apos|#39);/g, (_, e) => ENTITIES[e])
        .replace(/\s+/g, ' ')
        .trim()
    : '';

// Quita de los nombres de curso las coletillas de grupo y de año ('-'2CFSC, 2026-2027...).
export const cleanCourseName = (name) =>
  stripHtml(name)
    .replace(/'?-'?\s*2CFSC\s*$/i, '')
    .replace(/'+$/, '')
    .replace(/\s+\d{4}-\d{4}\s*$/, '')
    .replace(/^2DAW\s*-\s*/i, '')
    .trim();

// El curso escolar empieza el 1 de septiembre: lo anterior es de otro curso.
export function academicYearStart(now = new Date()) {
  const year = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  return Math.floor(new Date(year, 8, 1).getTime() / 1000);
}

// Traduce el estado de Moodle al estado que importa: ¿me queda algo por hacer?
export function classifyAssignment(assign, status, nowSec) {
  const attempt = status?.lastattempt;
  if (assign.nosubmissions || attempt?.submissionsenabled === false) return null;

  const submission = attempt?.teamsubmission?.status ? attempt.teamsubmission : attempt?.submission;
  const graded = attempt?.gradingstatus === 'graded' || attempt?.graded === true;
  const due = Math.max(assign.duedate || 0, attempt?.extensionduedate || 0);
  const cutoff = assign.cutoffdate || 0;
  const opensAt = assign.allowsubmissionsfromdate > nowSec ? assign.allowsubmissionsfromdate : null;

  const base = {
    due: due || null,
    cutoff: cutoff || null,
    grade: stripHtml(status?.feedback?.gradefordisplay) || null,
  };
  if (submission?.status === 'submitted' || graded) {
    const reallySubmitted = submission?.status === 'submitted';
    return { ...base, state: 'entregada', submittedAt: reallySubmitted ? submission.timemodified : null, gradedOnly: !reallySubmitted };
  }
  if (due && due < nowSec) {
    return { ...base, state: 'vencida', canStillSubmit: (!cutoff || cutoff > nowSec) && attempt?.canedit !== false };
  }
  return { ...base, state: 'pendiente', canStillSubmit: true, opensAt, draft: submission?.status === 'draft' };
}

// Aules pone el cmid en event.instance, no el id de la tarea. La URL del evento lleva
// ese mismo cmid, así que sirve para reconocer una tarea que ya viene de la otra vía.
export function eventCmid(ev) {
  try {
    const id = Number(new URL(ev.url).searchParams.get('id'));
    return id || ev.instance || null;
  } catch {
    return ev.instance || null;
  }
}

export async function fetchTasks(token, now = new Date()) {
  const nowSec = Math.floor(now.getTime() / 1000);
  const yearStart = academicYearStart(now);
  const warnings = [];

  const site = await call(token, 'core_webservice_get_site_info');
  const rawCourses = await call(token, 'core_enrol_get_users_courses', { userid: site.userid });
  const courses = rawCourses.map((c) => ({
    id: c.id,
    name: cleanCourseName(c.fullname),
    shortname: c.shortname,
    finished: Boolean(c.enddate) && c.enddate < yearStart,
  }));
  const courseById = new Map(courses.map((c) => [c.id, c]));
  const tasks = [];

  // 1. Tareas de entrega, con su estado real curso a curso.
  const assignParams = {};
  courses.forEach((c, i) => (assignParams[`courseids[${i}]`] = c.id));
  const assignData = courses.length ? await call(token, 'mod_assign_get_assignments', assignParams) : { courses: [] };
  const assignments = assignData.courses.flatMap((c) => c.assignments.map((a) => ({ ...a, courseId: c.id })));

  let failedStatus = 0;
  const statuses = await mapLimit(assignments, CONCURRENCY, async (a) => {
    try {
      return await call(token, 'mod_assign_get_submission_status', { assignid: a.id });
    } catch (e) {
      if (e.code === 'expired') throw e;
      failedStatus += 1;
      return null;
    }
  });
  if (failedStatus) warnings.push(`No se pudo leer el estado de ${failedStatus} tareas.`);

  const seenCmids = new Set();
  assignments.forEach((a, i) => {
    if (!statuses[i]) return;
    const info = classifyAssignment(a, statuses[i], nowSec);
    if (!info) return;
    seenCmids.add(a.cmid);
    // Una tarea sin entregar de antes de septiembre es de otro curso, no algo pendiente.
    if (info.state !== 'entregada' && info.due && info.due < yearStart) return;
    tasks.push({
      key: `assign:${a.id}`,
      kind: 'Tarea',
      name: stripHtml(a.name),
      courseId: a.courseId,
      courseName: courseById.get(a.courseId)?.name ?? '',
      url: `${BASE}/mod/assign/view.php?id=${a.cmid}`,
      ...info,
    });
  });

  // 2. Lo demás que la línea de tiempo de Aules marca (cuestionarios, foros...).
  let after = null;
  for (let page = 0; page < 10; page += 1) {
    const params = { timesortfrom: yearStart, limitnum: 50, limittononsuspendedevents: 1 };
    if (after) params.aftereventid = after;
    const { events = [], lastid } = await call(token, 'core_calendar_get_action_events_by_timesort', params);
    for (const ev of events) {
      if (ev.modulename === 'assign' && seenCmids.has(eventCmid(ev))) continue;
      if (ev.action && ev.action.actionable === false) continue;
      const courseId = ev.course?.id ?? ev.courseid;
      tasks.push({
        key: `event:${ev.id}`,
        kind: { quiz: 'Cuestionario', assign: 'Tarea', forum: 'Foro', workshop: 'Taller', lesson: 'Lección', choice: 'Consulta' }[ev.modulename] ?? 'Actividad',
        name: stripHtml(ev.activityname || ev.name),
        courseId,
        courseName: courseById.get(courseId)?.name ?? cleanCourseName(ev.course?.fullname),
        url: ev.url || ev.action?.url || `${BASE}/my/`,
        due: ev.timesort || null,
        cutoff: null,
        grade: null,
        state: ev.overdue || (ev.timesort && ev.timesort < nowSec) ? 'vencida' : 'pendiente',
        canStillSubmit: true,
      });
    }
    if (events.length < 50 || !lastid) break;
    after = lastid;
  }

  return {
    fetchedAt: now.toISOString(),
    user: site.fullname,
    courses,
    tasks,
    warnings,
  };
}
