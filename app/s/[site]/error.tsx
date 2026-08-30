"use client"

import { useEffect } from "react"

/**
 * Tenant error boundary. A config failure with no last-known-good lands
 * here — the guest sees a calm holding page, the operator sees the real
 * error in the Vercel logs (lib/config.ts throws loudly and specifically).
 * Static English on purpose: config (and chrome strings) are exactly what
 * we failed to load.
 */
export default function TenantError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[tenant-error]", error)
  }, [error])

  return (
    <main className="min-h-screen flex items-center justify-center bg-canvas px-6">
      <div className="text-center space-y-6 max-w-md">
        <h1 className="text-3xl font-body text-ink">Just a moment</h1>
        <div className="w-16 h-px bg-accent mx-auto" aria-hidden />
        <p className="text-ink-muted font-light leading-relaxed">
          This site is having a brief hiccup. Please try again in a minute.
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center justify-center px-6 py-3 font-light tracking-wider bg-button text-white hover:opacity-90 transition-opacity"
        >
          Try again
        </button>
      </div>
    </main>
  )
}
