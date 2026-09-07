"use client"

import { useEffect, useState } from "react"
import { daysUntilInTimezone } from "@/lib/countdown"

/**
 * Countdown per addendum Q11 — fixes HANDOFF §5 bug 9 (once-on-mount UTC
 * parse that went negative after the date):
 * - whole days between "today in the couple's timezone" and wedding_date
 *   (lib/countdown.ts — shared with the server)
 * - ≥1 → the number + caption; 0 → the "today" message; past → renders
 *   nothing, from the FIRST paint (initialDays is computed server-side per
 *   request in page.tsx, so there is no post-hydration layout collapse)
 * - a client effect recomputes on mount so long-cached HTML self-corrects
 *   for viewers near midnight
 */
export function Countdown({
  weddingDate,
  timezone,
  initialDays,
  caption,
  todayMessage,
}: {
  weddingDate: string
  timezone: string
  /** Server-computed at render time (page.tsx) — the first-paint value. */
  initialDays: number
  /** e.g. "days to go" — chrome countdown_days or Basics countdown_caption */
  caption: string
  /** chrome countdown_today */
  todayMessage: string
}) {
  const [days, setDays] = useState<number>(initialDays)

  useEffect(() => {
    setDays(daysUntilInTimezone(weddingDate, timezone))
  }, [weddingDate, timezone])

  // Past the date, or a schema-valid but impossible date (e.g. 2027-02-31
  // parses to NaN): hide the section rather than render a giant "NaN".
  if (!Number.isFinite(days) || days < 0) return null

  return (
    <section className="py-20 bg-canvas-alt">
      <div className="max-w-4xl mx-auto text-center px-6">
        <div className="space-y-8">
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
      </div>
    </section>
  )
}
