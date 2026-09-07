import type { Gallery } from "@/lib/config-schema"
import { Section, SectionHeader } from "@/components/sections/section-shell"
import { EditorialGallery } from "@/components/sections/gallery/editorial"
import { FilmstripGallery } from "@/components/sections/gallery/filmstrip"
import { GridGallery } from "@/components/sections/gallery/grid"
import { MasonryGallery } from "@/components/sections/gallery/masonry"

/** A gallery image after Q12 alt resolution — the shape the layouts render. */
export type ResolvedGalleryImage = { src: string; alt: string; caption?: string }

/**
 * Gallery: centered header + one of four photo layouts dispatched on
 * `gallery.layout` (salvaged from the legacy standalone gallery page).
 * Image caps and the premium-layout entitlement are enforced upstream
 * (schema superRefine + script truncation) — this renders exactly what it
 * receives. Alt text resolves here per addendum Q12:
 * `alt_text ?? caption ?? "Photo N"`.
 */
export function GallerySection({ heading, gallery }: { heading: string; gallery: Gallery }) {
  if (gallery.images.length === 0) return null
  const images: ResolvedGalleryImage[] = gallery.images.map((image, i) => ({
    src: image.image_url,
    alt: image.alt_text ?? image.caption ?? `Photo ${i + 1}`,
    caption: image.caption,
  }))
  return (
    <Section id="gallery" wide>
      <SectionHeader title={heading} />
      {gallery.layout === "masonry" ? (
        <MasonryGallery images={images} />
      ) : gallery.layout === "editorial" ? (
        <EditorialGallery images={images} />
      ) : gallery.layout === "filmstrip" ? (
        <FilmstripGallery images={images} />
      ) : (
        <GridGallery images={images} />
      )}
    </Section>
  )
}
