// Datos inventados de 2º de DAW para el modo demostración. Las fechas se calculan a partir
// de "ahora", así que la demo siempre parece reciente: faltas de las últimas semanas,
// entregas próximas, alguna vencida y notas de la primera evaluación.
const DAY = 86400;
const at = (base, days, hh = 23, mm = 59) => {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  d.setHours(hh, mm, 0, 0);
  return Math.floor(d.getTime() / 1000);
};
const iso = (sec) => {
  const d = new Date(sec * 1000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
// El lunes de la semana de una fecha, para que las faltas caigan en días de clase.
const weekday = (base, weeksAgo, day) => {
  const d = new Date(base);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7) - weeksAgo * 7 + day);
  return iso(Math.floor(d.getTime() / 1000));
};

const SUBJECTS = [
  ['DWEC', 'Desarrollo web en entorno cliente', '#CD74E6', 6],
  ['DWES', 'Desarrollo web en entorno servidor', '#16A765', 6],
  ['DIW', 'Diseño de interfaces web', '#9A9CFF', 4],
  ['DAW', 'Despliegue de aplicaciones web', '#C2A878', 3],
  ['ING', 'Inglés profesional', '#4986E7', 3],
  ['IPE', 'Itinerario personal para la empleabilidad II', '#A47AE2', 3],
  ['PI', 'Proyecto intermodular', '#AC725E', 3],
  ['SOS', 'Sostenibilidad aplicada al sistema productivo', '#FF7537', 1],
  ['DIG', 'Digitalización aplicada al sistema productivo', '#2CA6A4', 1],
];

// Seis sesiones de 55 minutos por la mañana, con el recreo de 10:45 a 11:15.
const SLOTS = [['08:00', '08:55'], ['08:55', '09:50'], ['09:50', '10:45'], ['11:15', '12:10'], ['12:10', '13:05'], ['13:05', '14:00']];
const WEEK = [
  ['DWEC', 'DWEC', 'DIW', 'DWES', 'DWES', 'ING'],
  ['DWES', 'DWES', 'DAW', 'DIW', 'PI', 'IPE'],
  ['DWEC', 'DWEC', 'ING', 'DAW', 'DIW', 'SOS'],
  ['DWES', 'DWES', 'PI', 'IPE', 'DWEC', 'DIG'],
  ['DIW', 'DAW', 'DWEC', 'PI', 'ING', 'IPE'],
];

