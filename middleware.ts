import { NextResponse, type NextRequest } from "next/server"
import { resolveSlugFromCustomDomain, resolveSlugFromSubdomain } from "@/lib/tenant"

/**
 * Host → /s/<slug> rewrite ONLY. No gate logic lives here (HANDOFF §7.1) —
 * the gate is enforced server-side in app/s/[site]/layout.tsx where the
 * tenant config is available.
 *
 * Direct /s/<slug> paths are intentionally served as-is: they make Vercel
 * preview deployments and local dev usable without wildcard DNS, and every
 * tenant page is noindex (Q15), so the duplicate surface costs nothing.
 */
export async function middleware(request: NextRequest) {
  const host = request.headers.get("host") ?? ""

  const slug =
    resolveSlugFromSubdomain(host) ?? (await resolveSlugFromCustomDomain(host))

  if (!slug) return NextResponse.next()

  const url = request.nextUrl.clone()
  url.pathname = `/s/${slug}${url.pathname === "/" ? "" : url.pathname}`
  return NextResponse.rewrite(url)
}

export const config = {
  // Skip API routes, Next internals, and anything with a file extension
  // (static assets), plus already-prefixed /s/ paths.
  matcher: ["/((?!api/|_next/|s/|.*\\..*).*)"],
}
