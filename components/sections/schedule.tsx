"use client"

import * as Accordion from "@radix-ui/react-accordion"
import { ChevronDown } from "lucide-react"
import type { ScheduleDay, ScheduleEvent } from "@/lib/config-schema"
import { Section, SectionHeader } from "@/components/sections/section-shell"

/**
 * Schedule: one Radix accordion item per day, each opening to time/title event
 * rows with optional tag pill, detail line, maps-linked address, and note
 * (live design :1135-1309). Days arrive pre-grouped from config — this
 * component never parses dates or sorts events. All days start closed, matching
 * the live accordion (single, collapsible, no defaultValue).
 */
export function Schedule({ heading, days }: { heading: string; days: ScheduleDay[] }) {
  const populated = days.filter((day) => day.events.length > 0)
  if (populated.length === 0) return null
  return (
    <Section id="schedule">
      <SectionHeader title={heading} className="mb-16" />
      <Accordion.Root type="single" collapsible className="space-y-4">
        {populated.map((day, i) => (
          <Accordion.Item
            // Index-composite: sheet content can legitimately repeat labels,
            // and duplicate Radix values would open/close items in lockstep.
            key={`${i}-${day.label}`}
            value={`${i}-${day.label}`}
            className="border border-ink/10 bg-canvas rounded-tenant overflow-hidden"
          >
            <Accordion.Header>
              <Accordion.Trigger className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-canvas-alt transition-colors group">
                <span className="text-lg font-body text-ink">{day.label}</span>
                <ChevronDown className="h-5 w-5 text-ink-muted transition-transform duration-200 group-data-[state=open]:rotate-180" />
              </Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Content className="accordion-content overflow-hidden px-6 pb-6 pt-2">
              <div className="space-y-6">
                {day.events.map((event, i) => (
                  <EventRow key={i} event={event} />
                ))}
              </div>
            </Accordion.Content>
          </Accordion.Item>
        ))}
      </Accordion.Root>
    </Section>
  )
}

/** One event: time column, then title + pill / detail / address / note stack. */
function EventRow({ event }: { event: ScheduleEvent }) {
  return (
    <div className="flex gap-4">
      <span className="text-ink-muted font-light w-24 flex-shrink-0">{event.time}</span>
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <p className="font-body text-ink">{event.title}</p>
          {event.tag ? (
            <span className="px-2 py-1 text-xs bg-ink/5 text-ink-muted rounded-full">
              {event.tag}
            </span>
          ) : null}
        </div>
        {event.detail ? (
          <p className="text-sm text-ink-muted font-light">{event.detail}</p>
        ) : null}
        {event.address ? (
          event.maps_url ? (
            <a
              href={event.maps_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-ink-muted font-light block hover:text-ink transition-colors"
            >
              {event.address}
            </a>
          ) : (
            <p className="text-sm text-ink-muted font-light">{event.address}</p>
          )
        ) : null}
        {event.note ? <p className="text-sm text-ink-muted font-light">{event.note}</p> : null}
      </div>
    </div>
  )
}
