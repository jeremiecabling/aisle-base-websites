# Google-side runbook (one-time platform setup)

The hybrid model from addendum Q2: **all code and sheet structure are
authored in this repo**; you perform the ~30 minutes of clicks that require
your logged-in Google account. Do these in order. Steps marked ⚠ are the
ones people get wrong.

## 0. Prerequisites

- A Google account that will own the platform (sheets + script + deployment).
- Node ≥ 20 locally with `npm i -g @google/clasp` (or skip clasp and paste
  files by hand in step 3 — both work).
- If using clasp: enable the Apps Script API for your account at
  https://script.google.com/home/usersettings (toggle → On), then `clasp login`.

## 1. Create the ADMIN spreadsheet

1. Create one blank Google Sheet. Name it `WEDDING PLATFORM — ADMIN`.
2. This sheet is operator-only, forever. Couples never see it (entitlements
   live here — HANDOFF §5 bug 4 is fixed by this separation).

## 2. Attach the bound script

1. In the sheet: **Extensions → Apps Script**. This creates the bound project.
2. Name the project (e.g. `Aisle Base Platform`).

## 3. Push the code

With clasp:

```bash
cd apps-script/platform
clasp clone <SCRIPT_ID>   # Script ID: Apps Script editor → Project Settings
# clasp clone pulls the empty remote files; delete what it pulled EXCEPT .clasp.json, then:
clasp push -f             # pushes appsscript.json + all .gs files
```

(`.clasp.json` is gitignored — never commit it.)

Without clasp: in the editor, create files matching the names under
`apps-script/platform/` and paste each one; replace the default
`appsscript.json` via Project Settings → check "Show appsscript.json".

## 4. Run `bootstrapTemplates()` (one time)

1. Editor → select `bootstrapTemplates` in the function dropdown → **Run**.
2. ⚠ First run asks for authorization — approve (Sheets + Drive scopes; it's
   your own account).
3. It builds the ADMIN tabs (Clients/Themes/Defaults/Log/Ops with
   validations + protections), creates the CLIENT and GUEST template
   spreadsheets, and writes their IDs into `Ops`.
4. Run `bootstrapStatus()` and check the log output says everything exists.
5. Export both templates (File → Download → .xlsx) into `sheet-templates/`
   and commit them (reference copies only).

## 5. Script Properties (secrets)

Editor → Project Settings → Script Properties → add:

| Property | Value |
|---|---|
| `PLATFORM_SECRET` | the generated value (same one goes to Vercel `PLATFORM_API_SECRET`) |
| `TOKEN_SECRET` | the generated value (reserved for the RSVP session) |

Generate values with `openssl rand -hex 32`. The build session prints a
one-time secrets table at handoff — store it in your password manager. Never
commit secrets.

## 6. Deploy the web app (THE deployment)

1. **Deploy → New deployment → Web app.**
2. Execute as: **Me**. Who has access: **Anyone**. Deploy.
3. Copy the `/exec` URL → this is Vercel's `PLATFORM_API_URL`.
4. ⚠ **From now on, ship code via Manage deployments → ✏ Edit → Version:
   New version.** Creating another NEW deployment mints a different `/exec`
   URL and strands the platform (HANDOFF §7.4).

## 7. Install the onEdit trigger

Reload the spreadsheet → menu **Wedding Hub → Install onEdit trigger** (or
Triggers → Add: `handleAdminEdit`, From spreadsheet, On edit). This flushes
per-slug caches when you edit admin rows, so entitlement/theme flips go live
in ≤ ~2 min.

## 8. Smoke test

```
curl "<EXEC_URL>?action=domains&secret=<PLATFORM_SECRET>"
# → {"ok":true,"domains":{},"slugs":[],...}

curl "<EXEC_URL>?action=config&site=nope&secret=<PLATFORM_SECRET>"
# → {"ok":false,"error":"unknown_site",...}

curl "<EXEC_URL>?action=config&site=nope&secret=wrong"
# → {"ok":false,"error":"secret_mismatch",...}
```

All three arrive as HTTP 200 — that's Apps Script; the `ok` field is the
contract (HANDOFF §2).

## 9. Vercel wiring

1. One Vercel project (Pro — Hobby prohibits commercial use), linked to this
   repo, `main` = production.
2. Env vars (Production): `PLATFORM_API_URL`, `PLATFORM_API_SECRET`,
   `GATE_SIGNING_SECRET`, `REVALIDATE_SECRET`, `NEXT_PUBLIC_SUBDOMAIN_BASE`
   (see `.env.example`).
3. Domains: add the apex + wildcard `*.<NEXT_PUBLIC_SUBDOMAIN_BASE>` — see
   `docs/VERIFICATION.md` for the wildcard/DNS facts before this step.

## 10. First client

Follow `docs/PROVISIONING.md` (Wedding Hub → New Client…).
