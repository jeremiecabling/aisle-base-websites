# HANDOFF ADDENDUM — Pre-build questions & decisions

**Paste this alongside HANDOFF.md.** Every question below is something the build session will either stall on or silently guess wrong. Each has a recommended **Default** — answer inline, or write one line at the top: *"Accept all defaults except: ..."*. With defaults accepted, this addendum doubles as the v1 decisions record.

---

## 0. The five blockers (nothing starts until these are answered)

1. **How does the session read the code?** Both repos are private, and Days 2–5 ("this is the product") require reading `wedding-website.tsx` line-by-line plus three open PRs and an orphaned branch. `file:line` citations are not a substitute for the files. → Q1
2. **Who clicks on the Google side?** Sheets, protections, the bound script, its deployment, and the installable trigger all require your logged-in Google account. `clasp login` is interactive OAuth. → Q2
3. **Vercel + domain.** Project creation, env vars, and the wildcard subdomain need either a token or you at the keyboard — and wildcards are coupled to a DNS decision (Q3), which is coupled to a brand decision (Q9). This is a Day-0 dependency chain, not a Day-12 one.
4. **What does "v1 live" mean for THIS session?** The doc's plan is 18 person-days. One session ships one milestone. → Q6
5. **Demo tenant content.** The demo site is the Etsy listing. Someone has to supply photos and copy, and "reuse Lizbeth & Jeremie's real content" has privacy implications. → Q7

---

## A. Access & execution environment

**Q1 — Code access method.** The salvage map depends on: live `wedding-website.tsx` (all of it), live `app/api/rsvp/route.ts`, template `lib/passwordGateToken.ts` and `middleware.ts`, live PR #20 (autoplay fix diff), live PR #21 (`is_baby`), template PR #9 (`README.llm.md`), and branch `v0/jeremiecabling-b404a6fe` (`lib/configValidation.ts`).
**Default:** run the session in a workspace containing fresh clones of BOTH repos with all branches fetched, plus authenticated `gh` CLI so it can pull the PR diffs/bodies itself. Fallback: attach the files listed in Section D manually.
**Answer:**

**Q2 — Google-side execution model.** The session cannot create sheets, set protections, deploy web apps, or install the `onEdit` trigger under your account.
**Default:** hybrid. The session authors all `.gs` files **plus a one-time `bootstrapTemplates()` function** that programmatically builds, formats, validates, and protects the ADMIN + CLIENT + GUEST template sheets (so you never hand-build tabs). Your manual steps, from a runbook it writes: create one blank admin sheet → paste/`clasp push` the script → run `bootstrapTemplates()` → authorize → deploy web app (Execute as Me / Anyone) → install the `onEdit` trigger → paste template IDs into `Ops`. Confirm you'll be at the keyboard for ~30 min when it reaches this step (and that Apps Script API is enabled on your account if using clasp).
**Answer:**

**Q3 — Vercel access + DNS reality check.** Three sub-questions: (a) Does a Vercel Pro team exist, and does the session get a `VERCEL_TOKEN`, or do you run the CLI steps from its runbook? (b) Is the apex domain purchased? (c) Are you willing to delegate that domain's nameservers to Vercel DNS — historically the requirement for wildcard subdomains (this is exactly §8 item 1; verify it Day 1, but the *willingness* question is yours, not the builder's).
**Default:** you run `vercel` steps manually from the runbook; domain is purchased and moved to Vercel DNS before the tenant-routing milestone; fallback if wildcards fail = scripted per-subdomain Domain-add via Vercel API, as the doc says.
**Answer:**

**Q4 — Secrets.** `PLATFORM_API_SECRET`, `GATE_SIGNING_SECRET`, `REVALIDATE_SECRET` (Vercel env) and `PLATFORM_SECRET`, `TOKEN_SECRET` (Script Properties).
**Default:** the session generates all of them (`openssl rand -hex 32`) and prints a one-time table mapping each secret to its exact home; you store them in your password manager. Never committed.
**Answer:**

