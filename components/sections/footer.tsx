/**
 * Footer: script-font names + date over the dark band, accent divider
 * (live :1910-1919). The dark band uses the theme's button color, which in
 * the terracotta preset is the live design's stone-800.
 */
export function Footer({
  coupleNames,
  dateDisplay,
  note,
}: {
  coupleNames: string
  dateDisplay: string
  note?: string
}) {
  return (
    <footer className="py-12 bg-button text-white">
      <div className="max-w-4xl mx-auto text-center px-6">
        <div className="space-y-4">
          <h3 className="font-display text-4xl tracking-wide">{coupleNames}</h3>
          <p className="text-white/70 font-light">{dateDisplay}</p>
          <div className="w-16 h-px bg-accent mx-auto" aria-hidden />
          {note ? <p className="text-white/70 font-light text-sm pt-2">{note}</p> : null}
        </div>
      </div>
    </footer>
  )
}
