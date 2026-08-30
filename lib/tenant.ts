/**
 * Host → tenant-slug resolution. Used by middleware (Edge runtime) — keep
 * this file free of Node-only imports.
 *
 * Subdomains are a pure string operation against NEXT_PUBLIC_SUBDOMAIN_BASE.
 * Custom domains resolve through the platform's `action=domains` map,
 * memoized in globalThis with a TTL. §8 item 5 (does globalThis persist
 * across edge cold starts?) is deliberately not load-bearing: a cold start
 * just refetches — the fallback IS the per-request fetch.
 */

const DOMAINS_TTL_MS = 300_000

const SLUG_RE = /^[a-z0-9-]{1,63}$/

export function subdomainBase(): string | null {
  const base = process.env.NEXT_PUBLIC_SUBDOMAIN_BASE?.trim().toLowerCase()
  return base ? base : null
}

function normalizeHost(host: string): string {
  return host.toLowerCase().split(":")[0] ?? ""
}

/** Slug from a `<slug>.<base>` host; null for apex/www/foreign hosts. */
export function resolveSlugFromSubdomain(rawHost: string): string | null {
  const base = subdomainBase()
  if (!base) return null
  const host = normalizeHost(rawHost)
  if (host === base || host === `www.${base}`) return null
  if (!host.endsWith(`.${base}`)) return null
  const label = host.slice(0, -(base.length + 1))
  return SLUG_RE.test(label) ? label : null
}

type DomainsMemo = { domains: Record<string, string>; fetchedAt: number }

function domainsMemo(): { current?: DomainsMemo } {
  const g = globalThis as typeof globalThis & { __tenantDomainsMemo?: { current?: DomainsMemo } }
  g.__tenantDomainsMemo ??= {}
  return g.__tenantDomainsMemo
}

/**
 * Custom-domain → slug lookup (addendum Q22: code path built, sell
 * subdomain-only first). Returns null when the platform API is not
 * configured or the fetch fails — an unknown host then falls through to the
 * apex landing, which is harmless; a broken domains map must never take
 * subdomain tenants down with it.
 */
export async function resolveSlugFromCustomDomain(rawHost: string): Promise<string | null> {
  const host = normalizeHost(rawHost)
  if (!host || host === "localhost") return null

  const apiUrl = process.env.PLATFORM_API_URL?.trim()
  if (!apiUrl) return null

  const memo = domainsMemo()
  if (memo.current && Date.now() - memo.current.fetchedAt < DOMAINS_TTL_MS) {
    return memo.current.domains[host] ?? null
  }

  try {
    const url = new URL(apiUrl)
    url.searchParams.set("action", "domains")
    const secret = process.env.PLATFORM_API_SECRET?.trim()
    if (secret) url.searchParams.set("secret", secret)

    const response = await fetch(url.toString())
    const body: unknown = await response.json()
    if (
      typeof body === "object" &&
      body !== null &&
      "ok" in body &&
      (body as { ok: unknown }).ok === true &&
      "domains" in body &&
      typeof (body as { domains: unknown }).domains === "object"
    ) {
      const domains = (body as { domains: Record<string, string> }).domains
      memo.current = { domains, fetchedAt: Date.now() }
      return domains[host] ?? null
    }
    console.error(`[tenant-domains] domains map refused or malformed for host ${host}`)
    return null
  } catch (error) {
    console.error(`[tenant-domains] domains map fetch failed: ${String(error)}`)
    return null
  }
}