**Q5 — Target repo & CI.** **Default:** new private repo `jeremiecabling/wedding-platform`, single `main` branch, GitHub Actions running `tsc --noEmit` + lint + `next build` on every push (the doc's non-negotiable). No forks of the old repos.
**Answer:**

---

## B. Scope: what THIS session ships

**Q6 — Pick the milestone.** Options: **(a)** Days 1–5 only — polished sections extracted from the live design, theme system, one demo tenant rendered from fixture JSON, deployed; zero Google dependency. **(b)** Days 1–12 — everything in (a) plus the Apps Script (config/domains/health/caching/menu), the three sheet templates, tenant middleware, gate, expired pages; one real sheet-driven demo tenant live on a subdomain. **(c)** the full 18 days including RSVP.
**Default:** **(b) if you can be present for the Q2/Q3 manual steps mid-session; otherwise (a)**, with Google wiring as session 2. Either way, **RSVP is its own follow-up session** — it's the highest-risk chunk, it has frozen request/response contracts (§3), and bolting it on at hour 9 of a long run is how bugs 3 and 6 happened the first time.
**Answer:**

**Q7 — Demo tenant content.** **Default:** a fabricated couple ("Ana & Ben — June 2027"), NOT Lizbeth & Jeremie's real names/photos/schedule on a public, Etsy-screenshotted demo. You supply 8–12 photos you have rights to (own non-wedding shots, a purchased stock set, or generated) plus a short gate-video clip. The session writes tasteful placeholder copy for every section including Things to Do and premium gallery layouts, so one demo showcases every sellable feature.
**Answer:**

**Q8 — Fate of the live L&J site.** The wedding was 2026-08-15; the gate passwords (`nomames`, `summer`) are in the shipped client bundle.
**Default:** leave the deployment up for now but rotate or remove the gate passwords this week (independent of the build). Migrating L&J onto the platform as a real tenant is a great session-3 dogfood test — not v1.
**Answer:**

---

## C. Product/spec decisions the doc leaves open

These are the places a builder will guess. Defaults are written so that accepting them yields a coherent spec patch to §7.

**Q9 — Brand + apex.** `sites.yourbrand.com` is a placeholder in six places. Need: the real brand, the real apex domain, therefore the real `NEXT_PUBLIC_SUBDOMAIN_BASE`. Also: what does the apex `/` render in v1?
**Default:** minimal branded landing (name, one-line pitch, contact/Etsy link), indexable; supply the actual domain in your answer.
**Answer:**

**Q10 — Event model (biggest schema ambiguity in §7).** The GUEST sheet hardcodes two events (`rsvp_welcome_party`, `rsvp_wedding`) because *your* wedding had a welcome party. The live lookup contract also types an `events[]` array. How does a couple WITHOUT a welcome party configure that?
**Default:** v1 is fixed-two-events. Add `welcome_party_enabled` (checkbox) to guest-sheet `Settings`; when off, the question is hidden in the editor, the column is ignored on save, and `events[]` (kept in the contract for forward-compat) is emitted as just `["wedding"]`. Generalized N-event support is explicitly out of scope for v1.
**Answer:**

**Q11 — Countdown behavior.** The doc flags the UTC off-by-one and negative-days bug but never specs the fix.
**Default:** add `timezone` (IANA string, operator-filled with help text) to CLIENT `Basics`. Countdown = whole days between "today in that timezone" and `wedding_date`; ≥1 → "N days"; 0 → a "today's the day" message (reuse `countdown_caption`); past → section hidden.
**Answer:**

**Q12 — Gallery caps.** Base = 12 (specified). Premium cap is unspecified.
**Default:** premium = 40 (≈10 KB of URLs+captions in the payload — comfortably under the 95 KB cache guard). Missing `alt_text` falls back to `caption`, then to `"Photo N"`.
**Answer:**

**Q13 — Rendering couple-supplied images.** `next/image` needs `remotePatterns`; couples will paste URLs from arbitrary hosts, and Vercel bills image transformations.
**Default:** plain `<img loading="lazy">` for all tenant-supplied media in v1 (hero via CSS `object-cover`). Revisit `next/image` with `hostname: '**'` later if LCP suffers.
**Answer:**

**Q14 — Media hosting guidance (this becomes the "Start Here" tab copy — a product decision, not a builder decision).** §8 item 4 says both Google Drive URL forms are unofficial.
**Default:** photos — recommend Drive "anyone with link" + the built-in converter (accept both `uc?export=view` and `lh3.googleusercontent.com/d/` forms), with "any direct image URL also works" as the documented reliable path. Gate video — Drive does NOT stream reliably; the runbook makes it an operator step: you upload the couple's clip to the platform's Vercel Blob via dashboard/CLI and paste the URL into `gate_video_url`. No in-app upload code in v1.
**Answer:**

**Q15 — SEO/privacy default.** Couples rarely want their wedding site indexed.
**Default:** `noindex, nofollow` on ALL tenant sites (metadata + robots), apex landing indexable. Per-tenant override deferred.
**Answer:**

**Q16 — Visitor logging.** The live `log-visit` silently posts guest IPs to a sheet.
**Default:** drop it from v1 entirely (delete the route from the §7.1 tree). Logging your clients' guests' IPs is liability with no value; revisit as opt-in analytics later.
**Answer:**

**Q17 — Language.** Live had partial EN/ES; v2 sheets are monolingual.
**Default:** no i18n system. Couples write content in whatever language, AND all guest-facing chrome strings (nav labels, RSVP button text, gate placeholder, etc.) are exposed as operator-editable keys in the ADMIN `Defaults` tab — so a fully-Spanish site is achievable through content alone, zero code.
**Answer:**

**Q18 — Fonts.** Three sub-decisions: (a) confirm the OFL whitelist (Great Vibes, Allura, Pinyon Script display; Cormorant Garamond body); (b) loading mechanism — `next/font` is build-time and can't switch per-tenant per-request, so **Default:** self-hosted files committed to the repo (with license files), and the tenant layout emits `@font-face` + CSS vars for only the two fonts that tenant's theme uses; (c) **eyeball a Great Vibes vs Symphony Pro sample BEFORE Days 2–5 bake sizing into the sections** — script fonts differ wildly in x-height and the hero is the product.
**Answer:**

**Q19 — RSVP deadline: kill the Bug-10 twin.** `Basics.rsvp_deadline_display` (client sheet) and guest `Settings.rsvp_deadline` will drift, exactly like the two RSVP URLs did.
**Default:** delete `rsvp_deadline_display` from Basics. The displayed deadline is formatted from guest `Settings.rsvp_deadline`; if unset, no deadline copy renders. (Also fixes the live site's hardcoded-"July 25" bug by construction.)
**Answer:**

**Q20 — Config transport (accept this constraint knowingly).** `gate.password` travels in `doGet?...&secret=` — a secret in a URL query string. You cannot "fix" this by switching to POST: **Next's data cache only caches GET fetches**, so a POSTed config would break `revalidate`/`revalidateTag` and the whole ≤3-min freshness story.
**Default:** keep GET. Mitigations: long random secret, rotate on suspicion, and note that the only logs seeing the URL are Google's on your own script. Document in the repo so a future session doesn't "improve" it.
**Answer:**

**Q21 — Plan bundles.** `plan` is bookkeeping-only, but the New Client dialog is nicer with presets.
**Default:** basic = core only; plus = +RSVP +gate; premium = +Things to Do +premium gallery. Custom domain is à-la-carte at any tier. Dialog auto-ticks from plan; the checkboxes remain the source of truth.
**Answer:**

**Q22 — Custom domains in v1.** They drag in §8 items 1 and 5 (wildcard behavior, edge memo persistence).
**Default:** build the code path (it's cheap: column D + the `action=domains` map + middleware memo with a per-request-fetch fallback if `globalThis` doesn't persist), but sell subdomain-only first. The first custom-domain order triggers live verification.
**Answer:**

**Q23 — Two one-line clarifications.** (a) ADMIN `contact_name/contact_phone` = the **couple's** preferred human contact for guest-facing error/locked banners, not you — add help text saying so. (b) Keep the `invite_code` column in GuestList for ops, but **drop code-based lookup** from the v2 UI and `doPost` (live UX never exposed it; name/phone only).
**Default:** yes to both.
**Answer:**

---

## D. Attach alongside HANDOFF.md when you kick off

- Fresh clones of both repos, all branches fetched (must include `claude/trusting-curie-7pds12` and `v0/jeremiecabling-b404a6fe`) — or, at minimum, these files: live `wedding-website.tsx`, live `app/api/rsvp/route.ts`, template `lib/passwordGateToken.ts`, template `middleware.ts`, `lib/configValidation.ts` from the orphaned branch, PR #20's diff, PR #9's `README.llm.md`, and `Test_Custom_Wedding_Website.xlsx` for reference.
- The **"live-design report"** that §3 cites ("§4 of the live-design report mapped every string") — it is referenced but NOT included in HANDOFF.md. Attach it, or delete the cross-reference so the builder doesn't hunt for a document that isn't there.
- Demo assets per Q7 (photos + gate video clip).
- This addendum, answered.
- Credentials per Q1/Q3 (authed `gh`; optional `VERCEL_TOKEN`), and your availability window for the Q2 manual steps.

## E. Small patches to make in HANDOFF.md before pasting

1. Fix the section-numbering collision: the header `## 7-9. THE v2 SPEC` is followed by separate top-level `## 8` and `## 9` sections. Rename to `## 7. THE v2 SPEC` — LLMs follow headers literally and this reads as §8/§9 appearing twice.
2. Resolve or remove the external "live-design report" reference (Section D above).
3. Once Q10/Q11/Q19 are answered, fold those resolutions into §7.3/§7.4 directly so the spec is self-contained.
4. Add one line to §7.2: plaintext `gate_password` in the admin sheet is **accepted by design** (stakes are guest-level; version bump invalidates cookies) — prevents a well-meaning builder from "hardening" it into operational pain.
5. Non-blocking, business-side: sanity-check that the Etsy listing format (hosted service + term, not a digital download) fits Etsy's current policies before the demo/screenshots milestone.

## F. Notes the builder should inherit verbatim

- Config fetch stays **GET** — Next only caches GET fetches, and the freshness model depends on the data cache + tags (see Q20).
- Per-tenant fonts: `@font-face` from self-hosted whitelisted files selected by config, NOT `next/font` (build-time, can't vary per request) — see Q18.
- Wildcard subdomains are coupled to putting the apex on Vercel DNS; treat domain/DNS as a Day-0 decision (Q3/Q9), and §8 items 1–2 are still verify-first.
- Rename the RSVP localStorage key to `rsvp_session_<slug>` when salvaging the state machine — pure hygiene (origins already isolate tenants), but it keeps a tenant's slug visible in stored state for debugging.
- Pin toolchain in-repo (Node LTS via `.nvmrc`/engines, pnpm via corepack) so CI and the next agent session agree.

## Suggested kickoff preamble for the build session

> You are starting from HANDOFF.md + HANDOFF-ADDENDUM.md (answered). Scope = milestone (Q6 answer). Both legacy repos are cloned in this workspace; treat their code as the salvage source per HANDOFF §7's salvage map and never push to them. Order of operations: verify §8 items 1–2 → scaffold `wedding-platform` + CI → Days 2–5 design extraction against fixture JSON → then Google wiring per the addendum's Q2 runbook, pausing for my manual steps. Do not build RSVP in this session. Fail loudly everywhere: no `ignoreBuildErrors`, hard-fail on `!body.ok`, keep last-known-good.
