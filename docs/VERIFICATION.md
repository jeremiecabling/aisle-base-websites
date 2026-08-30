# §8 verification notes (items 1–2, researched 2026-08-30)

HANDOFF §8 flagged these as verify-FIRST facts. Researched against official
Vercel/Google documentation with an adversarial second pass. Confidence
labels: ✅ official docs · ◻ unconfirmed/empirical.

## 1. Vercel wildcard subdomains (Pro)

- ✅ **Wildcard domains are supported and not plan-gated** (Hobby included;
  Hobby still prohibits commercial use, so Pro regardless).
  vercel.com/docs/domains/working-with-domains/add-a-domain
- ✅ **The documented default requires the nameservers method**: a wildcard
  needs Vercel to solve ACME **DNS-01** challenges, so the domain (or zone)
  uses `ns1/ns2.vercel-dns.com`. This is exactly the coupling the addendum
  (Q3/F) warned about — moving the apex to Vercel DNS is the smooth path.
- ✅ **Official alternative without moving nameservers**: delegate ONLY the
  ACME label — NS records on `_acme-challenge.sites.<apex>` pointing at
  Vercel's nameservers, plus a wildcard CNAME `*.sites.<apex>` →
  `cname.vercel-dns-0.com` (copy the exact value from the project's domain
  card — since 2025 Vercel assigns project-specific DNS targets).
  vercel.com/kb/guide/wildcard-domain-without-vercel-nameservers
  ⚠ Not usable for apex wildcards (`*.example.com`) — fine for our
  `*.sites.<apex>` shape. ⚠ The delegation can block OTHER hosts from
  issuing certs for that label.
- ✅ **Fallback (the HANDOFF's scripted per-subdomain path) is real**:
  `POST https://api.vercel.com/v10/projects/{idOrName}/domains` (Bearer
  token). Individually-added subdomains use HTTP-01 certs, which work with a
  plain wildcard CNAME at any DNS provider. Domain caps: Pro soft limit
  100,000/project; API domain-creation rate limits exist
  (vercel.com/docs/limits — 120/hour on Hobby tier; check the table before
  bulk operations).
- **Build consequence**: subdomain tenancy works either way; nothing in the
  code changes. The operator decision (Q3) stands: move the apex zone to
  Vercel DNS, or do the `_acme-challenge` delegation. Wildcard SSL is
  automatic in both.

## 2. Apps Script quotas (consumer account)

- ✅ **Simultaneous executions: 30 per user** (and 1,000/script across
  users) — same consumer vs Workspace. With "Execute as: Me", every doGet
  runs as the owner: **30 concurrent requests is THE binding constraint**.
  developers.google.com/apps-script/guides/services/quotas
- ✅ Script runtime 6 min/execution; URL Fetch 20k/day consumer (irrelevant
  to the serve path — SpreadsheetApp reads are not URL Fetch).
- ✅ **No documented "web app requests/day" quota** — concurrency is the
  only web-app throttle. ◻ Community consensus says doGet/doPost do NOT
  consume the 90 min/day trigger-runtime quota; Google never states it
  outright. Cheap load test before ~50 tenants would rule out the worst case.
- ✅ CacheService: 100 KB/value (the §8 item 3 answer — our 95 KB guard is
  correct), max TTL 21600 s, default 600 s. ◻ Total cache size undocumented
  (~1,000 items, FIFO eviction, per Google DevRel's unofficial testing).
- **Ceiling estimate** (each tenant ≤ 720 doGet/day at ISR 120 s): the
  constraint is Erlang-style concurrency, not volume. With warm CacheService
  hits (~0.3–0.6 s) the comfortable ceiling is **~1,000–3,000 tenants**;
  with every request paying a cold Sheets read (1–2 s), **~1,200**. The
  HANDOFF's "~50–100 clients" planning number has enormous headroom —
  **200–500 clients is risk-free** on one consumer-account script.
- **Build consequence**: raising `Ops.default_cache_seconds` from 60 toward
  300 meaningfully raises the ceiling (worst-case staleness becomes
  ~300 s + 120 s ISR ≈ 7 min; onEdit flush still makes admin changes fast).
  Left at 60 for v1 — revisit if tenant count grows past a few hundred.

## Still open from §8 (deliberately)

- Item 5 (edge `globalThis` persistence): made non-load-bearing — the
  domains-map memo refetches on cold start by design (`lib/tenant.ts`).
- Item 6 (bound scripts surviving Drive copies): only matters for a v1.1
  couple-facing "Publish now" menu; not needed now.
- Item 7 (`revalidateTag` on tagged fetches): standard Next 15 behavior used
  as documented; exercised the first time the Google wiring goes live
  (fixtures don't traverse the fetch path).
