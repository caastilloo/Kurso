// Cálculo del límite de faltas por asignatura.
// "A partir del 15%" significa que ALCANZAR el límite ya te hace perder la evaluación
// continua. Por eso las horas seguras son las que te dejan por debajo, nunca en él.

export function statusFor(ratio) {
  if (ratio >= 1) return 'critical';
  if (ratio >= 0.8) return 'serious';
  if (ratio >= 0.5) return 'warning';
  return 'good';
}

export function countsTowardLimit(absence, settings) {
  if (absence.type === 'retraso') return settings.countLates;
  if (absence.justified) return settings.countJustified;
  return true;
}

export function summarize(subjects, absences, settings) {
  return subjects.map((subject) => {
    const own = absences.filter((a) => a.subject === subject.code);
    const counted = own.filter((a) => countsTowardLimit(a, settings));
    // Un retraso no tiene horas propias: si se decide contarlo, vale una hora.
    const hours = counted.reduce((sum, a) => sum + (a.type === 'retraso' ? 1 : a.hours ?? 1), 0);
    const base = {
      code: subject.code,
      name: subject.name,
      color: subject.color,
      totalHours: subject.totalHours,
      hoursSource: subject.hoursSource ?? null,
      weeklySessions: subject.weeklySessions ?? null,
      hours,
      justified: own.filter((a) => a.type !== 'retraso' && a.justified).reduce((s, a) => s + (a.hours ?? 1), 0),
      unjustified: own.filter((a) => a.type !== 'retraso' && !a.justified).reduce((s, a) => s + (a.hours ?? 1), 0),
      lates: own.filter((a) => a.type === 'retraso').length,
    };
    if (!subject.totalHours) return { ...base, limit: null, remaining: null, ratio: null, status: 'unknown' };
    const limit = (subject.totalHours * settings.limitPct) / 100;
    const reachesAt = Math.ceil(limit - 1e-9);
    const ratio = limit > 0 ? hours / limit : 0;
    return {
      ...base,
      limit,
      reachesAt,
      remaining: Math.max(0, reachesAt - 1 - hours),
      pctOfTotal: (hours / subject.totalHours) * 100,
      ratio,
      status: hours >= reachesAt ? 'critical' : statusFor(ratio),
    };
  });
}
