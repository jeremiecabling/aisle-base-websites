import { tenantConfigSchema, type TenantConfig } from "@/lib/config-schema"
import anaAndBen from "@/fixtures/tenants/ana-and-ben.json"
import demoGated from "@/fixtures/tenants/demo-gated.json"

/**
 * Fixture tenants: full tenant configs served from the repo with zero Google
 * dependency (HANDOFF §9 Days 2-5). The demo site for the Etsy listing runs
 * on these permanently; they also double as the schema's regression
 * fixtures.
 *
 * Parsing happens EAGERLY at module load: `next build` imports route modules,
 * so a fixture that drifts from the contract fails the build with the zod
 * error — never renders an empty site (HANDOFF §5 bugs 1/5).
 */
const RAW_FIXTURES: Record<string, unknown> = {
  "ana-and-ben": anaAndBen,
  "demo-gated": demoGated,
}

const FIXTURES: ReadonlyMap<string, TenantConfig> = new Map(
  Object.entries(RAW_FIXTURES).map(([slug, raw]) => {
    const parsed = tenantConfigSchema.safeParse(raw)
    if (!parsed.success) {
      throw new Error(
        `Fixture tenant "${slug}" fails the tenant-config schema:\n${parsed.error.message}`,
      )
    }
    if (parsed.data.site !== slug) {
      throw new Error(
        `Fixture tenant "${slug}" declares site="${parsed.data.site}" — keys must match`,
      )
    }
    return [slug, parsed.data]
  }),
)

export function isFixtureTenant(slug: string): boolean {
  return FIXTURES.has(slug)
}

export function fixtureSlugs(): string[] {
  return [...FIXTURES.keys()]
}

export function getFixtureConfig(slug: string): TenantConfig {
  const config = FIXTURES.get(slug)
  if (!config) {
    throw new Error(`No fixture tenant named "${slug}"`)
  }
  return config
}
