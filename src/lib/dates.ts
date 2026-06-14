/** All "what day is it" questions are answered in exam timezone (Asia/Manila). */

export function manilaDay(d: Date | string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(
    new Date(d)
  );
}

export function manilaToday(): string {
  return manilaDay(new Date());
}

/** Calendar arithmetic on a YYYY-MM-DD string — no timezone drift. */
export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + n));
  return date.toISOString().slice(0, 10);
}

/** Whole calendar days from `from` to `to` (both YYYY-MM-DD). Negative if `to` is past. */
export function daysBetween(from: string, to: string): number {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86400_000);
}

/** Calendar days from today (Asia/Manila) until `examDate`. Negative once the date has passed. */
export function daysUntilExam(examDate: string): number {
  return daysBetween(manilaToday(), examDate);
}
