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
