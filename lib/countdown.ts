/**
 * Countdown day-math (addendum Q11), shared by the server (page.tsx computes
 * the first-paint value per request) and the client (the Countdown component
 * recomputes on mount so long-cached HTML self-corrects near midnight).
 *
 * "today in the couple's timezone" via en-CA (YYYY-MM-DD) formatting, then a
 * whole-day diff on UTC-midnight timestamps — no DST/UTC off-by-one (HANDOFF
 * §5 bug 9). Returns NaN for impossible dates (e.g. 2027-02-31); callers
 * hide the section on non-finite values.
 */
export function daysUntilInTimezone(weddingDate: string, timezone: string): number {
  let todayIso: string
  try {
    todayIso = new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(new Date())
  } catch {
    // Bad IANA string from the sheet: fall back to system-local rather than
    // crash the page; the config warnings flag the bad value.
    todayIso = new Intl.DateTimeFormat("en-CA").format(new Date())
  }
  const msPerDay = 24 * 60 * 60 * 1000
  return Math.round((Date.parse(weddingDate) - Date.parse(todayIso)) / msPerDay)
}
