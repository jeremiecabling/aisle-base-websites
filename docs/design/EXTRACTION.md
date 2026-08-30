# Design extraction record

Produced by the Days 2-5 extraction pass (2026-08-30) against live `wedding-website.tsx` @ 55ca684 (1,923 lines, main). This replaces the "live-design report" HANDOFF §3 cites. Sections written by the session lead (nav, hero, countdown, registry, story, footer, gate) follow the same conventions in docs/design/CONVENTIONS.md.

## schedule

**Source:** /home/user/lizbethandjeremie/wedding-website.tsx:1135-1309

**Files:** `components/sections/schedule.tsx`

### Design notes
- Section frame: py-20 bg-white border-t border-stone-100 with max-w-4xl mx-auto px-6 container -> <Section id="schedule"> WITHOUT wide (live container is max-w-4xl, not 6xl, despite section-shell's docstring listing schedule among wide sections; task said follow the live source)
- Header: text-center space-y-8 mb-16, h2 text-3xl md:text-4xl font-serif text-stone-800, w-24 h-px bg-[#F28C52] divider -> SectionHeader (font-body text-ink, bg-accent) with className="mb-16" passed to preserve live's mb-16 over the shell's mb-12 default (cn uses tailwind-merge, so the override is clean)
- Accordion.Root: type="single" collapsible, NO defaultValue -> all days closed on load; items stacked space-y-4
- Accordion.Item: border border-stone-200 bg-white -> border border-ink/10 bg-canvas rounded-tenant (rounded-none->rounded-tenant per conventions; radius 0 in terracotta preset = pixel-identical to live)
- Trigger: flex w-full items-center justify-between px-6 py-4 text-left hover:bg-stone-50 transition-colors group -> hover:bg-canvas-alt; day label text-lg font-serif text-stone-800 -> text-lg font-body text-ink
- Chevron: lucide ChevronDown h-5 w-5 text-stone-600 -> text-ink-muted, transition-transform duration-200 group-data-[state=open]:rotate-180
- Content: px-6 pb-6 pt-2; live's data-[state=open]:animate-accordion-down / animate-accordion-up utilities -> the repo's .accordion-content class (globals.css height keyframes, 0.3s ease-out, data-state driven)
- Event row: flex gap-4; time column text-stone-600 font-light w-24 flex-shrink-0 -> text-ink-muted; body column flex-1 space-y-2
- Title row: flex items-center gap-2; title font-serif text-stone-800 -> font-body text-ink; tag pill px-2 py-1 text-xs bg-stone-100 text-stone-600 rounded-full -> bg-ink/5 text-ink-muted rounded-full (ink-tint reads correctly on either canvas)
- detail / address / note lines all text-sm text-stone-500 font-light -> text-sm text-ink-muted font-light; address with maps_url renders as block <a> target=_blank rel=noopener noreferrer with hover:text-stone-700 -> hover:text-ink transition-colors; address without maps_url renders as plain <p>
- Day event stack: space-y-6 between rows (Saturday's spacing, the canonical rich day)
- Client component ("use client") — Radix accordion interaction requires it; external imports first then @/ imports, matching nav.tsx precedent

### Deviations from live
- No wide prop: section-shell.tsx's comment says wide (max-w-6xl) is for schedule/travel/things-to-do, but the live schedule source uses max-w-4xl — followed the live source per task instruction; flagging the docstring/live mismatch for the parent to reconcile
- Unified the two live row variants: Friday rows used mt-1 (4px) on secondary lines and a space-y-4 day stack; Saturday used an inner space-y-2 (8px) stack and space-y-6 day stack. Adopted Saturday's fuller pattern for all rows (it is the one that carries tag pills), so Friday-style simple rows gain 4px of secondary-line spacing vs live
- Dropped live's outer <div className="space-y-6"> around Accordion.Root — it wrapped a single child, so the utility was a no-op; renders identically
- Added overflow-hidden to Accordion.Item and Accordion.Content: invisible at terracotta's radius 0 (live-identical), but clips the trigger hover fill to rounded corners in nonzero-radius presets and clips row content during the height animation (live omitted it and content could paint outside the collapsing box)
- Days with zero events are filtered out (and all-empty -> null) instead of rendering an accordion item that opens to nothing — per the no-empty-wrappers convention; live had no empty-day case
- maps_url without address renders nothing (there is no visible text to link); live always paired them
- Event rows keyed by index (time+title could legitimately repeat, e.g. two shuttle rows), matching story.tsx's index-key precedent

## FAQSection

**Source:** /home/user/lizbethandjeremie/wedding-website.tsx:1311-1469 (DressCodeImage :112-133 noted, excluded)

**Files:** `components/sections/faq.tsx`

### Design notes
- Section shell: live py-20 bg-white border-t border-stone-100 max-w-4xl px-6 -> <Section id="faqs"> (bg-canvas, border-ink/5, max-w-4xl)
- Header: live is title + divider only (no subtitle), centered space-y-8 with mb-16 (NOT the shell's default mb-12) -> SectionHeader className="mb-16" (cn uses twMerge so the override wins); h2 text-3xl md:text-4xl font-serif text-stone-800 -> font-body text-ink; divider w-24 h-px bg-[#F28C52] -> bg-accent via the shell
- Accordion: Radix Root type="single" collapsible with space-y-4 between items, exactly as live
- Item: live border border-stone-200 bg-white, square corners -> border-ink/10 bg-canvas rounded-tenant (radius token; 0 in the terracotta preset = live square look); no shadow on FAQ items in live (unlike cards), preserved
- Trigger row: flex w-full items-center justify-between px-6 py-4 text-left, hover:bg-stone-50 -> hover:bg-canvas-alt, transition-colors, group; question text-lg font-serif text-stone-800 -> text-lg font-body text-ink
- Chevron: lucide ChevronDown h-5 w-5 text-stone-600 -> text-ink-muted, transition-transform duration-200 group-data-[state=open]:rotate-180 (180deg flip on open), unchanged
- Content motion: live data-[state=open]:animate-accordion-down / closed:animate-accordion-up (0.3s ease-out height keyframes) -> repo's .accordion-content class in app/globals.css (same keyframes, data-state driven); padding px-6 pb-6 pt-2 kept on the Content element as in live
- Answer block stack: live wraps multi-block answers in space-y-3 (indoor/outdoor, transportation) or space-y-4 (dress code) -> normalized to space-y-3, the majority rhythm
- Paragraph block: text-stone-600 font-light -> text-ink-muted font-light
- Labeled sub-section (live dress-code pattern): sub-label p font-serif text-stone-800 mb-1 -> font-body text-ink mb-1, body paragraph text-stone-600 font-light -> text-ink-muted font-light; encoded as a "## " first line
- Bullet list (live indoor/outdoor pattern): ul space-y-2 text-stone-600 font-light -> text-ink-muted; li flex gap-2 with a literal bullet glyph span + text span, glyph aria-hidden; encoded as all-"- " lines
- Callout box (live shuttle-route pattern): live bg-stone-50 border border-stone-200 px-4 py-3 text-sm text-stone-700 font-light -> bg-accent/10 border-ink/10 rounded-tenant px-4 py-3 text-sm text-ink font-light; encoded as a case-insensitive "note:" prefix, prefix stripped
- Answer encoding is implemented exactly as specified (split \n\n -> bullets / ## sub-section / note: callout / paragraph) and documented in the component docstring
- Empty items array returns null; "use client" because Radix accordion holds open/close state; imports/exports match the registry exemplar (import type from @/lib/config-schema, named export, no default)

### Deviations from live
- Images in FAQ answers dropped per task scope: live dress-code answer renders 4 DressCodeImage illustrations (next/image with error fallback, :112-133, :1336-1364); v1 FAQ is text-pattern-only, so the labeled sub-section pattern carries that answer without images
- Live hardcoded English via t(lang, ...) i18n table -> heading and all Q/A arrive as props (chrome faq_heading + FaqItem[]), zero hardcoded copy
- Callout box background changed from live bg-stone-50 to accent-tinted bg-accent/10, as the task's binding convention directs (live stone-50 would be bg-canvas-alt); its text-stone-700 mapped to text-ink (conventions table has no stone-700 row; ink is the closer dark)
- Live's italic small-print pattern (text-sm text-stone-500 italic, e.g. weather-layer and shuttle-timing lines) has no block type in the v1 encoding; that content flows as plain paragraphs or a note: callout
- Block stack spacing normalized to space-y-3 (live mixes space-y-3 and space-y-4 per question)
- Header space-y-8 mb-16 reproduced by passing className="mb-16" to SectionHeader (shell default is mb-12); FAQ is the live section that used mb-16
- Added rounded-tenant + overflow-hidden to Accordion.Item and overflow-hidden to Content (live had square corners and relied on tailwindcss-animate): rounded-none -> rounded-tenant per conventions table, overflow-hidden clips the hover bg to the themed radius and the height animation cleanly
- Added shrink-0 to the chevron and aria-hidden to the chevron and bullet glyphs (not in live): prevents icon squeeze on long questions and keeps decoration out of the a11y tree, matching the shell's aria-hidden divider habit
- Blocks are trimmed and empty blocks filtered after the \n\n split (defensive against stray blank lines from sheet input); Radix item value/React key is the question string, mirroring the registry exemplar keying on title

## gallery

**Source:** /home/user/custom_wedding_website/components/gallery/layouts/{GridGallery,MasonryGallery,EditorialGallery,FilmstripGallery}.tsx:1-22; app/gallery/page.tsx:1-19; components/pages/GalleryPage.tsx:15-35 (layout dispatch)

**Files:** `components/sections/gallery/index.tsx`, `components/sections/gallery/grid.tsx`, `components/sections/gallery/masonry.tsx`, `components/sections/gallery/editorial.tsx`, `components/sections/gallery/filmstrip.tsx`

### Design notes
- Section rhythm: GallerySection composes Section id="gallery" wide (py-20, border-t border-ink/5, max-w-6xl px-6) + SectionHeader (text-3xl md:text-4xl font-body title, w-24 h-px bg-accent divider, mb-12) — the live centered-header pattern.
- Token mapping: legacy text-stone-600/700 captions -> text-ink-muted font-light text-sm; legacy 'rounded border' figures -> rounded-tenant border border-ink/10 bg-canvas shadow-sm (the Card primitive's surface language); zero stone-*/hex literals.
- Alt resolution (Q12) happens once in GallerySection: alt = alt_text ?? caption ?? `Photo ${n}` (1-indexed); layouts receive ResolvedGalleryImage = { src, alt, caption? } and never invent text.
- Grid: grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4, h-64 w-full object-cover crops keep rows level; caption strip px-4 py-3.
- Masonry: columns-1 sm:columns-2 lg:columns-3 gap-4, break-inside-avoid figures with mb-4, images at natural aspect ratio (w-full, no fixed height) so the stagger is real.
- Editorial: space-y-12 stack of md:grid-cols-2 md:items-center rows, alternation via i % 2 -> md:order-2/md:order-1; image h-80 object-cover rounded-tenant shadow-sm; caption column = w-12 h-px bg-accent kicker divider + text-lg font-light leading-relaxed text-ink-muted (caption is the only visible text).
- Filmstrip: flex gap-4 overflow-x-auto snap-x snap-mandatory with snap-start w-72 shrink-0 frames, tall h-96 object-cover crops, -mx-6/px-6/scroll-pl-6 so the strip bleeds into the section gutter and snaps aligned to it, pb-4 clearance for the scrollbar.
- Motion: none added — static shadow-sm surfaces, loading="lazy" images; all five files are server components (scroll-snap is pure CSS), matching the live site's calm rhythm.
- Empty-state: GallerySection and every layout return null on images.length === 0; captions render nothing when absent (no empty figcaption wrappers).
- Dispatch mirrors the legacy GalleryPage ternary chain (masonry/editorial/filmstrip, grid as the fallthrough) but on the typed Gallery["layout"] enum; caps/entitlement enforcement intentionally absent — schema superRefine + Apps Script own it.

### Deviations from live
- Fixed the legacy EditorialGallery bug: image.alt was rendered as a visible <h3> heading; now alt lives only on the img attribute and caption is the sole visible text. A caption-less editorial image renders full-width (max-h-[28rem] object-cover, matching story.tsx) instead of an empty text column, since conventions forbid empty wrappers.
- Replaced next/image fill with plain <img loading="lazy"> + eslint-disable-next-line @next/next/no-img-element noting 'tenant-supplied URL (Q13)' — hard rule for tenant URLs.
- Masonry: dropped the legacy fixed h-80 (it produced uniform bricks, defeating masonry) for natural image heights, and swapped space-y-4 for per-figure mb-4 because space-y margins break across CSS columns.
- Filmstrip: upgraded bare snap-x to snap-x snap-mandatory with scroll-pl-6 and a -mx-6/px-6 gutter bleed so frames snap flush with the section padding; pb-2 -> pb-4.
- Moved dispatch from the legacy standalone /gallery page (which also downgraded premium layouts to grid) into a one-page GallerySection; the downgrade logic was deliberately not reproduced — schema rejects non-grid without gallery_premium upstream.
- Used Section wide (max-w-6xl) although CONVENTIONS.md lists wide only for schedule/travel/things-to-do — it matches the legacy gallery page's max-w-6xl and gives the 3-col grid and filmstrip needed room.
- Keys are array index (key={i}, story.tsx precedent) instead of legacy key={image.src}, since tenants may repeat an image URL.
- ResolvedGalleryImage is defined/exported in index.tsx per spec; layout files import it type-only from '@/components/sections/gallery' — a type-only cycle that erases at compile (no runtime cycle).
- eslint-disable comments use JSX block-comment form ({/* ... */}) where <img> is a direct JSX child; story.tsx's // form only parses inside expression parentheses.

## Travel + Things to Do

**Source:** /home/user/lizbethandjeremie/wedding-website.tsx:1471-1592 (TravelSection 1471-1510, ThingsToDoSection 1517-1592)

**Files:** `components/sections/travel.tsx`, `components/sections/things-to-do.tsx`

### Design notes
- Travel: live section is py-20 bg-white border-t border-stone-100, max-w-4xl px-6 -> <Section id="travel"> (bg-canvas, default width); header h2 text-3xl md:text-4xl font-serif text-stone-800 + w-24 h-px bg-[#F28C52] divider -> SectionHeader (font-body text-ink, bg-accent divider)
- Travel: live header-to-content gap is space-y-8 (2rem), not SectionHeader's default mb-12 -> passed className="mb-8" (cn uses tailwind-merge, so it overrides)
- Travel: content block is max-w-2xl mx-auto text-center with space-y-6 internal rhythm, exactly as live line 1479
- Travel: lead/description paragraph keeps live's text-lg text-stone-600 font-light leading-relaxed -> text-lg text-ink-muted font-light leading-relaxed; second-tier lines (address, phone/block) drop text-lg like live's call paragraph (1487)
- Travel: emphasis treatment for hotel name / phone / block name copies live's <strong className="font-normal text-stone-800"> inside light muted copy -> font-normal text-ink; hotel_name rendered as h3 with the same text-lg font-normal text-ink treatment (Tailwind preflight makes h3 inherit, so classes are exact)
- Travel: booking CTA sits in a pt-4 wrapper (live 1493); live anchor was px-8 py-3 bg-stone-800 text-white hover:bg-stone-700 font-light tracking-wide -> ButtonLink (bg-button, hover:opacity-90, rounded-tenant, target=_blank rel=noopener noreferrer built in) with className="px-8" to keep live's wider padding (tailwind-merge overrides ButtonLink's px-4)
- Travel: group code renders under the button as the live text-sm font-light faint line (1504); per-item CTA label = item.button_label ?? bookButtonLabel; CTA renders only when booking_url present; server component (no interaction)
- ThingsToDo: live section is py-20 bg-stone-50 -> <Section id="things-to-do" alt>; live container is max-w-2xl (narrower than the shell's max-w-4xl), reproduced via max-w-2xl mx-auto on Accordion.Root; live header margin mb-16 -> SectionHeader className="mb-16" (same as faq/schedule)
- ThingsToDo: live mechanism is Radix Accordion.Root type="single" collapsible with space-y-4 items -> reproduced identically as a client component; item chrome border-stone-200 bg-white -> border-ink/10 bg-canvas rounded-tenant overflow-hidden (rounded-tenant is 0 in the terracotta preset, matching live's square corners)
- ThingsToDo: trigger = flex w-full items-center justify-between px-6 py-4 text-left, hover:bg-stone-50 -> hover:bg-canvas-alt, label text-lg font-serif text-stone-800 -> text-lg font-body text-ink, ChevronDown h-5 w-5 text-stone-600 -> text-ink-muted with 200ms group-data-[state=open]:rotate-180; content px-6 pb-6 pt-2 with the platform .accordion-content class (globals.css data-state height keyframes = live's animate-accordion-down/up, 0.3s ease-out)
- ThingsToDo: recommendation row = flex flex-col gap-1 py-4, sm:flex-row sm:items-baseline sm:justify-between sm:gap-4; name text-lg font-serif text-stone-800 -> text-lg font-body text-ink; blurb text-sm font-light tracking-wide text-stone-500 sm:text-right -> text-ink-muted; live's border-b border-stone-200 on all-but-last rows -> divide-y divide-ink/10 on the wrapper (visually identical separators)
- ThingsToDo: grouping preserves first-appearance category order via an insertion-ordered accumulator (Map + parallel array); category string is both the accordion value and the visible trigger label; empty items array returns null (both components)

### Deviations from live
- Travel is generalized from one hardcoded hotel to items[]: live wove hotel_name/dates into translated sentences (t() strings 1480-1491); connective copy now lives in the couple-authored description field, and hotel_name/phone/block_name render as standalone emphasized elements in the same visual stack
- Travel: phone and block_name share one paragraph (matching live's single call sentence) joined by a " · " separator glyph when both are present — live joined them with translated words ("and ask for") which would be hardcoded English; the middot is punctuation, not copy
- Travel: multiple hotels stack with space-y-12 between blocks — live had exactly one hotel so no inter-hotel gap exists to copy; space-y-6 inside each block is live-exact
- Travel: live's small code line was text-stone-400 (fainter than the stone-500/600 muted tier); conventions map all muted text to text-ink-muted, so it renders one shade darker than live — text-sm font-light keeps the visual hierarchy
- Travel: ButtonLink brings tracking-wider and rounded-tenant vs live's tracking-wide/square — sanctioned by CONVENTIONS.md (stone-800 button -> <Button>/<ButtonLink>), same trade the Registry exemplar makes
- ThingsToDo: live's one-off header variant (uppercase tracking-[0.25em] eyebrow, italic serif h2, w-12 divider, space-y-4) is normalized to the platform SectionHeader (no italic, w-24 divider, space-y-8) — SectionHeader composition is binding per CONVENTIONS.md, the component's { heading, items } signature has no eyebrow prop, and no chrome key exists for it; only the mb-16 header margin was carried over verbatim
- ThingsToDo: spot names gain an outbound link when url is present (task requirement; live had no links) — link affordance is hover:text-ink-muted transition-colors, mirroring the schedule section's inverse maps-link treatment rather than inventing underline styling
- ThingsToDo: per-row conditional border-b (idx < length-1 ternary in live) replaced with divide-y on the list wrapper — renders identically and avoids index arithmetic under noUncheckedIndexedAccess

## demo tenant fixtures + placeholder art

**Source:** /home/user/lizbethandjeremie/wedding-website.tsx:207-531,1135-1592

**Files:** `fixtures/tenants/ana-and-ben.json`, `fixtures/tenants/demo-gated.json`, `public/demo/README.md`, `public/demo/hero.svg`, `public/demo/story-1.svg`, `public/demo/story-2.svg`, `public/demo/gallery-01.svg`, `public/demo/gallery-02.svg`, `public/demo/gallery-03.svg`, `public/demo/gallery-04.svg`, `public/demo/gallery-05.svg`, `public/demo/gallery-06.svg`, `public/demo/gallery-07.svg`, `public/demo/gallery-08.svg`, `public/demo/gallery-09.svg`, `public/demo/gallery-10.svg`, `public/demo/gallery-11.svg`, `public/demo/gallery-12.svg`, `public/demo/gallery-13.svg`, `public/demo/gallery-14.svg`

### Design notes
- Theme is the HANDOFF §7.2 terracotta row verbatim: preset terracotta, accent #F28C52, Great Vibes display / Cormorant Garamond body, bg #ffffff, bg_alt #fafaf9, text #292524, text_muted #57534e, button_bg #292524, radius 0 — this IS the live design's palette, so the demo screenshots reproduce it exactly.
- Schedule mirrors the live structure (live :1135-1309): Friday welcome evening (3 rows: drinks with address+maps link, dinner, wind-down with note) and Saturday wedding day (7 rows) with rounded-full tag pills exercised as Shuttle/Ceremony/Cocktails/Reception, per-event detail lines, one address+maps_url row, and shuttle-return notes matching the live 'return shuttles begin promptly' pattern.
- Travel exercises both card shapes from the live block (:1471-1510): The Aveline Hotel carries the full block_name + group_code (ANABEN612) + booking_url + button_label combo like the live Sonesta group-code flow; Mission Rose Inn is the simple name/description/address/phone variant.
- FAQ answers exercise every encoding the faq.tsx renderer supports (verified against faq.tsx:67-100): dress-code uses two '## ' labeled sub-sections (Welcome Evening / Ceremony & Reception, echoing the live two-part dress answer) plus a 'note:' accent callout; indoor/outdoor uses a plain paragraph + all-'- ' bullet block (mirroring live :1408-1425); transportation uses a 'note:' callout carrying the shuttle route arrow string like the live bg-stone-50 route box (:1458-1460); three plain-paragraph answers round out the six.
- Registry matches the live two-fund pattern (Honeymoon Fund / First Home Fund, live :346-353) with registry_intro in basics per the schema comment, 'Contribute' button labels, and plausible fabricated fund URLs (zola.com/registry/anaandben, honeyfund.com/wedding/ana-and-ben).
- Story is 4 original blocks of live-equivalent richness (meet-cute, first-date coast drive, proposal with recruited-friend-behind-a-hedge beat echoing the live proposal structure, closing 'can't wait to celebrate' beat); exactly one block has a heading ('The proposal') and blocks 1/3 carry /demo/story-1.svg and /demo/story-2.svg.
- Gallery is 14 images on the premium 'editorial' layout (cap 40 with gallery_premium: true); 11 have captions, 5 have alt_text, image 09 has alt-only, images 05/12 have neither — deliberately exercising the alt_text ?? caption ?? 'Photo N' fallback chain (CONVENTIONS Q12).
- demo-gated exercises the base tier + gate: enabled gate with password 'preview' (password_gate entitlement true so the superRefine passes), no things_to_do key at all (entitlement false — key omitted, not empty, per the schema's omission convention), grid-only 3-image gallery under the 12 cap, no hero_image_url (text-only hero fallback), and minimal basics.
- Placeholder SVGs stay in the terracotta preset's tonal family: five cream/stone/terracotta gradient washes (#fbf6f0→#eed3bd through #f3e7da→#ccc0b3) cycled with alternating vertical/diagonal direction, a 2px #f28c52 accent rule (the live h-px divider motif), a small letter-spaced Georgia/serif 'Demo photo NN' label in the theme's text_muted #57534e, and occasional low-opacity accent/stone discs for editorial variety.
- SVG sizes as specified: hero 1600x1000, story 1200x800, gallery cycling 800x1000 / 1000x800 / 900x900 portrait-landscape-square; every file 563-644 bytes (<2KB), viewBox + width/height + role=img/aria-label set, zero external refs.
- Contact ('Ana', '(805) 555-0134') is echoed inside the RSVP-deadline FAQ answer so the guest-facing contact line and the couple content stay consistent.
- Both fixtures verified programmatically against every schema constraint the zod file encodes (slug regex, hex regexes, font whitelist, YYYY-MM-DD date, https-only urls, https-or-relative image urls, all three superRefines, gallery caps/layout-vs-entitlement) plus all task shape counts — all pass.

### Deviations from live
- Hotel booking_url uses https://www.example.com/aveline/groups/anaben612 rather than a realistic fabricated hotel domain: The Aveline Hotel is fictional, and a plausible-looking domain (avelinehotel.com) could resolve to a real third party; example.com is guaranteed inert and the URL is hidden behind the button in screenshots. Registry URLs follow the task's explicit zola/honeyfund pattern instead.
- Things to Do names real, public Santa Barbara places (La Super-Rica, Loquita, Butterfly Beach, Funk Zone, Los Olivos) — original blurbs, none copied from L&J's South Bay list; recommending real public businesses reads more credible on the Etsy demo than fictional ones, and the urls point at stable maps.google.com queries rather than business sites that can rot.
- The 'note:' callout appears in two FAQ answers (dress-code shoes + shuttle route) — the task required at least one; the second replaces the live design's bg-stone-50 shuttle-route box (:1458-1460), which the v2 renderer expresses as the accent callout.
- Saturday's shuttle-return row is at 11:00 PM (not the live 12:00 AM) so the demo day stays internally consistent with the 10:30 PM sparkler send-off and the two-departure note.
- demo-gated's second couple is 'Mia & Theo' (Ojai) rather than reusing Ana & Ben — two visibly different demo tenants better showcase the multi-tenant pitch and keep the gated fixture from looking like a duplicate; task did not specify its couple.
- gate_video_url is omitted from both fixtures (schema requires https:// and no Blob asset exists yet); public/demo/README.md documents that the operator uploads the clip to Vercel Blob and pastes the URL before Etsy screenshots (Q14).
- The SVG generator script lives only in the session scratchpad, not the repo — per the task, the committed artifacts are the .svg files themselves.
- Did not run pnpm check:fixtures/tsc per instructions; instead validated both JSONs with an inline Python re-implementation of every zod constraint and superRefine, which passed clean.
