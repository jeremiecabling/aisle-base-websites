import { z } from "zod"

/**
 * The tenant-config contract.
 *
 * This is THE shape the platform Apps Script's `doGet?action=config` emits
 * and the shape every fixture tenant JSON must satisfy. Both sides validate
 * against this schema so drift fails loudly at build/request time instead of
 * rendering an empty site (HANDOFF §5 bugs 1/2/5 — never resurrect).
 *
 * Conventions:
 * - Keys of disabled modules are OMITTED entirely (not empty) by the script;
 *   the schema models that with `.optional()`.
 * - `gate` is consumed server-side only and must never be forwarded to the
 *   browser (see lib/config.ts `toPublicConfig`).
 * - All strings arrive trimmed; blank-string = absent is the script's job,
 *   but we normalize empty strings to undefined defensively for optionals.
 */

const optionalTrimmed = z
  .string()
  .transform((s) => s.trim())
  .transform((s) => (s === "" ? undefined : s))
  .optional()

const requiredTrimmed = z
  .string()
  .transform((s) => s.trim())
  .refine((s) => s.length > 0, "required string is empty")

const httpsUrl = z
  .string()
  .trim()
  .refine((s) => s.startsWith("https://"), "must be an https:// URL")

const optionalHttpsUrl = z
  .string()
  .transform((s) => s.trim())
  .transform((s) => (s === "" ? undefined : s))
  .refine((s) => s === undefined || s.startsWith("https://"), "must be an https:// URL")
  .optional()

/** Image URLs may be https or a site-relative path (fixture/demo assets). */
const imageUrl = z
  .string()
  .trim()
  .refine(
    (s) => s.startsWith("https://") || s.startsWith("/"),
    "must be an https:// URL or a site-relative /path",
  )

const optionalImageUrl = z
  .string()
  .transform((s) => s.trim())
  .transform((s) => (s === "" ? undefined : s))
  .refine(
    (s) => s === undefined || s.startsWith("https://") || s.startsWith("/"),
    "must be an https:// URL or a site-relative /path",
  )
  .optional()

export const tenantStatusSchema = z.enum(["active", "paused", "expired", "staging"])

export const entitlementsSchema = z.object({
  rsvp: z.boolean(),
  gallery_premium: z.boolean(),
  password_gate: z.boolean(),
  things_to_do: z.boolean(),
})

/** Server-side only. Never serialize into anything a browser receives. */
export const gateSchema = z.object({
  enabled: z.boolean(),
  password: z.string(),
  password_version: z.number().int().nonnegative(),
})

export const contactSchema = z.object({
  // The COUPLE's preferred human contact for guest-facing banners — not the
  // operator (addendum Q23a). May be blank (script emits a warning; screens
  // that would show it omit the line) — a missing phone number must not take
  // a site down.
  name: z.string().transform((s) => s.trim()),
  phone: z.string().transform((s) => s.trim()),
})

// Fonts must come from the self-hosted OFL whitelist (lib/fonts.ts mirrors
// this list — keep the two in sync; fonts.ts asserts it at module load).
export const FONT_WHITELIST = [
  "Great Vibes",
  "Allura",
  "Pinyon Script",
  "Cormorant Garamond",
] as const

export const themeSchema = z.object({
  preset: requiredTrimmed,
  accent_hex: z.string().regex(/^#[0-9a-fA-F]{6}$/, "accent_hex must be #rrggbb"),
  font_display: z.enum(FONT_WHITELIST),
  font_body: z.enum(FONT_WHITELIST),
  bg: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  bg_alt: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  text: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  text_muted: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  button_bg: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  radius: z.number().nonnegative(),
})

export const basicsSchema = z.object({
  couple_names: requiredTrimmed,
  monogram: optionalTrimmed,
  wedding_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "wedding_date must be YYYY-MM-DD"),
  wedding_date_display: requiredTrimmed,
  // IANA timezone for countdown math (addendum Q11). Operator-filled.
  timezone: requiredTrimmed,
  hero_tagline: optionalTrimmed,
  venue_line_1: optionalTrimmed,
  venue_line_2: optionalTrimmed,
  hero_image_url: optionalImageUrl,
  gate_video_url: optionalHttpsUrl,
  countdown_caption: optionalTrimmed,
  footer_note: optionalTrimmed,
  // Live design shows intro copy under the Registry heading; §7.3 gave it no
  // home, so it lives as an optional Basics key (see docs/DECISIONS.md).
  registry_intro: optionalTrimmed,
  // NOTE: no rsvp_deadline_display — the displayed deadline comes from the
  // guest sheet's Settings.rsvp_deadline, single source of truth (Q19).
})

export const scheduleEventSchema = z.object({
  time: requiredTrimmed,
  title: requiredTrimmed,
  tag: optionalTrimmed,
  detail: optionalTrimmed,
  address: optionalTrimmed,
  maps_url: optionalHttpsUrl,
  note: optionalTrimmed,
})

export const scheduleDaySchema = z.object({
  label: requiredTrimmed,
  events: z.array(scheduleEventSchema),
})

export const travelItemSchema = z.object({
  hotel_name: requiredTrimmed,
  description: optionalTrimmed,
  address: optionalTrimmed,
  phone: optionalTrimmed,
  block_name: optionalTrimmed,
  group_code: optionalTrimmed,
  booking_url: optionalHttpsUrl,
  button_label: optionalTrimmed,
})

