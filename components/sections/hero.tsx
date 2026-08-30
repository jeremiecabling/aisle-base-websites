import type { Basics } from "@/lib/config-schema"

/**
 * Full-bleed hero: photo, script-font couple names, hairline divider,
 * tagline, serif date, venue lines (live design :1796-1824).
 * Text over the photo stays white by design — media contrast, not theme.
 */
export function Hero({ basics }: { basics: Basics }) {
  return (
    <section className="relative h-screen flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 z-0">
        {basics.hero_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- tenant-supplied URL (Q13)
          <img
            src={basics.hero_image_url}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          // No hero photo: dark ground so the white-over-media text (and the
          // nav's unscrolled white palette) stays readable.
          <div className="absolute inset-0 bg-button" />
        )}
        <div className="absolute inset-0 bg-black/20" />
      </div>

      <div className="relative z-10 text-center text-white space-y-6 px-4">
        <div className="space-y-4">
          <h1 className="font-display text-5xl md:text-8xl tracking-wide">{basics.couple_names}</h1>
          <div className="w-32 h-px bg-white/60 mx-auto" aria-hidden />
          {basics.hero_tagline ? (
            <p className="text-xl font-light tracking-widest">{basics.hero_tagline}</p>
          ) : null}
          <p className="text-3xl md:text-4xl font-body">{basics.wedding_date_display}</p>
          {basics.venue_line_1 ? (
            <p className="text-lg md:text-xl font-light tracking-wide text-white/90">
              {basics.venue_line_1}
            </p>
          ) : null}
          {basics.venue_line_1 && basics.venue_line_2 ? (
            <p className="text-lg md:text-xl font-light tracking-wide text-white/90">&amp;</p>
          ) : null}
          {basics.venue_line_2 ? (
            <p className="text-lg md:text-xl font-light tracking-wide text-white/90">
              {basics.venue_line_2}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  )
}
