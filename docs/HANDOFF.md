# HANDOFF — Wedding Website Platform: Full Context + v2 Rebuild Spec

**Audience:** a fresh Claude Code session starting from scratch, with no access to this conversation.
**Owner:** Jeremie Cabling (`jeremiecabling` on GitHub).
**Date of this brief:** 2026-08-29 (all repo facts verified against live checkouts on this date).

**The goal:** restart momentum on a "custom wedding websites sold on Etsy" business. The end deliverables of the rebuild are:

1. A **new GitHub repo** — a clean, multi-client wedding-site platform using the polished design from the live site.
2. A **new ADMIN Google Sheet template** — operator-owned, configures per-client entitlements (features each couple paid for). Couples never see it.
3. A **new END-CLIENT Google Sheet template** — couple-owned, holds their photos/text/schedule/etc. Friendly for non-technical people.
4. **Apps Script(s)** that make it all work end to end.

Everything below is (a) the complete map of what exists today, (b) the verified bugs and lessons, and (c) the definitive v2 spec (Section 9) produced by a judged three-way architecture comparison. Trust the `file:line` citations — every load-bearing claim was verified against the code.

---

## 1. Inventory: what exists today

| Asset | Where | State |
|---|---|---|
| **Template/platform repo** | `github.com/jeremiecabling/custom_wedding_website` (private) | Sheet-driven engine with working plumbing, broken content parsing, unstyled scaffold pages. Last functional commit 2026-03-14. |
| **Live wedding site repo** | `github.com/jeremiecabling/lizbethandjeremie` (private) | Jeremie & Lizbeth's own production site (wedding 2026-08-15). Single-file v0.dev app, polished design, hardcoded content. **This is the design source of truth.** |
| **Deployed Apps Scripts** | Google-side only, **not in any repo** | The live site's real RSVP backend + visitor-log backend exist only as deployed scripts. The template repo has *simplified reimplementations* (`scripts/*/Code.gs`) that lack live features (welcome party, dietary restrictions, meal options, party disambiguation, `is_baby`). |
| **Content sheet template** | Google Sheets (xlsx export seen: `Test_Custom_Wedding_Website.xlsx`) | 13 tabs: Site, Theme, Nav, Home, Schedule, Details, Travel, Registry, Story, FAQ, Gallery, PasswordGate, RSVP. **Its content-tab format does not match the parser — see Bug 1.** |
| Other repos on the profile | `lizbethbach`, `bach`, `bach2` (bachelorette sites), `v0-aisle-base-working`, misc Clay/work repos | Not needed for the rebuild. |

Both wedding repos: Next.js 15.5.9, React 19.2.0, Tailwind v4 (CSS-first config, no tailwind.config), shadcn/radix UI, pnpm (template repo *also* has a stray package-lock.json), package.json still named `my-v0-project`, no tests, no LICENSE, `next.config.mjs` sets `ignoreBuildErrors` + `ignoreDuringBuilds` (nothing is type-checked at build), and the template's `eslint.config.mjs` ignores all `.ts/.tsx` files (lint is a no-op).

---

## 2. Repo 1 deep dive — `custom_wedding_website` (the platform attempt)

### Architecture (4 layers)

1. **Couple's Google Sheet** (13 tabs, above).
2. **Content API** (`scripts/content-api/Code.gs`) — Apps Script bound to that sheet, deployed as web app (Execute as Me / Anyone). `doGet` builds one JSON config from all tabs, caches in `CacheService` (TTL from Site key `content.refresh_seconds`, default 120s, max 21600). Optional `?secret=` vs Script Property `SCRIPT_SECRET`. **Gotcha: `jsonResponse` ignores its status-code arg (Code.gs:78-82) — errors/unauthorized return HTTP 200; consumers must branch on the JSON body, not `response.ok`.**
3. **Next.js app** — `lib/siteConfig.ts` fetches `CONTENT_API_URL` (fallback `NEXT_PUBLIC_CONTENT_API_URL`) with ISR `revalidate` = `CONTENT_API_REVALIDATE_SECONDS` (default 60); appends `?secret=` if `CONTENT_API_SECRET` set. On ANY failure it silently returns an all-empty `DEFAULT_SITE_CONFIG` (siteConfig.ts:114-142) — the site renders as an empty shell rather than failing loudly. `lib/contentSelectors.ts` maps JSON → typed props with alias fallback chains (e.g. title: `title|heading|name`). **`readString` only accepts strings — native Sheets numbers/dates are invisible (contentSelectors.ts:54-63).**
4. **Module/entitlement system** — `modules/registry.ts`: `core.home|schedule|details|travel|registry|gallery|story|faq` always on; `addon.password_gate` (route `/password`), `addon.rsvp` (route `/rsvp`), `premium.gallery_layout` (gates masonry/editorial/filmstrip; non-premium silently falls back to grid — `app/gallery/page.tsx:16`). Pages call `assertRouteEnabled` → `notFound()` when off; `lib/navBuilder.ts` filters + sorts nav. Toggles come from the Site tab keys `modules.<id>.enabled`.

