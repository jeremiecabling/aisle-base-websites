import { tenantFontCss } from "@/lib/fonts"

/**
 * Apex landing (addendum Q9): minimal, branded, indexable.
 * Tenant sites never render here — middleware rewrites tenant hosts to
 * /s/<slug> before this route is reached.
 */
export default function ApexLanding() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-canvas px-6 text-center">
      <style dangerouslySetInnerHTML={{ __html: tenantFontCss("Great Vibes", "Cormorant Garamond") }} />
      <h1 className="font-display text-6xl md:text-7xl text-ink">Aisle Base</h1>
      <div className="h-px w-16 bg-accent my-8" aria-hidden />
      <p className="font-body text-xl md:text-2xl font-light text-ink-muted max-w-xl leading-relaxed">
        Beautifully designed, personally managed wedding websites. You share your story — we
        handle everything else.
      </p>
      <p className="font-body text-lg text-ink-muted mt-10">
        <a href="mailto:hello@aislebase.com" className="underline decoration-accent underline-offset-4 hover:text-ink transition-colors">
          Get in touch
        </a>
      </p>
    </main>
  )
}
