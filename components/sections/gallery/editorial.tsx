import type { ResolvedGalleryImage } from "@/components/sections/gallery"
import { cn } from "@/lib/cn"

/**
 * Editorial gallery (premium): alternating photo/caption rows, magazine
 * style. The caption is the only visible text — the legacy layout rendered
 * `alt` as a visible heading (a bug: alt is the attribute, Q12), fixed here.
 * A caption-less photo runs full width instead of leaving an empty column.
 */
export function EditorialGallery({ images }: { images: ResolvedGalleryImage[] }) {
  if (images.length === 0) return null
  return (
    <div className="space-y-12">
      {images.map((image, i) =>
        image.caption ? (
          <figure key={i} className="grid gap-6 md:grid-cols-2 md:items-center">
            {/* eslint-disable-next-line @next/next/no-img-element -- tenant-supplied URL (Q13) */}
            <img
              src={image.src}
              alt={image.alt}
              loading="lazy"
              className={cn(
                "h-80 w-full object-cover rounded-tenant shadow-sm",
                i % 2 === 1 && "md:order-2",
              )}
            />
            <figcaption className={cn("space-y-4", i % 2 === 1 && "md:order-1")}>
              <div className="w-12 h-px bg-accent" aria-hidden />
              <p className="text-lg font-light leading-relaxed text-ink-muted">{image.caption}</p>
            </figcaption>
          </figure>
        ) : (
          <figure key={i}>
            {/* eslint-disable-next-line @next/next/no-img-element -- tenant-supplied URL (Q13) */}
            <img
              src={image.src}
              alt={image.alt}
              loading="lazy"
              className="w-full max-h-[28rem] object-cover rounded-tenant shadow-sm"
            />
          </figure>
        ),
      )}
    </div>
  )
}
