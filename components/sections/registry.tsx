import type { RegistryItem } from "@/lib/config-schema"
import { Section, SectionHeader } from "@/components/sections/section-shell"
import { Card, CardContent } from "@/components/ui/card"
import { ButtonLink } from "@/components/ui/button"

/**
 * Registry: intro copy + fund cards in a 2-up grid (live design :1847-1888).
 * Rows without a URL never reach this component (schema drops them — the
 * Bug 1 era's silently-filtered links are impossible by construction).
 */
export function Registry({
  heading,
  intro,
  items,
}: {
  heading: string
  intro?: string
  items: RegistryItem[]
}) {
  if (items.length === 0) return null
  return (
    <Section id="registry">
      <SectionHeader title={heading} subtitle={intro} />
      <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto pt-4">
        {items.map((item, i) => (
          <Card key={`${i}-${item.title}`}>
            <CardContent className="space-y-4">
              <h3 className="text-xl font-body text-ink">{item.title}</h3>
              {item.description ? (
                <p className="text-ink-muted font-light text-sm">{item.description}</p>
              ) : null}
              <ButtonLink href={item.url} className="w-full">
                {item.button_label ?? item.title}
              </ButtonLink>
            </CardContent>
          </Card>
        ))}
      </div>
    </Section>
  )
}
