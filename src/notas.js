const key = (module, evaluation) => `${module}|${evaluation}`;

// Sustituye las notas guardadas por las recién leídas y cuenta cuántas son nuevas o han
// cambiado. Si Web Familia deja de enseñar unas notas ya conocidas, se conservan marcadas:
// perderlas en silencio sería peor que enseñarlas avisando.
export function mergeGrades(previous, fresh) {
  if (!fresh.modules.length && previous?.modules.length) {
    return { grades: { ...previous, stale: true }, newCount: 0 };
  }
  const known = new Map((previous?.modules ?? []).flatMap((m) => m.grades.map((g) => [key(m.module, g.evaluation), g.value])));
  const newCount = fresh.modules
    .flatMap((m) => m.grades.map((g) => [key(m.module, g.evaluation), g.value]))
    .filter(([k, value]) => known.get(k) !== value).length;
  return { grades: { ...fresh, stale: false }, newCount };
}
