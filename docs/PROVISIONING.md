# Provisioning runbook — client #N (target ≤ 8 minutes)

Prerequisite: the one-time platform setup in `docs/RUNBOOK-GOOGLE.md` is done
(bound script deployed, templates bootstrapped, Vercel project + wildcard
live).

## Per client

1. **ADMIN sheet → Wedding Hub → New Client…** (~2 min)
   Fill slug, couple names + email, term end, plan (auto-ticks the
   entitlement checkboxes per addendum Q21 — the checkboxes remain the source
   of truth), theme preset, the couple's contact name/phone (guest-facing —
   Q23a), optional custom domain / Etsy order id.
   The dialog copies both templates, shares them with the couple as editors,
   appends the Clients row as **staging**, generates a gate password when
   entitled, and shows a summary (sheet URLs + gate password).

2. **Content**: send the couple their content sheet link. They fill it in;
   you fill `Basics.timezone` (IANA, e.g. `America/Chicago`) and — gate
   clients — upload their gate video clip to the platform's Vercel Blob and
   paste the URL into `Basics.gate_video_url` (Q14: Drive does not stream
   video reliably).

3. **Verify**:
   - `https://<slug>.<SUBDOMAIN_BASE>` renders (staging status renders for
     preview; it is noindex like all tenant pages).
   - `curl "<EXEC_URL>?action=health&site=<slug>&secret=<PLATFORM_SECRET>"`
     → per-tab parse report, no `missing_required`, entitlements as sold.

4. **Go live**: flip the Clients row `status` → `active`. (The onEdit trigger
   flushes the cache; live within ~2-3 min.)

5. **Custom domain only** (à-la-carte, Q22): fill column `custom_domain`,
   add the domain to the Vercel project (Domains → Add), send the couple the
   DNS records Vercel shows.

6. **Handoff email**: sheet link, site URL, gate password (if any), "edits go
   live in ~3 minutes", term end date.

## Later

- **Upsell**: tick the entitlement checkbox in the Clients row. Done.
- **Content stuck?** `?action=health&site=<slug>` names the tab/row/key.
- **Force-refresh**: Wedding Hub → Flush cache for client, then
  `GET /api/revalidate?site=<slug>&secret=<REVALIDATE_SECRET>` to zero the
  Next half too.
- **Rotate gate password**: edit `gate_password`, then Wedding Hub → Rotate
  gate password version (bumps the version → every existing cookie dies).
- **Offboard**: `status` → `expired` (or let `expires_at` do it — a past date
  serves as expired automatically).

## Freshness model (why "~3 minutes")

Couple edit → GAS cache (≤60s) + Next ISR (120s) ≈ worst case ~3 min.
Admin-sheet edits are faster: the onEdit trigger flushes the GAS half
immediately, leaving only the ISR window.
