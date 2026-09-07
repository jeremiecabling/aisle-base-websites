import type { Metadata } from "next"
import { FONT_WHITELIST } from "@/lib/config-schema"
import { fontStack, tenantFontCss } from "@/lib/fonts"

/**
 * Q18c operator tool: eyeball the display-font candidates at production hero
 * sizes before/while choosing theme presets — script fonts differ wildly in
 * x-height and the hero is the product. Renders every whitelisted display
 * font in the hero, nav-monogram, and footer treatments over both light and
 * dark grounds, paired with the Cormorant Garamond body. Operator-facing;
 * noindex.
 */
export const metadata: Metadata = {
  title: "Display font preview — Aisle Base",
  robots: { index: false, follow: false },
}

const DISPLAY_FONTS = FONT_WHITELIST.filter((f) => f !== "Cormorant Garamond")

export default function FontsPreview() {
  return (
    <main className="min-h-screen bg-canvas">
      <style
        dangerouslySetInnerHTML={{
          __html: DISPLAY_FONTS.map((f) => tenantFontCss(f, "Cormorant Garamond")).join("\n"),
        }}
      />
      <div className="max-w-3xl mx-auto px-6 py-12 text-ink-muted font-light">
        <h1 className="text-2xl font-body text-ink mb-2">Display font preview (Q18c)</h1>
        <p className="leading-relaxed">
          The hero is the product; compare x-heights before assigning presets. Great Vibes ships
          in terracotta/blush, Allura in sage, Pinyon Script in noir — all OFL, self-hosted.
          Symphony Pro (the live site&apos;s font) is commercial and intentionally absent.
        </p>
      </div>
      {DISPLAY_FONTS.map((font) => (
        <section key={font}>
          <div className="text-center py-12 px-6">
            <p className="text-sm tracking-widest uppercase text-ink-muted mb-6">{font}</p>
            <h2
              className="text-5xl md:text-8xl tracking-wide text-ink"
              style={{ fontFamily: fontStack(font) }}
            >
              Ana &amp; Ben
            </h2>
            <div className="w-32 h-px bg-accent mx-auto my-6" aria-hidden />
            <p className="text-3xl md:text-4xl font-body text-ink">June 12, 2027</p>
            <p className="mt-6 text-2xl text-ink" style={{ fontFamily: fontStack(font) }}>
              A &amp; B <span className="text-ink-muted text-base font-body">(nav monogram)</span>
            </p>
          </div>
          <div className="bg-button text-white text-center py-12 px-6">
            <h3 className="text-7xl tracking-wide" style={{ fontFamily: fontStack(font) }}>
              Lizbeth &amp; Jeremie
            </h3>
            <p className="text-white/70 font-body font-light mt-4 tracking-widest">
              GATE / FOOTER TREATMENT
            </p>
          </div>
        </section>
      ))}
    </main>
  )
}
