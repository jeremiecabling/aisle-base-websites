import type { ResolvedGalleryImage } from "@/components/sections/gallery"

/**
 * Filmstrip gallery (premium): one horizontal snap-scroll row of tall frames.
 * Bleeds into the section gutter (-mx-6 / px-6 / scroll-pl-6) so the strip
 * scrolls edge-to-edge under the container padding. Pure CSS scroll-snap —
 * stays a server component.
 */
export function FilmstripGallery({ images }: { images: ResolvedGalleryImage[] }) {
  if (images.length === 0) return null
  return (
    <div className="-mx-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-4 scroll-pl-6">
      {images.map((image, i) => (
        <figure
          key={i}
          className="w-72 shrink-0 snap-start overflow-hidden rounded-tenant border border-ink/10 bg-canvas shadow-sm"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- tenant-supplied URL (Q13) */}
          <img
            src={image.src}
            alt={image.alt}
            loading="lazy"
            className="h-96 w-full object-cover"
          />
          {image.caption ? (
            <figcaption className="px-4 py-3 text-sm font-light text-ink-muted">
              {image.caption}
            </figcaption>
          ) : null}
        </figure>
      ))}
    </div>
  )
}
