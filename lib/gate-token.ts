/**
 * Password-gate cookie tokens.
 *
 * Salvaged from the template repo's lib/passwordGateToken.ts with two spec'd
 * changes (HANDOFF §7.1):
 * - payload is now `v2.<slug>.<passwordVersion>.<expiresAt>` — bumping
 *   gate_password_version in the admin sheet invalidates every cookie for
 *   that tenant, and a token minted for one tenant can never open another.
 * - the signing secret MUST be GATE_SIGNING_SECRET. The legacy
 *   fallback-to-the-guest-password (bug 7: anyone with the password could
 *   forge tokens) is deleted; a missing secret throws — fail loudly.
 *
 * WebCrypto HMAC-SHA-256, hex, constant-time compare. Works in both the
 * Node and Edge runtimes.
 */

const TOKEN_VERSION = "v2"
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30 // 30 days

const textEncoder = new TextEncoder()

const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")

const secureEqual = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false
  let mismatch = 0
  for (let index = 0; index < a.length; index += 1) {
    mismatch |= a.charCodeAt(index) ^ b.charCodeAt(index)
  }
  return mismatch === 0
}

const hmacHex = async (value: string, secret: string): Promise<string> => {
  const key = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const signature = await crypto.subtle.sign("HMAC", key, textEncoder.encode(value))
  return toHex(new Uint8Array(signature))
}

export function getGateSigningSecret(): string {
  const secret = process.env.GATE_SIGNING_SECRET?.trim()
  if (!secret) {
    throw new Error(
      "GATE_SIGNING_SECRET is not set. The password gate cannot run without it — there is deliberately no fallback (HANDOFF §5 bug 7).",
    )
  }
  return secret
}

/** Cookie name is per-tenant so cookies never leak across tenant hosts/paths. */
export function gateCookieName(slug: string): string {
  return `gate_${slug}`
}

export async function issueGateToken(
  slug: string,
  passwordVersion: number,
  ttlSeconds: number = TOKEN_TTL_SECONDS,
): Promise<{ token: string; maxAge: number }> {
  const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds
  const payload = `${TOKEN_VERSION}.${slug}.${passwordVersion}.${expiresAt}`
  const signature = await hmacHex(payload, getGateSigningSecret())
  return { token: `${payload}.${signature}`, maxAge: ttlSeconds }
}

export async function isValidGateToken(
  token: string,
  slug: string,
  passwordVersion: number,
): Promise<boolean> {
  const parts = token.split(".")
  if (parts.length !== 5) return false
  const [version, tokenSlug, tokenPwVersion, expiresAtRaw, signature] = parts as [
    string,
    string,
    string,
    string,
    string,
  ]

  if (version !== TOKEN_VERSION) return false
  if (tokenSlug !== slug) return false
  if (tokenPwVersion !== String(passwordVersion)) return false

  const expiresAt = Number.parseInt(expiresAtRaw, 10)
  if (!Number.isFinite(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) return false

  const payload = `${version}.${tokenSlug}.${tokenPwVersion}.${expiresAtRaw}`
  const expectedSignature = await hmacHex(payload, getGateSigningSecret())
  return secureEqual(expectedSignature, signature)
}

/** Constant-time password comparison for the login route (bug 7: live compared with !==). */
export function passwordsMatch(submitted: string, expected: string): boolean {
  return secureEqual(submitted, expected)
}
