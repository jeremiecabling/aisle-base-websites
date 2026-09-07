import { revalidateTag } from "next/cache"
import { NextResponse, type NextRequest } from "next/server"

/**
 * GET /api/revalidate?site=<slug>&secret=<REVALIDATE_SECRET>
 *
 * Zeroes the Next half of the freshness window for one tenant (the Apps
 * Script's onEdit trigger flushes the GAS half). Worst-case staleness with
 * neither: ~60s GAS cache + 120s ISR ≈ 3 min.
 */

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let mismatch = 0
  for (let i = 0; i < a.length; i += 1) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return mismatch === 0
}

export async function GET(request: NextRequest) {
  const site = request.nextUrl.searchParams.get("site") ?? ""
  const secret = request.nextUrl.searchParams.get("secret") ?? ""
  const expected = process.env.REVALIDATE_SECRET?.trim()

  if (!expected) {
    return NextResponse.json({ ok: false, error: "revalidate_not_configured" }, { status: 500 })
  }
  if (!secret || !constantTimeEqual(secret, expected)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 })
  }
  if (!/^[a-z0-9-]{1,63}$/.test(site)) {
    return NextResponse.json({ ok: false, error: "bad_site" }, { status: 400 })
  }

  revalidateTag(`tenant-${site}`)
  return NextResponse.json({ ok: true, revalidated: `tenant-${site}` })
}
