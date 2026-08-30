import type { ResolvedGalleryImage } from "@/components/sections/gallery"

/**
 * Grid gallery: the base-tier layout — an even 3-up (2-up tablet) grid of
 * fixed-height crops so rows stay level. Captions sit in a card-style footer
 * strip; caption-less photos are just the framed image.
 */
export function GridGallery({ images }: { images: ResolvedGalleryImage[] }) {
  if (images.length === 0) return null
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {images.map((image, i) => (
        <figure
          key={i}
          className="overflow-hidden rounded-tenant border border-ink/10 bg-canvas shadow-sm"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- tenant-supplied URL (Q13) */}
          <img
            src={image.src}
            alt={image.alt}
            loading="lazy"
            className="h-64 w-full object-cover"
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
