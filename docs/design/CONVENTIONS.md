# Section component conventions

Every file in `components/sections/` follows these rules. They encode the
live design (HANDOFF §3) re-expressed through theme tokens.

## Tokens, never literals

| Live literal | v2 token/utility |
|---|---|
| `bg-white` (section bg) | `bg-canvas` (via `<Section>`) |
| `bg-stone-50` (alt section bg) | `bg-canvas-alt` (via `<Section alt>`) |
| `text-stone-800` (headings) | `text-ink` |
| `text-stone-600` / `text-stone-500` (body/muted) | `text-ink-muted` |
| `bg-[#F28C52]` (accent divider) | `bg-accent` |
| `border-stone-100` / `border-stone-200` | `border-ink/5` (hairlines), `border-ink/10` (cards) |
| `bg-stone-800 hover:bg-stone-700` (buttons) | `<Button>` (`bg-button hover:opacity-90`) |
| `rounded-none` | `rounded-tenant` (theme radius; 0 in terracotta preset) |
| `font-serif` (Cormorant) | `font-body` |
| `fontFamily: 'SymphonyPro-Regular'` (script) | `font-display` |

Exception: text rendered OVER photos/video (hero, gate, nav-over-hero) keeps
its white/overlay literals (`text-white`, `bg-black/20`, `bg-white/60`) — that
styling is media-contrast, not theme.

## Structure

- Compose `<Section id=… alt?>` + `<SectionHeader title subtitle?>` from
  `components/sections/section-shell.tsx`. Section `id`s are the nav anchor
  contract: `schedule`, `travel`, `things-to-do`, `faqs`, `registry`,
  `our-story`, `gallery`, (`rsvp` reserved for the RSVP session).
- Props-only: a section receives typed data from `lib/config-schema.ts` (and
  pre-resolved chrome strings) — it never fetches, never reads env, never
  imports `lib/config.ts`, and never receives the full config (the `gate`
  object must stay server-side).
- Server components by default; `"use client"` only where interaction demands
  it (accordions, countdown, nav scroll state).
- Optional fields render nothing when absent — no placeholder text, no empty
  wrappers. A section with an empty items array returns `null`.
- Preserve the live spacing/typography rhythm exactly: `py-20` sections,
  `space-y-8` header stacks, `font-light` body, `tracking-wide` labels,
  accent `h-px` dividers, `shadow-sm` cards, `rounded-full` pills.

## Media (addendum Q13)

Couple-supplied images render as `<img loading="lazy">` (hero uses
CSS object-cover on an absolutely-positioned `<img>`); never `next/image`
for tenant URLs. Alt text: `alt_text ?? caption ?? "Photo N"` (Q12).

## Copy

All guest-visible strings come from config content or chrome keys
(`lib/chrome.ts`) — zero hardcoded English in section components.
