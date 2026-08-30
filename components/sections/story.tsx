import type { StoryBlock } from "@/lib/config-schema"
import { Section, SectionHeader } from "@/components/sections/section-shell"

/**
 * Our Story: centered header, left-aligned light paragraphs (live :1890-1908),
 * extended for v2 with optional per-block headings and images.
 */
export function Story({ heading, blocks }: { heading: string; blocks: StoryBlock[] }) {
  if (blocks.length === 0) return null
  return (
    <Section id="our-story">
      <SectionHeader title={heading} />
      <div className="space-y-6 text-ink-muted font-light">
        {blocks.map((block, i) => (
          <div key={i} className="space-y-4">
            {block.heading ? (
              <h3 className="text-xl font-body text-ink text-left">{block.heading}</h3>
            ) : null}
            {block.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element -- tenant-supplied URL (Q13)
              <img
                src={block.image_url}
                alt={block.heading ?? ""}
                loading="lazy"
                className="w-full max-h-[28rem] object-cover rounded-tenant"
              />
            ) : null}
            <p className="text-left leading-relaxed">{block.paragraph}</p>
          </div>
        ))}
      </div>
    </Section>
  )
}
