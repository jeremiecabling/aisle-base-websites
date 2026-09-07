"use client"

import * as Accordion from "@radix-ui/react-accordion"
import { ChevronDown } from "lucide-react"
import type { ThingToDo } from "@/lib/config-schema"
import { Section, SectionHeader } from "@/components/sections/section-shell"

/**
 * Things to Do: one single-open Radix accordion item per category, each
 * opening to a hairline-divided list of recommendation rows — serif name
 * left, small tracked-out blurb right (live design :1517-1592). Categories
 * come from the flat item list grouped in first-appearance order, so the
 * sheet's row order is the display order. Client component: Radix accordion
 * state.
 */
export function ThingsToDo({ heading, items }: { heading: string; items: ThingToDo[] }) {
  if (items.length === 0) return null
  return (
    <Section id="things-to-do" alt>
      <SectionHeader title={heading} className="mb-16" />
      <Accordion.Root type="single" collapsible className="max-w-2xl mx-auto space-y-4">
        {groupByCategory(items).map((group) => (
          <Accordion.Item
            key={group.category}
            value={group.category}
            className="border border-ink/10 bg-canvas rounded-tenant overflow-hidden"
          >
            <Accordion.Header>
              <Accordion.Trigger className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-canvas-alt transition-colors group">
                <span className="text-lg font-body text-ink">{group.category}</span>
                <ChevronDown
                  className="h-5 w-5 shrink-0 text-ink-muted transition-transform duration-200 group-data-[state=open]:rotate-180"
                  aria-hidden
                />
              </Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Content className="accordion-content overflow-hidden px-6 pb-6 pt-2">
              <div className="divide-y divide-ink/10">
                {group.items.map((item, i) => (
                  <SpotRow key={`${i}-${item.name}`} item={item} />
                ))}
              </div>
            </Accordion.Content>
          </Accordion.Item>
        ))}
      </Accordion.Root>
    </Section>
  )
}

/** One recommendation: serif name (links out when a URL exists) + right-aligned blurb. */
function SpotRow({ item }: { item: ThingToDo }) {
  return (
    <div className="flex flex-col gap-1 py-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
      {item.url ? (
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-lg font-body text-ink hover:text-ink-muted transition-colors"
        >
          {item.name}
        </a>
      ) : (
        <span className="text-lg font-body text-ink">{item.name}</span>
      )}
      {item.blurb ? (
        <span className="text-sm font-light tracking-wide text-ink-muted sm:text-right">
          {item.blurb}
        </span>
      ) : null}
    </div>
  )
}

/** Group flat rows by category, categories ordered by first appearance. */
function groupByCategory(items: ThingToDo[]): { category: string; items: ThingToDo[] }[] {
  const groups: { category: string; items: ThingToDo[] }[] = []
  const byCategory = new Map<string, ThingToDo[]>()
  for (const item of items) {
    const bucket = byCategory.get(item.category)
    if (bucket) {
      bucket.push(item)
    } else {
      const fresh = [item]
      byCategory.set(item.category, fresh)
      groups.push({ category: item.category, items: fresh })
    }
  }
  return groups
}