### Add-on backends

- **RSVP**: `scripts/rsvp-backend/Code.gs` on a *separate* guest spreadsheet. Tabs: `GuestList` (fixed 0-based columns: `party_id, guest_id, first_name, last_name, email, phone, invite_code, is_child, rsvp_wedding, meal_choice, rsvp_timestamp` — **note `docs/PROVISIONING.md:44` swaps email/phone; the code's COL map wins**), optional `Settings` (`rsvp_locked`, `locked_message`, `rsvp_deadline`), auto-created `RSVPLog`. Actions: `lookup` (name/phone/email/code) and `save_party` (verifies a party token = `SHA-256(party_id+":"+secret)` hex[0:32], secret = Script Property `TOKEN_SECRET` or the script ID). `/api/rsvp/route.ts` is a server proxy using the load-bearing Apps Script pattern: **POST with `Content-Type: text/plain`, `redirect:"manual"`, follow the 302 with a GET** (route.ts:30-64).
- **Password gate**: env-driven (`PASSWORD_GATE_ENABLED === "true"`, `PASSWORD_SHARED_PASSWORD`). `middleware.ts` (matcher `/:path*`) redirects to `/password`; public bypasses: `/password`, `/admin/*`, `/api/*`, `/_next/*`, favicon, **any path with a file extension** (middleware.ts:17 — all of `public/` is never gated). Token: `v1.<expiresAt>.<hmacHex>`, HMAC-SHA-256 via WebCrypto, constant-time compare, cookie `site_auth` httpOnly/lax, TTL `PASSWORD_GATE_TOKEN_TTL_SECONDS` default 30 days. **Signing secret defaults to the guest password itself when `PASSWORD_GATE_SIGNING_SECRET` unset (lib/passwordGateToken.ts:44-45)** — anyone with the password can forge tokens. Login route compares with plain `!==` (not constant-time). Gate is fail-closed (enabled + no password → redirect loop to /password with `x-password-gate-misconfigured` header).
- **`/admin/health` dashboard** (`app/admin/health/page.tsx`) — genuinely useful diagnostics (fetch status, module states, nav counts, misconfig warnings) but **deliberately public** (middleware exempts `/admin`) and leaks the Content API URL + RSVP script URL.

### Env contract (`.env.example`)

`CONTENT_API_URL`, `CONTENT_API_REVALIDATE_SECONDS` (60), `CONTENT_API_SECRET`, `PASSWORD_GATE_ENABLED`, `PASSWORD_SHARED_PASSWORD`, `PASSWORD_GATE_SIGNING_SECRET`, `PASSWORD_GATE_TOKEN_TTL_SECONDS` (2592000), `RSVP_SCRIPT_URL`.

### `docs/PROVISIONING.md` (per-couple runbook, matches code except noted)

Copy sheet → couple fills content tabs, operator sets Site/Theme/Nav → paste + deploy content-api script (Execute as Me / Anyone) → new Vercel project with env vars → optional RSVP sheet + script (URL goes BOTH in the sheet RSVP tab `api_url` AND env `RSVP_SCRIPT_URL`) → optional gate env vars → verify `/admin/health` → handoff ("edits live in ~2 min", 1-2 year term reminder). Known doc bugs: `?action=config` is a no-op (doGet never reads `action`), GuestList column order wrong (above).

### Presentation state (the honest part)

All `components/pages/*.tsx` are 20-35-line unstyled scaffolds (plain `h1` + bordered cards, hardcoded `stone-*` utilities, no design tokens, no theming hook). The four gallery layouts (`Grid/Masonry/Editorial/Filmstrip`) are real but minimal (EditorialGallery renders `image.alt` as a visible heading). **The Theme tab (fonts/colors/preset/hero_style) is fetched but consumed by NOTHING.** The actual design lives in the orphaned 1,448-line `wedding-website.tsx` at repo root (imported by nothing; hardcoded to Lizbeth & Jeremie). `app/layout.tsx:10` hardcodes metadata `"Lizbeth & Jeremie | 08/15/2026"`. Dead code: `components/config-page.tsx`, `components/theme-provider.tsx` (and the `next-themes` + `tailwindcss-animate` deps), `styles/globals.css` (second, conflicting token sheet — only `app/globals.css` is imported), `lib/fonts.ts` (`symphonyPro` localFont, never imported), Geist fonts loaded-but-never-applied in layout (and `--font-geist-*` vars referenced in CSS are never defined; the body's `font-sans` class defeats the intended Cormorant serif).

---

## 3. Repo 2 deep dive — `lizbethandjeremie` (the live site = design source of truth)

One route (`/`), one 1,423-line client component `wedding-website.tsx` mounted by `app/page.tsx`. Section order after the gate: **Nav → Hero → Countdown → RSVP → Schedule → Travel → (Things to Do) → FAQs → Registry → Our Story → Footer**. No gallery. Full design spec worth reproducing:

### Design tokens
- **Fonts**: display script `SymphonyPro-Regular` (couple names, monogram, footer) — loaded via injected `@font-face` **hotlinking `db.onlinewebfonts.com` (a font-piracy mirror)** even though local copies exist; body serif **Cormorant Garamond** 300-700 + italics, self-hosted TTFs (OFL, safe), declared in *two* places plus an `!important` override; Geist dead-loaded. Consolidate to one mechanism in the rebuild.
- **Colors**: accent `#F28C52` (soft orange) used solely as `h-px` section dividers (10 sites); stone neutral scale (white / stone-50 alt sections, stone-800 headings, stone-600 body); rose for errors, green for success; hero overlay `black/20`, gate overlay `black/40`.
- **Shape/rhythm**: every section `py-20`; centered header pattern (serif h2 → orange divider → light sub-copy); **`rounded-none` on all inputs/buttons** (square editorial style); cards `border-none shadow-sm`; pills `rounded-full`.
- **Motion**: 1s fade+rise gate entrance; nav transparent-over-hero → white/blur after one viewport of scroll; Radix accordions with height keyframes; mobile nav = right slide-in drawer + scrim.

### Sections (content is hardcoded; §4 of the live-design report mapped every string — the v2 CLIENT sheet schema in Section 9 is derived from exactly this inventory)
- **Gate**: full-screen background *video* (Vercel Blob `.mov`), frosted-glass input, client-side password check against `["nomames","summer"]`, no persistence, silent failure. Cosmetic only.
- **Hero**: full-bleed photo, script-font names, tagline, date, venue lines.
- **Countdown**: days-only, computed once on mount from `new Date("2026-08-15")` (UTC-midnight off-by-one risk; goes negative after the date).
- **Schedule**: accordion by day; rows `{time, title, tag-pill, detail, address+maps link, note}` (7 wedding-day events incl. shuttles).
- **Travel**: hotel block copy + phone + block name + group code + deep-linked booking CTA.
- **FAQs**: 6 accordion items with rich multi-block answers (labeled sub-sections, bullets, callout box).
- **Registry**: intro copy + two Venmo fund cards.
- **Our Story**: 8 paragraphs.
- **Things to Do** (added by PR #19): categorized local recommendations (Dining/Activities/Drinks), bilingual.
- **Footer**: script-font names, date, orange divider on stone-800.

### RSVP UX (the crown jewel — reproduce as-is)
3-step state machine `lookup → select_party → editor` + localStorage session restore (`rsvp_session_v2`, restores by re-running lookup). Lookup by phone (digits-normalized) or first+last name via tabs; ambiguous match → party-picker (`party_options` with `matching_guests`). Editor: one card per guest — badges for plus-ones/children — questions: **Welcome Party** Yes/No toggles, **Wedding** Yes/No toggles, **meal choice** (Select from server-driven `meal_options`; kids get static "Kids Menu"; `is_baby` gets none — PR #21), **dietary restrictions** free text (only when attending). Locked state from server `rsvp_locked` disables everything with a contact banner. One `save_party` call for the whole party; success/error banners. **The deadline shown is hardcoded copy ("July 25, 2026" in two places); the API's `rsvp_deadline` field is typed but never read.**

### Live backend contracts (deployed Apps Script, NOT in git — the v2 script must reimplement)
- Lookup request: `{action:"lookup", lookup_type:"phone"|"name", phone|first_name+last_name, party_id?}`; success: `{ok, status, rsvp_locked, rsvp_deadline, party:{party_id, party_name, party_token, max_guests}, actor:{lookup_type, lookup_value}, events[], meal_options[], guests:[{guest_id, first_name, last_name, is_invited, is_plus_one, is_child, is_baby, rsvp_wedding, rsvp_welcome_party, meal_choice, dietary_restrictions}]}`; error may carry `party_options[]`.
- Save request: `{action:"save_party", party_id, party_token, actor_lookup_value, updates:[{guest_id, rsvp_wedding, rsvp_welcome_party, meal_choice, dietary_restrictions}]}`.
- `/api/log-visit` → posts `{ip, timestamp}` to `VISITOR_LOG_SCRIPT_URL` (sheet headers per PR #17: `Website IP`, `Time and date`); always returns `{ok:true}`, all errors silent.
- Only two env vars in the whole live app: `RSVP_SCRIPT_URL`, `VISITOR_LOG_SCRIPT_URL`.
- Contact phone "(973) 861-1886" hardcoded in 6+ places (route error strings + UI).

### Divergence warning
The two `wedding-website.tsx` copies **forked**: live evolved content + visitor logging + `is_baby`; template's copy evolved architecture (NavItem props, `@/modules/types`, next/link). Neither compiles in the other repo. **Extract sections from the LIVE copy** (newer UX and copy), take the template's prop-driven-nav idea.

---

## 4. GitHub archaeology — timeline and where momentum died

Zero issues in both repos; all intent lives in PR bodies. Everything authored + self-merged by `jeremiecabling` via agent sessions (Codex, v0.dev, Claude).

- **Feb 5, 2026** — live site scaffolded via v0.dev.
- **Feb 26-28** — template repo built in staged Codex PRs: #1 config loader → #2 modules/nav/gating → #6 full pages/RSVP/gate (3 duplicate attempts #3/#4/#5 closed unmerged). Much of this targeted the v0 sync branch, not main.
- **Feb 28** — **PR #7 (config validation `lib/configValidation.ts` + admin health) merged into the WRONG branch** (`v0/jeremiecabling-b404a6fe`, never an ancestor of main) — that validation layer is orphaned there to this day. PR #8 later reimplemented health independently on main.
- **Mar 14** — **PR #8 "v1 commercialization"** merged to main: both Code.gs backends, `/admin/health`, `.env.example`, `docs/PROVISIONING.md`. **Last functional commit to the template repo.**
- **Mar-Jun** — all energy went to the live site (24 PRs total): dress-code iterations, EN/ES i18n (#8, partially rolled back same day #9), deadline copy flip-flop (#10/#11), shuttle time changes (duplicated across two branches: #12/#13, #14/#15, #16/#17 — dual-branch discipline collapsed at #18, an abandoned 36-commit back-sync PR), **Things to Do section (#19)**, **`is_baby` guest type (#21)**, final copy edits Jul 9 (#23/#24). Nothing since, in either repo.
- **Jun 27** — **PR #9 on the template repo: 541 lines of real documentation (`README.md` + `README.llm.md`) — OPEN, NEVER MERGED.** Its body already catalogs known gaps (Theme unwired, dead code, dual lockfiles, index-based GuestList columns, PROVISIONING discrepancies). *Momentum on commercialization ended here.*

**Trapped work to mine before building v2:** template PR #9 (branch `claude/trusting-curie-7pds12` — the docs), live PR #20 (OPEN: iOS hero-video autoplay fix — `useRef` + imperative `muted` + `play()` retry; the live gate video is presumably still broken on iOS), live PR #21 (`is_baby`), live PR #19 (Things to Do), orphaned branch `v0/jeremiecabling-b404a6fe` (`lib/configValidation.ts` — good shape for health parse reports).

**Process lessons for the new session:** (1) one branch, always main-targeted PRs — the dual-branch habit orphaned finished work twice; (2) merge docs immediately — the best documentation ever written for this project rotted in an open PR; (3) same-day-reversal PRs mean *read final state, not PR titles*, for current copy; (4) no tests + `ignoreBuildErrors` + lint-ignoring-everything meant nothing ever failed loudly — v2 serves many clients from one deploy, so real CI is non-negotiable.

---

## 5. The canonical verified-bug list (do not resurrect these)

1. **BUG 1 — sheet/parser mismatch (why the template never actually worked):** content tabs use `section|key|value|type|notes` rows with dotted keys (`event.1.title`). `readContentPage` (Code.gs:248-337) has 3 sniffing modes; 5 columns + all-string header row → generic-table mode → items keyed `section/key/value/type/notes`, which match NO selector field chains, and page-level title/subtitle/intro/body are never produced. Result: every page renders fallback titles and placeholder rows; Registry links all filtered out (no `url` key). Root cause: format *sniffing*. v2 fix: declared per-tab schemas, one parsing convention.
2. **BUG 2 — gallery never renders:** `selectGalleryContent` reads `config.pages.gallery` (contentSelectors.ts:173) but the API emits top-level `config.gallery.images` (Code.gs:106). Images always `[]`.
3. **BUG 3 — RSVP client bypasses its proxy:** `app/rsvp/page.tsx` passes the sheet's raw Apps Script URL to `RSVPClient`, which browser-POSTs with `Content-Type: application/json` → CORS preflight Apps Script can't answer. The working proxy pattern exists unused at `/api/rsvp`.
4. **Entitlement flaw:** `modules.*` toggles live in the couple-editable sheet — paying clients can self-enable add-ons. (Gate is the exception: env-driven.)
5. **Silent empty-config fallback** (siteConfig.ts:114-142) + **GAS always-HTTP-200** (Code.gs:78-82): outages render an empty site instead of failing loudly.
6. **RSVP substring name-lookup** (`rsvp-backend/Code.gs:95` uses `indexOf`): a single letter matches the first party in sheet order and *hands out its permanent bearer party-token*. Token has no expiry/nonce; no `LockService` on save.
7. **Gate weaknesses**: signing secret defaults to the guest password; login compare not constant-time; file-extension middleware bypass leaves `public/` open; live site's gate is fully client-side with passwords in the bundle.
8. **`/admin/health` public** and leaks script URLs.
9. **Countdown**: once-on-mount, UTC-midnight parse, goes negative.
10. **Two competing RSVP URL sources** (sheet `api_url` vs env `RSVP_SCRIPT_URL`) that can drift.
11. Tooling: `ignoreBuildErrors`/`ignoreDuringBuilds`, ESLint ignoring all TS, dual lockfiles, dead deps/components/stylesheets.

## 6. Legal / licensing

- **Symphony Pro** (script font): commercial (Måns Grebäck-style foundry). Bundled TTF/woff2 in both repos (dead weight — nothing serves them) AND hotlinked from `db.onlinewebfonts.com`, a piracy mirror, in both `wedding-website.tsx` files. **Do not ship to paying clients.** Replace with self-hosted OFL scripts (Great Vibes, Allura, Pinyon Script) per theme preset.
- **Cormorant Garamond**: SIL OFL — safe to bundle/resell. Keep.
- ~10.5 MB of orphaned attire PNGs in the live repo (`Wedding_Dresses/Suits/Welcome_Party_*`) — a planned Attire section that never shipped; don't carry to v2.
- No LICENSE files anywhere; add terms appropriate to a service business (you host, they license).

---

## 7-9. THE v2 SPEC (winner of a 3-way judged design: multi-tenant vs per-couple-automated vs sheet-first)

**Decision: ONE multi-tenant Next.js deployment + ONE Apps Script bound to the ADMIN sheet.** Scored 50/60 vs 42/42 for the alternatives — it is the only design where marginal per-client cost approaches zero (no per-client Vercel project, no per-client script deploy, no per-client env vars), upsells/expiry are a checkbox flip, and entitlements are structurally enforceable (the couple-reachable surface contains no entitlement data at all). Grafts adopted from the losers: bind the script to the admin sheet and give it a **"Wedding Hub" `onOpen` menu** (New Client / Flush cache / Rotate gate password); an **installable `onEdit` trigger** flushing per-slug cache on admin edits; a `Log` tab event vocabulary; a `plan` column as bookkeeping-only. Rejected: per-couple's provisioner CLI (Apps Script API automation is the flakiest possible dependency; service accounts can't own scripts), sheet-first's guests-inside-content-sheet (PII + protection weakness).

### 7.1 New repo: `wedding-platform`

```
wedding-platform/
├── app/
│   ├── layout.tsx                  # bare shell + font loading (one mechanism only)
│   ├── page.tsx                    # apex host: operator landing / 404
│   ├── s/[site]/
│   │   ├── layout.tsx              # getTenantConfig(slug); status/expiry/gate enforcement; <style> theme vars; generateMetadata()
│   │   ├── page.tsx                # ONE-PAGE site: Nav→Hero→Countdown→RSVP→Schedule→Travel→ThingsToDo→FAQ→Registry→Story→Gallery→Footer (sections render iff present in config)
│   │   ├── password/page.tsx       # per-tenant gate form
│   │   └── expired/page.tsx
│   └── api/
│       ├── rsvp/route.ts           # tenant-aware GAS proxy (text/plain + manual 302-follow)
│       ├── gate/login/route.ts     # POST {password} → HMAC cookie gate_<slug>
│       ├── revalidate/route.ts     # GET ?site=&secret= → revalidateTag(`tenant-<slug>`)
│       └── log-visit/route.ts      # optional
├── components/sections/            # Hero, Countdown, Rsvp/*, Schedule, Travel, ThingsToDo, Faq, Registry, Story, Gallery/*, Nav, Footer — styled from the LIVE design, props-only, CSS vars not stone-* literals
├── components/gate/PasswordForm.tsx
├── lib/
│   ├── tenant.ts                   # resolveSlugFromHost(); custom-domain map memo (300s TTL)
│   ├── config.ts                   # getTenantConfig: fetch {next:{revalidate:120, tags:[`tenant-${slug}`]}}; HARD-FAIL on !body.ok; keep last-known-good memo
│   ├── gateToken.ts                # HMAC cookie payload v2.<slug>.<pwVersion>.<expiresAt>
│   └── theme.ts                    # theme row → CSS custom-properties string
├── middleware.ts                   # host→slug rewrite to /s/<slug>/* ONLY; no gate logic
├── apps-script/platform/           # clasp project, BOUND to the ADMIN sheet
│   ├── main.gs registry.gs content.gs rsvp.gs menu.gs cache.gs appsscript.json
├── docs/PROVISIONING.md
├── sheet-templates/                # xlsx exports of ADMIN + CLIENT + GUEST templates + README
└── .env.example
```

**Env vars — set ONCE on one Vercel project, never per client:** `PLATFORM_API_URL`, `PLATFORM_API_SECRET`, `GATE_SIGNING_SECRET`, `REVALIDATE_SECRET`, `NEXT_PUBLIC_SUBDOMAIN_BASE` (e.g. `sites.yourbrand.com`). Budget Vercel **Pro (~$20/mo)** — Hobby prohibits commercial use.

**Salvage map (verified):** `lizbethandjeremie/app/api/rsvp/route.ts` verbatim (inject `site` + `secret` server-side; replace hardcoded phone strings with `config.contact`); `custom_wedding_website/lib/passwordGateToken.ts` (change payload to `v2.<slug>.<pwVersion>.<exp>`, delete the password-as-secret fallback); the live `wedding-website.tsx` RSVP state machine (:181-770) and all sections (Nav :1224, Hero :1297, Countdown :1326, Schedule :772, FAQ :934, Travel :1077, Registry :1345, Story :1390, Footer :1410) decomposed into `components/sections/*`; Cormorant TTFs + ONE @font-face block; template gallery layouts as premium starting points. **Drop entirely:** `modules/` registry, `contentSelectors` alias chains, all scaffold pages, both old Code.gs files, public `/admin/health`, Symphony Pro, dead components/deps/stylesheets, `ignoreBuildErrors` and the lint ignore (add `tsc --noEmit` + build to CI — one deploy serves everyone, a bad push breaks all clients).

### 7.2 ADMIN sheet — `WEDDING PLATFORM — ADMIN` (operator-only; the platform script is bound here)

**Tab `Clients`** (one row per couple): `A slug` (unique, `[a-z0-9-]`, = subdomain label) · `B status` (dropdown active/paused/expired/staging; script auto-downgrades past expiry) · `C couple_names` · `D custom_domain` (blank = subdomain) · `E client_sheet_id` · `F rsvp_sheet_id` (blank = no RSVP) · `G expires_at` · `H plan` (basic/plus/premium — bookkeeping ONLY) · `I mod_rsvp` ☑ · `J mod_gallery_premium` ☑ · `K mod_password_gate` ☑ · `L mod_things_to_do` ☑ · `M gate_password` · `N gate_password_version` (bump = invalidate all cookies) · `O theme_preset` (dropdown from Themes) · `P gallery_layout` (grid/masonry/editorial/filmstrip; honored only when J ✓) · `Q contact_name` · `R contact_phone` · `S etsy_order_id` · `T provisioned_at` · `U notes`.

**Tab `Themes`**: `preset | accent_hex | font_display | font_body | bg | bg_alt | text | text_muted | button_bg | radius`. Row 1 = `terracotta | #F28C52 | Great Vibes | Cormorant Garamond | #ffffff | #fafaf9 | #292524 | #57534e | #292524 | 0` (this IS the live design). Add `sage`, `noir`, `blush`. Fonts restricted to a self-hosted OFL whitelist in the repo.

**Tab `Defaults`**: `key | value` fallbacks merged under client content. **Tab `Log`** (script-written): `timestamp | slug | event | detail` (`provisioned`, `config_served_uncached`, `client_sheet_error`, `expired_served`, `rsvp_save`, `secret_mismatch`, `cache_flush`). **Tab `Ops`**: `template_client_sheet_id`, `template_guest_sheet_id`, `default_cache_seconds`.

Installable **`onEdit` trigger**: edits to a Clients row flush `cfg:<slug>` + `domains` cache keys → entitlement/theme changes live in ≤2 min.

### 7.3 CLIENT sheet — content only, ZERO entitlements, ZERO integration config

Two tab shapes only, declared per tab in a `TAB_SCHEMAS` constant in the script — **no format sniffing** (the Bug 1 fix): **Locked-KV** (col A key pre-filled + protected, col B value couple-editable, col C help protected) and **Table** (row 1 exact snake_case headers, protected + frozen; blank rows skipped; unknown columns ignored; cells addressed by header NAME never index). All data ranges pre-formatted Plain text; script reads everything as `String(cell).trim()`.

Tabs: **`📖 Start Here`** (fully protected instructions: image-URL how-to, "~3 min to go live", "don't rename tabs") · **`Basics`** (KV: `couple_names, monogram, wedding_date` [validated YYYY-MM-DD]`, wedding_date_display, hero_tagline, venue_line_1, venue_line_2, hero_image_url, gate_video_url, countdown_caption, rsvp_deadline_display, footer_note`) · **`Schedule`** (table: `day_label|time|title|tag|detail|address|maps_url|note`; consecutive equal day_labels → accordion days) · **`Travel`** (table: `hotel_name|description|address|phone|block_name|group_code|booking_url|button_label`) · **`Things To Do`** (table: `category|name|blurb|url`; parsed only when entitled) · **`FAQ`** (table: `question|answer`; renderer splits `\n\n` into blocks) · **`Registry`** (table: `title|description|url|button_label`; https-validated, blank-url rows dropped) · **`Story`** (table: `heading|paragraph|image_url`) · **`Gallery`** (table: `image_url|caption|alt_text`; row order = display order; script truncates to 12 images + forces grid unless premium) · **`RSVP Text`** (KV: `intro_copy, phone_hint, name_hint, success_message, locked_message, question_1_label, question_2_label`; ignored unless entitled).

**GUEST sheet** (separate spreadsheet per RSVP client — PII isolated): **`GuestList`** `party_id|guest_id|first_name|last_name|email|phone|invite_code|is_child|is_baby|is_plus_one|rsvp_welcome_party|rsvp_wedding|meal_choice|dietary_restrictions|rsvp_timestamp` (header protected, name-addressed) · **`Settings`** (KV: `rsvp_locked` checkbox, `rsvp_deadline`, `meal_options` comma list, `locked_message`) · **`RSVPLog`** (script-appended audit).

### 7.4 Apps Script — ONE bound script, ONE web-app deployment (Execute as Me / Anyone)

Script Properties: `PLATFORM_SECRET` (= Vercel `PLATFORM_API_SECRET`), `TOKEN_SECRET`. Ship code changes via **Manage deployments → Edit → New version** (a NEW deployment changes the `/exec` URL and strands the platform); include a `version` field in every payload.

**`doGet`** (secret checked first; failures return `{ok:false,...}` at HTTP 200 — **Next must branch on `body.ok`**):
- `action=config&site=<slug>` → entitlement-filtered payload: `{ok, site, status, entitlements:{rsvp, gallery_premium, password_gate, things_to_do}, gate:{enabled, password, password_version}, contact:{name, phone}, theme:{...resolved preset row}, content:{basics, schedule:[{label, events[]}], travel[], things_to_do[], faq[], registry[], story[], gallery:{layout, images[]}, rsvp:{...}}, warnings[], version}`. Disabled modules' keys **omitted entirely**; `gate` consumed server-side only, never forwarded to the browser.
- `action=domains` → `{ok, domains:{"anaandben.com":"ana-ben-2027"}, slugs:[...]}` for middleware.
- `action=health&site=` → per-tab parse report (missing_tab/missing_header/empty required keys), entitlement echo, guest-sheet reachability, script version. Replaces the public `/admin/health`.
- `action=flush&site=` → cache bust.

**`doPost`** (JSON via the `/api/rsvp` proxy, `text/plain`): `{secret, site, action:"lookup"|"save_party"|"log_visit", ...}`. Pipeline: secret → registry row must be `status==="active" && mod_rsvp` (**the entitlement wall**) → `openById(rsvp_sheet_id)` → lookup with **exact** lowercased first+last match / digits-only phone (kills the substring token grant); ambiguous → `party_options[]` → save: verify `party_token = HMAC_SHA256(site+":"+party_id, TOKEN_SECRET).hex[0:32]`, **`LockService`** around read-modify-write, write by header name, append RSVPLog. Response carries `rsvp_locked`, `rsvp_deadline`, `meal_options` from guest Settings. Request/response shapes = the live UI's contracts (Section 3) so the salvaged RSVPSection rewires with minimal change.

**Menu (`onOpen`)**: *Wedding Hub → New Client* (dialog: slug, couple email, term end, preset, entitlements → copies both templates via `DriveApp.makeCopy()`, applies protections, shares Editor with couple, appends Clients row, logs, shows summary) · *Flush cache for client* · *Rotate gate password version*.

**Caching**: `CacheService` — `cfg:<slug>` 60s, `domains` 60s; measure payload size, >95 KB skip cache + log (100 KB/value cap). Worst-case staleness 60s GAS + 120s ISR ≈ 3 min; `/api/revalidate` zeroes the Next half.

**Next.js contract**: middleware = pure host→slug rewrite (subdomain = string op; custom domains via memoized `action=domains` map). Gate enforced in `app/s/[site]/layout.tsx` from config (cookie `gate_<slug>` host-only httpOnly, payload `v2.<slug>.<pwVersion>.<exp>`, constant-time password compare in the login route). `status !== "active"` → expired/paused page (term enforcement finally automatic). Theme via `<style>:root{--accent:...}</style>`; `generateMetadata()` from Basics.

### 7.5 Provisioning runbook — client #N (target ≤8 min)

Once ever: one Vercel project + wildcard `*.sites.yourbrand.com`; deploy the bound script; template sheet IDs into `Ops`. Then per client: **(1)** Admin sheet → Wedding Hub → New Client dialog (~2 min — copies sheets, protects, shares, writes the row); **(2)** custom domain only: fill column D + Vercel → Domains → Add + send couple DNS records; **(3)** verify `https://<slug>.sites.yourbrand.com` + `?action=health&site=<slug>`; **(4)** handoff email (sheet link, URL, gate password, "edits live in ~3 min"). Content updates: couple edits → live ≤3 min, zero redeploys, zero operator touches. Upsell: tick a checkbox. Offboard: `status=expired`.

### 7.6 Etsy tier mapping

**Base** = one-page site, core sections, grid gallery (12 img cap), subdomain. **Add-ons**: RSVP (+guest sheet), password gate, Things to Do, premium gallery layouts + higher image cap, custom domain. `plan` column tracks the bundle; checkboxes enforce.

---

## 8. NEEDS-VERIFICATION before building (the design panel flagged conflicting/unverified platform facts)

1. **Vercel wildcard-subdomain support on Pro** — the near-zero provisioning step depends on it; historically wildcards required Vercel nameservers. Verify FIRST; fallback is scripted per-subdomain Domain-add via Vercel API.
2. Apps Script quotas (simultaneous executions ~30?, consumer daily URL-fetch/exec quotas) — sets the realistic client ceiling (~50-100).
3. `CacheService` 100 KB/value cap (drives the gallery guard).
4. Reliable Google-Drive-hosted image URL form (`drive.google.com/uc?export=view&id=` vs `lh3.googleusercontent.com/d/<id>`) — both unofficial; support both in a converter, document direct hosting as the reliable path.
5. Edge middleware `globalThis` memo persistence across cold starts.
6. Bound scripts survive Drive copies (only needed for a v1.1 couple-facing "Publish now" menu; Script Properties do NOT copy).
7. `revalidateTag` on tenant-tagged fetches on the Vercel data cache (standard Next 15, confirm anyway).

## 9. Suggested build order (~18 person-days to v1-sellable)

1. **Day 1**: verify §8 items 1-2; create `wedding-platform` repo; scaffold Next app + CI (`tsc --noEmit`, lint, build — no ignore flags).
2. **Days 2-5**: extract the live design into `components/sections/*` with props + CSS vars; theme system; one demo tenant from fixture JSON (no Google dependency yet). *This is the product — do it first.*
3. **Days 6-9**: Apps Script (registry, TAB_SCHEMAS parser, config/domains/health, caching, menu, onEdit); build the three sheet templates in Drive; commit xlsx exports to `sheet-templates/`.
4. **Days 10-12**: tenant middleware + `[site]` routing + gate + expired pages; wire `lib/config.ts`.
5. **Days 13-15**: RSVP end to end (script doPost + proxy + salvaged RSVPSection incl. `is_baby`, welcome party, dietary, disambiguation; exact-match lookup, LockService).
6. **Days 16-18**: provisioning polish (New Client dialog), demo site with tasteful placeholder content (Etsy listing screenshots), `docs/PROVISIONING.md` rewrite, buyer-facing "how to edit your site" one-pager, mine live PR #20's autoplay fix for the gate video.

**Sales model on Etsy**: sell a *service* (operator sets up + hosts; couple gets a sheet + a URL), not a code download. The 1-2 year term with `expires_at` enforcement is now automatic.

---

## Appendix: quick-reference of legacy facts the new session may need

- Template repo default branch `main` @ `6567318` (merge of PR #8). Open PR #9 = docs. Orphaned branch `v0/jeremiecabling-b404a6fe` = configValidation.
- Live repo `main` @ `1a16e8b` (PR #16 merge). Open PRs: #18 (abandoned back-sync), #20 (autoplay fix).
- Legacy sheet tabs (v1 content sheet): Site, Theme, Nav, Home, Schedule, Details, Travel, Registry, Story, FAQ, Gallery, PasswordGate, RSVP — key/value + dotted-key rows; superseded by the v2 two-sheet design above.
- Legacy env vars: Section 2. Live-site env vars: `RSVP_SCRIPT_URL`, `VISITOR_LOG_SCRIPT_URL`.
- The Apps Script proxy pattern (text/plain, manual 302-follow with GET, single-hop) is load-bearing everywhere Google is involved. GAS web apps cannot set HTTP status codes and cannot answer CORS preflights.
- Live-site gate passwords (`nomames`, `summer`) are in the client bundle of the deployed site; rotate/retire if the live site stays up.
