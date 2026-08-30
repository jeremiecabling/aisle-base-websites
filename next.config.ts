import type { NextConfig } from "next"

// NOTE: no `ignoreBuildErrors`, no `ignoreDuringBuilds` — ever.
// One deploy serves every client; a push that doesn't type-check or lint
// must fail in CI, not in production. (HANDOFF §5 bug 11.)
const nextConfig: NextConfig = {
  poweredByHeader: false,
}

export default nextConfig
