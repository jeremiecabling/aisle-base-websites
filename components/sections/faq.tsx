"use client"

import * as Accordion from "@radix-ui/react-accordion"
import { ChevronDown } from "lucide-react"
import type { FaqItem } from "@/lib/config-schema"
import { Section, SectionHeader } from "@/components/sections/section-shell"

/**
 * FAQs: single-open accordion, one bordered item per question (live design
 * :1311-1469). Client component: Radix accordion state.
 *
 * Answer encoding (binding convention; faqItemSchema notes the short form):
 * `answer` splits on "\n\n" into blocks, each rendered by shape —
 * - every line prefixed "- "        → bullet list (prefix stripped);
 * - first line prefixed "## "      → labeled sub-section: serif ink
 *   sub-label, remaining lines as one paragraph beneath it;
 * - prefixed "note:" (any case)    → accent-tinted callout box (prefix
 *   stripped);
 * - anything else                  → plain paragraph.
 * The live dress-code answer also embedded illustration images — images in
 * FAQ answers are out of v1 scope (Q13); answers are text patterns only.
 */
export function Faq({ heading, items }: { heading: string; items: FaqItem[] }) {
  if (items.length === 0) return null
  return (
    <Section id="faqs">
      <SectionHeader title={heading} className="mb-16" />
      <Accordion.Root type="single" collapsible className="space-y-4">
        {items.map((item) => (
          <Accordion.Item
            key={item.question}
            value={item.question}
            className="border border-ink/10 bg-canvas rounded-tenant overflow-hidden"
          >
            <Accordion.Header>
              <Accordion.Trigger className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-canvas-alt transition-colors group">
                <span className="text-lg font-body text-ink">{item.question}</span>
                <ChevronDown
                  className="h-5 w-5 shrink-0 text-ink-muted transition-transform duration-200 group-data-[state=open]:rotate-180"
                  aria-hidden
                />
              </Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Content className="accordion-content overflow-hidden px-6 pb-6 pt-2">
              <div className="space-y-3">
                {splitBlocks(item.answer).map((block, i) => (
                  <AnswerBlock key={i} block={block} />
                ))}
              </div>
            </Accordion.Content>
          </Accordion.Item>
        ))}
      </Accordion.Root>
    </Section>
  )
}

/** answer → trimmed, non-empty "\n\n" blocks (defensive against stray blank lines). */
function splitBlocks(answer: string): string[] {
  return answer
    .split("\n\n")
    .map((block) => block.trim())
    .filter((block) => block.length > 0)
}

/** One answer block, dispatched per the encoding convention above. */
function AnswerBlock({ block }: { block: string }) {
  const lines = block.split("\n")

  if (lines.every((line) => line.startsWith("- "))) {
    return (
      <ul className="space-y-2 text-ink-muted font-light">
        {lines.map((line, i) => (
          <li key={i} className="flex gap-2">
            <span aria-hidden>•</span>
            <span>{line.slice(2)}</span>
          </li>
        ))}
      </ul>
    )
  }

  const [firstLine = "", ...restLines] = lines
  if (firstLine.startsWith("## ")) {
    const body = restLines.join(" ").trim()
    return (
      <div>
        <p className="font-body text-ink mb-1">{firstLine.slice(3)}</p>
        {body ? <p className="text-ink-muted font-light">{body}</p> : null}
      </div>
    )
  }

  if (/^note:/i.test(block)) {
    return (
      <div className="bg-accent/10 border border-ink/10 rounded-tenant px-4 py-3 text-sm text-ink font-light">
        {block.slice("note:".length).trim()}
      </div>
    )
  }

  return <p className="text-ink-muted font-light">{block}</p>
}
