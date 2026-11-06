// Cuentas de la pantalla de Notas. Sin DOM, para poder probarlas.
const PASS_MARK = 5;

// Nota numérica de 0 a 10, o null si es una abreviatura como las de la leyenda.
export function gradeNumber(value) {
  if (!/^\d{1,2}(?:[.,]\d+)?$/.test(value)) return null;
  const n = Number(value.replace(',', '.'));
  return n <= 10 ? n : null;
}

export function gradeKind(value) {
  const n = gradeNumber(value);
  if (n === null) return 'other';
  return n < PASS_MARK ? 'fail' : 'pass';
}

export const hasGrades = (data) => Boolean(data?.modules.some((m) => m.grades.length));

export const gradeFor = (module, evaluation) => module.grades.find((g) => g.evaluation === evaluation)?.value ?? null;

// Resumen de la última evaluación con notas. Las abreviaturas no entran en la media.
export function gradesSummary(data) {
  const evaluation = [...data.evaluations].reverse().find((e) => data.modules.some((m) => gradeFor(m, e.name) !== null))?.name;
  if (!evaluation) return null;
  const rows = data.modules
    .map((m) => ({ name: m.name, value: gradeFor(m, evaluation) }))
    .filter((r) => r.value !== null);
  const numbers = rows.map((r) => gradeNumber(r.value)).filter((n) => n !== null);
  return {
    evaluation,
    count: rows.length,
    average: numbers.length ? numbers.reduce((a, b) => a + b, 0) / numbers.length : null,
    passed: rows.filter((r) => gradeKind(r.value) === 'pass').length,
    failed: rows.filter((r) => gradeKind(r.value) === 'fail').map((r) => r.name),
  };
}

export const formatAverage = (n) => n.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 2 });
