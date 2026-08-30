import type { TravelItem } from "@/lib/config-schema"
import { Section, SectionHeader } from "@/components/sections/section-shell"
import { ButtonLink } from "@/components/ui/button"

/**
 * Travel: centered hotel-block stack — light lead copy, key facts (phone,
 * block name) emphasized as font-normal ink inside the muted paragraph,
 * deep-linked booking CTA, group code as a small muted line under the button
 * (live design :1471-1510). The live site wove one hotel's facts into
 * hardcoded sentences; here the connective copy lives in `description` and
 * each TravelItem renders the same stack.
 */
export function Travel({
  heading,
  bookButtonLabel,
  items,
}: {
  heading: string
  bookButtonLabel: string
  items: TravelItem[]
}) {
  if (items.length === 0) return null
  return (
    <Section id="travel">
      <SectionHeader title={heading} className="mb-8" />
      <div className="max-w-2xl mx-auto space-y-12 text-center">
        {items.map((item) => (
          <HotelBlock key={item.hotel_name} item={item} bookButtonLabel={bookButtonLabel} />
        ))}
      </div>
    </Section>
  )
}

/** One hotel: name → description → address → phone · block name → CTA → group code. */
function HotelBlock({ item, bookButtonLabel }: { item: TravelItem; bookButtonLabel: string }) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-normal text-ink">{item.hotel_name}</h3>
      {item.description ? (
        <p className="text-ink-muted font-light leading-relaxed text-lg">{item.description}</p>
      ) : null}
      {item.address ? (
        <p className="text-ink-muted font-light leading-relaxed">{item.address}</p>
      ) : null}
      {item.phone || item.block_name ? (
        <p className="text-ink-muted font-light leading-relaxed">
          {item.phone ? <strong className="font-normal text-ink">{item.phone}</strong> : null}
          {item.phone && item.block_name ? " · " : null}
          {item.block_name ? (
            <strong className="font-normal text-ink">{item.block_name}</strong>
          ) : null}
        </p>
      ) : null}
      {item.booking_url ? (
        <div className="pt-4">
          <ButtonLink href={item.booking_url} className="px-8">
            {item.button_label ?? bookButtonLabel}
          </ButtonLink>
        </div>
      ) : null}
      {item.group_code ? (
        <p className="text-sm text-ink-muted font-light">{item.group_code}</p>
      ) : null}
    </div>
  )
}
