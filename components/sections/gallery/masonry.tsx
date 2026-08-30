import type { ResolvedGalleryImage } from "@/components/sections/gallery"

/**
 * Masonry gallery (premium): CSS multi-columns with natural image heights —
 * the staggered look comes from each photo keeping its own aspect ratio
 * (the legacy layout's fixed h-80 flattened it into a plain grid). Vertical
 * spacing is a per-figure margin because `space-y-*` breaks across columns.
 */
export function MasonryGallery({ images }: { images: ResolvedGalleryImage[] }) {
  if (images.length === 0) return null
  return (
    <div className="columns-1 sm:columns-2 lg:columns-3 gap-4">
      {images.map((image, i) => (
        <figure
          key={i}
          className="mb-4 break-inside-avoid overflow-hidden rounded-tenant border border-ink/10 bg-canvas shadow-sm"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- tenant-supplied URL (Q13) */}
          <img src={image.src} alt={image.alt} loading="lazy" className="w-full" />
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
