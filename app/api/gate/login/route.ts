import { NextResponse, type NextRequest } from "next/server"
import { getTenantConfig } from "@/lib/config"
import { gateCookieName, issueGateToken, passwordsMatch } from "@/lib/gate-token"
import { resolveSlugFromSubdomain } from "@/lib/tenant"

/**
 * POST { password, slug? } → sets the tenant's gate cookie on success.
 *
 * The tenant is derived from the request host when possible; the body slug
 * covers path-based access (/s/<slug> on previews/dev). Possession of the
 * tenant's password is the credential — the slug only selects which
 * password to check and which cookie to mint, so a client-supplied slug
 * grants nothing across tenants (cookies are per-slug and layouts validate
 * slug + password_version inside the token).
 *
 * Wrong password → 401 after a small constant delay. Comparison is
 * constant-time (HANDOFF §5 bug 7: the legacy route used !==).
 */
export async function POST(request: NextRequest) {
  let parsed: unknown
  try {
    parsed = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 })
  }
  if (typeof parsed !== "object" || parsed === null) {
    // JSON.parse("null") etc. — reject before property access.
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 })
  }
  const body = parsed as { password?: unknown; slug?: unknown }

  const password = typeof body.password === "string" ? body.password : ""
  const bodySlug =
    typeof body.slug === "string" && /^[a-z0-9-]{1,63}$/.test(body.slug) ? body.slug : null
  // Body slug first: it names the gate screen the guest is actually looking
  // at (path-based /s/<slug> access can differ from the request host, and the
  // password itself is the credential — the slug only selects which password
  // to check and which cookie to mint).
  const slug = bodySlug ?? resolveSlugFromSubdomain(request.headers.get("host") ?? "")

  if (!slug || !password) {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 })
  }

  const config = await getTenantConfig(slug)
  if (!config || !config.entitlements.password_gate || !config.gate?.enabled) {
    return NextResponse.json({ ok: false, error: "gate_not_enabled" }, { status: 404 })
  }

  if (!passwordsMatch(password.trim().toLowerCase(), config.gate.password.trim().toLowerCase())) {
    // Uniform small delay to blunt timing/enumeration probes.
    await new Promise((resolve) => setTimeout(resolve, 300))
    return NextResponse.json({ ok: false, error: "wrong_password" }, { status: 401 })
  }

  const { token, maxAge } = await issueGateToken(slug, config.gate.password_version)
  const response = NextResponse.json({ ok: true })
  response.cookies.set(gateCookieName(slug), token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  })
  return response
}
