/** Local-date helpers for forms. The app runs in Argentina, so the browser's local time is the club's time. */

export const localDateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export const localTimeKey = (d: Date) =>
  `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`

/** "2026-11-20" + "18:30" → Date in local time. */
export function combineDateTime(day: string, time: string): Date {
  const [y, m, d] = day.split('-').map(Number)
  const [hh, mm] = time.split(':').map(Number)
  return new Date(y, m - 1, d, hh, mm)
}

/** The next `count` days starting today, as "YYYY-MM-DD". */
export const nextDays = (count: number) =>
  Array.from({ length: count }, (_, i) => localDateKey(new Date(Date.now() + i * 86400000)))
