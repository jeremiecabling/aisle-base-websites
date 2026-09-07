import type React from "react"
import { cn } from "@/lib/cn"

/**
 * The live design's section rhythm (HANDOFF §3): every section py-20,
 * alternating canvas/canvas-alt backgrounds with a hairline top border,
 * and the centered header pattern: serif h2 → accent divider → light
 * sub-copy. Every section component composes these two.
 */

export function Section({
  id,
  alt = false,
  wide = false,
  className,
  children,
}: {
  id?: string
  /** stone-50-style alternate background */
  alt?: boolean
  /** max-w-6xl instead of max-w-4xl (schedule/travel/things-to-do) */
  wide?: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <section
      id={id}
      className={cn("py-20 border-t border-ink/5", alt ? "bg-canvas-alt" : "bg-canvas", className)}
    >
      <div className={cn("mx-auto px-6", wide ? "max-w-6xl" : "max-w-4xl")}>{children}</div>
    </section>
  )
}

export function SectionHeader({
  title,
  subtitle,
  className,
}: {
  title: string
  subtitle?: string
  className?: string
}) {
  return (
    <div className={cn("text-center space-y-8 mb-12", className)}>
      <h2 className="text-3xl md:text-4xl font-body text-ink">{title}</h2>
      <div className="w-24 h-px bg-accent mx-auto" aria-hidden />
      {subtitle ? (
        <p className="text-ink-muted font-light max-w-2xl mx-auto leading-relaxed">{subtitle}</p>
      ) : null}
    </div>
  )
}
