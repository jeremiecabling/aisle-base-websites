import type { TenantContent } from "@/lib/config-schema"

/**
 * Guest-facing chrome strings (addendum Q17).
 *
 * Everything a guest reads that is not the couple's own content lives here,
 * keyed, with English defaults. The ADMIN sheet's `Defaults` tab can override
 * any key per deployment, and overrides arrive in config.content.chrome — so
 * a fully-Spanish site needs zero code changes.
 *
 * Add new keys here FIRST, then consume via chrome(config.content, "key").
 */
export const CHROME_DEFAULTS = {
  nav_schedule: "Schedule",
  nav_travel: "Travel",
  nav_things_to_do: "Things to Do",
  nav_faq: "FAQs",
  nav_registry: "Registry",
  nav_story: "Our Story",
  nav_gallery: "Gallery",
  nav_rsvp: "RSVP",
  nav_menu_open: "Open menu",
  nav_menu_close: "Close menu",

  countdown_days: "days to go",
  countdown_today: "Today's the day!",

  schedule_heading: "Schedule of Events",
  travel_heading: "Travel & Stay",
  travel_book_button: "Book a Room",
  things_to_do_heading: "Things to Do",
  faq_heading: "FAQs",
  registry_heading: "Registry",
  story_heading: "Our Story",
  gallery_heading: "Gallery",

  gate_prompt: "Please enter the password to view our wedding website",
  gate_placeholder: "Enter password",
  gate_submit: "Enter",
  gate_error: "That password isn't right — try again.",

  expired_heading: "This site is taking a break",
  expired_body: "This wedding website is no longer active.",
  paused_heading: "Be right back",
  paused_body: "This wedding website is temporarily paused.",
  locked_contact_prefix: "Questions? Reach out to",
} as const

export type ChromeKey = keyof typeof CHROME_DEFAULTS

/** Resolve a chrome string: tenant override → default. */
export function chrome(content: Pick<TenantContent, "chrome">, key: ChromeKey): string {
  return content.chrome[key] ?? CHROME_DEFAULTS[key]
}