export const thingToDoSchema = z.object({
  category: requiredTrimmed,
  name: requiredTrimmed,
  blurb: optionalTrimmed,
  url: optionalHttpsUrl,
})

export const faqItemSchema = z.object({
  question: requiredTrimmed,
  // Renderer splits on \n\n into blocks; "- " prefixed lines become bullets.
  answer: requiredTrimmed,
})

export const registryItemSchema = z.object({
  title: requiredTrimmed,
  description: optionalTrimmed,
  url: httpsUrl,
  button_label: optionalTrimmed,
})

export const storyBlockSchema = z.object({
  heading: optionalTrimmed,
  paragraph: requiredTrimmed,
  image_url: optionalImageUrl,
})

export const GALLERY_LAYOUTS = ["grid", "masonry", "editorial", "filmstrip"] as const
export const GALLERY_CAP_BASE = 12
export const GALLERY_CAP_PREMIUM = 40

export const galleryImageSchema = z.object({
  image_url: imageUrl,
  caption: optionalTrimmed,
  alt_text: optionalTrimmed,
})

export const gallerySchema = z.object({
  layout: z.enum(GALLERY_LAYOUTS),
  images: z.array(galleryImageSchema).max(GALLERY_CAP_PREMIUM),
})

/**
 * Guest-facing chrome strings (addendum Q17): every label the couple's guests
 * see that isn't couple content is operator-editable via the ADMIN `Defaults`
 * tab and arrives merged into the config. Code falls back to the defaults in
 * lib/chrome.ts, so a missing key is never a crash — but there is NO i18n
 * system; a fully-Spanish site is achieved through these strings + content.
 */
export const chromeSchema = z.record(z.string(), z.string()).default({})

export const contentSchema = z.object({
  basics: basicsSchema,
  schedule: z.array(scheduleDaySchema),
  travel: z.array(travelItemSchema),
  things_to_do: z.array(thingToDoSchema).optional(),
  faq: z.array(faqItemSchema),
  registry: z.array(registryItemSchema),
  story: z.array(storyBlockSchema),
  gallery: gallerySchema.optional(),
  chrome: chromeSchema,
  // rsvp text/config lands in the RSVP session — deliberately absent from v1.
})

export const tenantConfigSchema = z
  .object({
    ok: z.literal(true),
    site: z
      .string()
      .regex(/^[a-z0-9-]+$/, "slug must be [a-z0-9-]"),
    status: tenantStatusSchema,
    entitlements: entitlementsSchema,
    gate: gateSchema.optional(),
    contact: contactSchema,
    theme: themeSchema,
    content: contentSchema,
    warnings: z.array(z.string()).default([]),
    version: z.string(),
  })
  .superRefine((cfg, ctx) => {
    // Entitlement/payload consistency: a payload that carries a module the
    // tenant is not entitled to is a script bug — fail loudly.
    if (!cfg.entitlements.things_to_do && cfg.content.things_to_do !== undefined) {
      ctx.addIssue({
        code: "custom",
        message: "content.things_to_do present but entitlements.things_to_do is false",
      })
    }
    if (!cfg.entitlements.password_gate && cfg.gate?.enabled) {
      ctx.addIssue({
        code: "custom",
        message: "gate.enabled but entitlements.password_gate is false",
      })
    }
    if (cfg.entitlements.password_gate && cfg.gate?.enabled && !cfg.gate.password) {
      ctx.addIssue({
        code: "custom",
        message: "gate enabled with empty password (fail closed: fix the admin sheet)",
      })
    }
    if (cfg.content.gallery) {
      const cap = cfg.entitlements.gallery_premium ? GALLERY_CAP_PREMIUM : GALLERY_CAP_BASE
      if (cfg.content.gallery.images.length > cap) {
        ctx.addIssue({
          code: "custom",
          message: `gallery has ${cfg.content.gallery.images.length} images, cap is ${cap} (script must truncate)`,
        })
      }
      if (!cfg.entitlements.gallery_premium && cfg.content.gallery.layout !== "grid") {
        ctx.addIssue({
          code: "custom",
          message: "non-grid gallery layout without gallery_premium entitlement",
        })
      }
    }
  })

export type TenantStatus = z.infer<typeof tenantStatusSchema>
export type Entitlements = z.infer<typeof entitlementsSchema>
export type Gate = z.infer<typeof gateSchema>
export type Theme = z.infer<typeof themeSchema>
export type Basics = z.infer<typeof basicsSchema>
export type ScheduleDay = z.infer<typeof scheduleDaySchema>
export type ScheduleEvent = z.infer<typeof scheduleEventSchema>
export type TravelItem = z.infer<typeof travelItemSchema>
export type ThingToDo = z.infer<typeof thingToDoSchema>
export type FaqItem = z.infer<typeof faqItemSchema>
export type RegistryItem = z.infer<typeof registryItemSchema>
export type StoryBlock = z.infer<typeof storyBlockSchema>
export type Gallery = z.infer<typeof gallerySchema>
export type GalleryImage = z.infer<typeof galleryImageSchema>
export type GalleryLayout = (typeof GALLERY_LAYOUTS)[number]
export type TenantContent = z.infer<typeof contentSchema>
export type TenantConfig = z.infer<typeof tenantConfigSchema>

/** TenantConfig minus `gate` — the only shape client components may receive. */
export type PublicTenantConfig = Omit<TenantConfig, "gate">
