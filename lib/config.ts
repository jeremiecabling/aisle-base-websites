import "server-only"
import { cache } from "react"
import { tenantConfigSchema, type PublicTenantConfig, type TenantConfig } from "@/lib/config-schema"
import { getFixtureConfig, isFixtureTenant } from "@/lib/fixtures"

/**
 * getTenantConfig — the ONLY way tenant config enters the app.
 *
 * Failure philosophy (HANDOFF §5 bugs 5 + Bug-1 family; addendum preamble):
 * - The Apps Script always answers HTTP 200 — `response.ok` is meaningless.
 *   We branch on `body.ok`.
 * - `body.ok === false` is an AUTHORITATIVE refusal (unknown site, secret
 *   mismatch): unknown_site → null (caller renders 404); anything else
 *   throws. No fallback — a misconfigured secret must page the operator,
 *   not quietly serve stale content.
 * - Transport/shape failures (network error, non-JSON, schema-invalid) are
 *   TRANSIENT: log loudly and serve the last-known-good config if this
 *   lambda has one; throw if it doesn't. Never render an empty shell.
 *
 * Transport is GET with the secret in the query — accepted by design
 * (addendum Q20): Next's data cache only caches GET fetches, and the
 * freshness model (revalidate: 120 + tags) depends on it. Do not "fix" this.
 */

const REVALIDATE_SECONDS = 120

type LkgStore = Map<string, TenantConfig>

function lastKnownGood(): LkgStore {
  const g = globalThis as typeof globalThis & { __tenantConfigLkg?: LkgStore }
  g.__tenantConfigLkg ??= new Map()
  return g.__tenantConfigLkg
}

function platformApiUrl(): string {
  const url = process.env.PLATFORM_API_URL?.trim()
  if (!url) {
    throw new Error(
      "PLATFORM_API_URL is not set. Non-fixture tenants cannot be served — see .env.example.",
    )
  }
  return url
}

/** React-cached so layout + page share one lookup per request. */
export const getTenantConfig = cache(getTenantConfigUncached)

async function getTenantConfigUncached(slug: string): Promise<TenantConfig | null> {
  // Slug hygiene before it touches a URL.
  if (!/^[a-z0-9-]{1,63}$/.test(slug)) return null

  if (isFixtureTenant(slug)) {
    return getFixtureConfig(slug)
  }

  const url = new URL(platformApiUrl())
  url.searchParams.set("action", "config")
  url.searchParams.set("site", slug)
  const secret = process.env.PLATFORM_API_SECRET?.trim()
  if (secret) url.searchParams.set("secret", secret)

  let body: unknown
  try {
    const response = await fetch(url.toString(), {
      next: { revalidate: REVALIDATE_SECONDS, tags: [`tenant-${slug}`] },
    })
    body = await response.json()
  } catch (error) {
    return serveLastKnownGoodOrThrow(slug, `config fetch failed: ${String(error)}`)
  }

  if (
    typeof body === "object" &&
    body !== null &&
    "ok" in body &&
    (body as { ok: unknown }).ok === false
  ) {
    const refusal = body as { ok: false; error?: string }
    if (refusal.error === "unknown_site") return null
    // Authoritative refusal — hard fail, no last-known-good.
    throw new Error(
      `Platform API refused config for "${slug}": ${refusal.error ?? "no error code"} (check PLATFORM_API_SECRET / admin sheet)`,
    )
  }

  const parsed = tenantConfigSchema.safeParse(body)
  if (!parsed.success) {
    return serveLastKnownGoodOrThrow(
      slug,
      `config payload failed schema validation:\n${parsed.error.message}`,
    )
  }

  lastKnownGood().set(slug, parsed.data)
  return parsed.data
}

function serveLastKnownGoodOrThrow(slug: string, reason: string): TenantConfig {
  const lkg = lastKnownGood().get(slug)
  if (lkg) {
    console.error(
      `[tenant-config] ${slug}: ${reason} — serving last-known-good config from this instance. FIX THE SOURCE; this is a degraded state, not a feature.`,
    )
    return lkg
  }
  throw new Error(`[tenant-config] ${slug}: ${reason} — and no last-known-good is available.`)
}

/**
 * Strip everything the browser must never see before any part of the config
 * crosses into client components. Today that is `gate` (plaintext password).
 */
export function toPublicConfig(config: TenantConfig): PublicTenantConfig {
  const { gate: _gate, ...publicConfig } = config
  return publicConfig
}
