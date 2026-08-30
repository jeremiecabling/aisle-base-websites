# Aisle Base — multi-tenant wedding website platform

One Next.js deployment + one Google Apps Script serves every client's wedding
website. Couples edit a Google Sheet; their site updates within ~3 minutes.
Operator (you) controls entitlements from a single ADMIN sheet. Sold as a
hosted service (Etsy), not a code download.

This repo is the v2 rebuild specified in `docs/HANDOFF.md` + answered
addendum — see `docs/DECISIONS.md` for the binding v1 decisions record.

## Architecture (one paragraph)

`middleware.ts` rewrites `<slug>.<SUBDOMAIN_BASE>` (and mapped custom domains)
to `/s/<slug>`. `app/s/[site]/layout.tsx` fetches the tenant's config from the
platform Apps Script (`?action=config&site=<slug>` — GET on purpose, see
`docs/DECISIONS.md` Q20), validates it against `lib/config-schema.ts` (fail
loudly, keep last-known-good), enforces status/expiry and the password gate,
and injects the tenant's theme CSS variables + @font-face. Sections in
`components/sections/*` are props-only and style themselves exclusively
through theme tokens. Entitlements live ONLY in the operator's ADMIN sheet —
the couple-reachable surface contains none.

## Development

```bash
corepack enable
pnpm install
pnpm dev
```

The demo tenant needs no Google side at all — it renders from
`fixtures/tenants/*.json`:

- http://localhost:3000/s/ana-and-ben — fixture demo tenant
- http://localhost:3000 — apex landing

Checks (CI runs the same three on every push; none may be skipped):

```bash
pnpm typecheck && pnpm lint && pnpm build
```

## Repo map

| Path | Purpose |
|---|---|
| `app/s/[site]/` | Tenant site: layout (config/theme/gate/status), one-page site, gate + expired pages |
| `components/sections/` | The product: sections extracted from the live design, props-only, theme-token styled |
| `lib/config-schema.ts` | THE tenant-config contract (zod). Apps Script payloads and fixtures both satisfy it |
| `lib/config.ts` | `getTenantConfig`: fixture or GET fetch, hard-fail on `!body.ok`, last-known-good memo |
| `middleware.ts` | Host → `/s/<slug>` rewrite only. No gate logic here |
| `fixtures/tenants/` | Fixture tenant configs (demo content, zero Google dependency) |
| `apps-script/platform/` | The ONE bound Apps Script (clasp project) + `bootstrapTemplates()` |
| `sheet-templates/` | Exports + docs for the ADMIN / CLIENT / GUEST sheet templates |
| `docs/` | Handoff, decisions record, provisioning + Google runbooks, verification notes |
| `public/fonts/` | Self-hosted OFL fonts only (each dir carries its OFL.txt). No Symphony Pro — ever |

## Non-negotiables (learned the hard way — HANDOFF §5)

- No `ignoreBuildErrors`, no `ignoreDuringBuilds`, no lint ignores of source.
- Config fetches branch on `body.ok` (Apps Script always answers HTTP 200).
- No silent empty-config fallback: bad config = loud failure + last-known-good.
- Entitlement data never enters couple-editable surfaces.
- Config transport stays GET (Next only caches GET) — see Q20 before "improving" it.