export function buildDemo(now = new Date()) {
  const byCode = Object.fromEntries(SUBJECTS.map(([code, name]) => [code, name]));
  const schedule = WEEK.flatMap((codes, day) => codes.map((code, i) => ({
    day, start: SLOTS[i][0], end: SLOTS[i][1], module: byCode[code], subject: code,
  })));

  const absence = (id, code, date, time, extra = {}) => ({
    id: `demo:${id}`, source: 'itaca', subject: code, module: byCode[code], date, time, hours: 1, type: 'falta', justified: false, ...extra,
  });
  const absences = [
    absence(1, 'PI', weekday(now, 1, 1), '12:10'),
    absence(2, 'PI', weekday(now, 2, 3), '08:55'),
    absence(3, 'PI', weekday(now, 3, 4), '11:15'),
    absence(4, 'DIW', weekday(now, 1, 0), '09:50'),
    absence(5, 'DIW', weekday(now, 4, 2), '12:10', { justified: true }),
    absence(6, 'ING', weekday(now, 2, 0), '13:05', { type: 'retraso', hours: 0 }),
    absence(7, 'DWES', weekday(now, 5, 1), '08:00'),
  ];

  const task = (id, name, code, due, state, extra = {}) => ({
    key: `demo:${id}`, kind: 'Tarea', name, courseId: SUBJECTS.findIndex(([c]) => c === code) + 1, courseName: byCode[code],
    url: 'https://aules.edu.gva.es/fp/my/', due, cutoff: null, grade: null, state, canStillSubmit: true, ...extra,
  });
  const tasks = [
    task(1, 'Práctica 4: Formularios con validación en el cliente', 'DWEC', at(now, 0, 23, 59), 'pendiente'),
    task(2, 'API REST con autenticación por token', 'DWES', at(now, 1, 23, 59), 'pendiente', { draft: true }),
    task(3, 'Prototipo de alta fidelidad en Figma', 'DIW', at(now, 3, 14, 0), 'pendiente'),
    task(4, 'Cuestionario: Docker y contenedores', 'DAW', at(now, 5, 20, 0), 'pendiente', { kind: 'Cuestionario' }),
    task(5, 'Job interview role-play', 'ING', at(now, 8, 23, 59), 'pendiente'),
    task(6, 'Entrega 2 del proyecto: diseño de la base de datos', 'PI', at(now, 12, 23, 59), 'pendiente'),
    task(7, 'Plan de carrera y CV europeo', 'IPE', at(now, 27, 23, 59), 'pendiente'),
    task(8, 'Despliegue en un servidor con Nginx', 'DAW', at(now, -2, 23, 59), 'vencida'),
    task(9, 'Huella de carbono de un centro de datos', 'SOS', at(now, -1, 14, 0), 'vencida'),
    task(10, 'Práctica 3: Manipulación del DOM', 'DWEC', at(now, -6, 23, 59), 'entregada', { submittedAt: at(now, -7, 18, 30), grade: '9,00 / 10,00' }),
    task(11, 'Sesiones y cookies en PHP', 'DWES', at(now, -9, 23, 59), 'entregada', { submittedAt: at(now, -9, 21, 10), grade: '8,50 / 10,00' }),
    task(12, 'Guía de estilo de la aplicación', 'DIW', at(now, -14, 23, 59), 'entregada', { submittedAt: at(now, -15, 12, 0) }),
    task(13, 'Reading comprehension: tech news', 'ING', at(now, -20, 23, 59), 'entregada', { submittedAt: at(now, -21, 17, 45), grade: '7,00 / 10,00' }),
  ];

  const grade = (code, values) => ({ module: byCode[code], subject: code, type: null, grades: values.map(([evaluation, value]) => ({ evaluation, value })) });
  const grades = {
    evaluations: [{ name: '1ª Evaluación', date: iso(at(now, -3)) }, { name: '2ª Evaluación', date: null }, { name: 'Final', date: null }],
    modules: [
      grade('DWEC', [['1ª Evaluación', '8,50']]),
      grade('DWES', [['1ª Evaluación', '7,75']]),
      grade('DIW', [['1ª Evaluación', '9']]),
      grade('DAW', [['1ª Evaluación', '6,25']]),
      grade('ING', [['1ª Evaluación', '8']]),
      grade('IPE', [['1ª Evaluación', 'AP']]),
      grade('PI', [['1ª Evaluación', '4,50']]),
      grade('SOS', [['1ª Evaluación', '7']]),
      grade('DIG', [['1ª Evaluación', '10']]),
    ],
    legend: [{ code: 'AP', meaning: 'Apto' }, { code: 'NE', meaning: 'No evaluado' }],
    notes: [{ evaluation: '1ª Evaluación', text: 'Buen trabajo en general. En el proyecto intermodular hay que recuperar el ritmo de entregas.' }],
    stale: false,
  };

  const nowIso = now.toISOString();
  return {
    subjects: SUBJECTS.map(([code, name, color, weekly]) => ({
      code, name, color, keywords: [name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()],
      totalHours: Math.round((weekly * 1000) / 30), hoursSource: 'estimado', weeklySessions: weekly,
    })),
    itacaModules: SUBJECTS.map(([, name]) => name),
    absences,
    settings: { limitPct: 15, countJustified: false, countLates: false },
    hiddenTasks: [],
    hiddenCourses: [],
    tasksCache: {
      fetchedAt: nowIso, user: 'JOSÉ RAMÓN CASTILLO AMAT', warnings: [], tasks,
      courses: SUBJECTS.map(([code, name], i) => ({ id: i + 1, name, shortname: code, finished: false })),
    },
    aulesUser: 'JOSÉ RAMÓN CASTILLO AMAT',
    itacaUser: 'DEMO',
    itacaLastSync: nowIso,
    itacaLastError: null,
    itacaWarnings: [],
    schedule,
    manualSchedule: null,
    scheduleSource: 'itaca',
    grades,
    gradesUnseen: 2,
    gradesError: false,
    onboardingDone: true,
    tutorialDone: true,
    skippedAccounts: [],
  };
}
