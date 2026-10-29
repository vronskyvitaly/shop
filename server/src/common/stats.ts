// Хелперы для статистики сотрудников (склад, доставка).
// Сутки считаются по часовому поясу сервера — для учебного магазина этого достаточно

export const STATS_DAYS = 7;

export function startOfDay(date = new Date()) {
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  return day;
}

// Начало периода статистики: полночь (STATS_DAYS - 1) дней назад, сегодня тоже входит
export function statsPeriodStart() {
  const day = startOfDay();
  day.setDate(day.getDate() - (STATS_DAYS - 1));
  return day;
}

// 2026-10-13 — ключ дня в местном времени (toISOString дал бы день по UTC)
export function dayKey(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// Счётчики по дням за период, от старых к сегодняшнему; пустые дни — с нулём
export function countByDay(dates: Date[]) {
  const days = new Map<string, number>();
  const day = statsPeriodStart();
  for (let i = 0; i < STATS_DAYS; i++) {
    days.set(dayKey(day), 0);
    day.setDate(day.getDate() + 1);
  }
  for (const date of dates) {
    const key = dayKey(date);
    if (days.has(key)) days.set(key, days.get(key)! + 1);
  }
  return [...days].map(([date, count]) => ({ date, count }));
}

export function minutesBetween(from: Date | null, to: Date | null) {
  if (!from || !to) return null;
  return Math.max(0, Math.round((to.getTime() - from.getTime()) / 60_000));
}

// Среднее время в минутах; задания без отметок времени (статус менял админ) не учитываются
export function averageMinutes(values: (number | null)[]) {
  const known = values.filter((value) => value !== null);
  if (known.length === 0) return null;
  return Math.round(
    known.reduce((sum, value) => sum + value, 0) / known.length,
  );
}
