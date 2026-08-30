"use client"

import { useEffect, useState } from "react"

/**
 * Countdown per addendum Q11 — fixes HANDOFF §5 bug 9 (once-on-mount UTC
 * parse that went negative after the date):
 * - whole days between "today in the couple's timezone" and wedding_date
 * - ≥1 → the number + caption; 0 → the "today" message; past → renders nothing
 *
 * Client component: "today" is the viewer's now (computed in the couple's
 * timezone), so it cannot be baked into cached server HTML. First paint is
 * an empty shell of fixed height to avoid layout shift; the number fades in.
 */

function daysUntilInTimezone(weddingDate: string, timezone: string): number {
  // "today in that timezone" via en-CA (YYYY-MM-DD) formatting, then whole-day
  // diff on UTC-midnight timestamps — no DST/UTC off-by-one.
  let todayIso: string
  try {
    todayIso = new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(new Date())
  } catch {
    // Bad IANA string from the sheet: fall back to viewer-local rather than
    // crash the page; the config health check flags the bad value.
    todayIso = new Intl.DateTimeFormat("en-CA").format(new Date())
  }
  const msPerDay = 24 * 60 * 60 * 1000
  return Math.round((Date.parse(weddingDate) - Date.parse(todayIso)) / msPerDay)
}

export function Countdown({
  weddingDate,
  timezone,
  caption,
  todayMessage,
}: {
  weddingDate: string
  timezone: string
  /** e.g. "days to go" — chrome countdown_days or Basics countdown_caption */
  caption: string
  /** chrome countdown_today */
  todayMessage: string
}) {
  const [days, setDays] = useState<number | null>(null)

  useEffect(() => {
    setDays(daysUntilInTimezone(weddingDate, timezone))
  }, [weddingDate, timezone])

  if (days !== null && days < 0) return null

  return (
    <section className="py-20 bg-canvas-alt">
      <div className="max-w-4xl mx-auto text-center px-6 min-h-32">
        {days !== null ? (
          <div className="space-y-8 animate-fade-rise">
            {days === 0 ? (
              <h2 className="text-4xl md:text-5xl font-body text-ink">{todayMessage}</h2>
            ) : (
              <>
                <h2 className="text-4xl md:text-5xl font-body text-ink">{days}</h2>
                <div className="w-24 h-px bg-accent mx-auto" aria-hidden />
                <p className="text-xl text-ink-muted font-light tracking-wide">{caption}</p>
              </>
            )}
          </div>
        ) : null}
      </div>
    </section>
  )
}
