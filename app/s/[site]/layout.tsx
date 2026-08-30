import type { Metadata } from "next"
import type React from "react"
import { notFound } from "next/navigation"
import { cookies } from "next/headers"
import { GateScreen } from "@/components/gate/gate-screen"
import { StatusScreen } from "@/components/tenant/status-screen"
import { chrome } from "@/lib/chrome"
import { getTenantConfig } from "@/lib/config"
import { gateCookieName, isValidGateToken } from "@/lib/gate-token"
import { tenantFontCss } from "@/lib/fonts"
import { tenantThemeStyle } from "@/lib/theme"

/**
 * The tenant boundary. Everything cross-cutting happens here, per HANDOFF
 * §7.4's Next contract:
 * - config fetch + validation (via lib/config.ts — fail loudly)
 * - status enforcement: paused/expired render a status screen, never the
 *   site. `staging` renders normally — it exists so a couple can preview
 *   before flipping to active (noindex covers it; see docs/DECISIONS.md).
 * - password gate: server-side cookie check; the gate screen REPLACES the
 *   children (no redirect, no flash of content, nothing gated reaches the
 *   client — the live site's client-side gate was cosmetic, HANDOFF §5 bug 7)
 * - per-tenant theme CSS variables + @font-face for exactly its two fonts
 * - metadata from Basics; ALL tenant pages are noindex (Q15)
 */

type LayoutProps = {
  children: React.ReactNode
  params: Promise<{ site: string }>
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ site: string }>
}): Promise<Metadata> {
  const { site } = await params
  const config = await getTenantConfig(site).catch(() => null)
  const basics = config?.content.basics
  return {
    title: basics ? `${basics.couple_names} | ${basics.wedding_date_display}` : "Wedding",
    description: basics?.hero_tagline ?? undefined,
    robots: { index: false, follow: false },
  }
}

export default async function TenantLayout({ children, params }: LayoutProps) {
  const { site } = await params
  const config = await getTenantConfig(site)
  if (!config) notFound()

  const themedShell = (inner: React.ReactNode) => (
    <>
      <style dangerouslySetInnerHTML={{ __html: tenantFontCss(config.theme.font_display, config.theme.font_body) }} />
      <style dangerouslySetInnerHTML={{ __html: tenantThemeStyle(config.theme) }} />
      {inner}
    </>
  )

  const content = config.content

  if (config.status === "expired") {
    return themedShell(
      <StatusScreen
        heading={chrome(content, "expired_heading")}
        body={chrome(content, "expired_body")}
      />,
    )
  }

  if (config.status === "paused") {
    const contactBits = [config.contact.name, config.contact.phone].filter(Boolean).join(" · ")
    return themedShell(
      <StatusScreen
        heading={chrome(content, "paused_heading")}
        body={chrome(content, "paused_body")}
        contactLine={contactBits ? `${chrome(content, "locked_contact_prefix")} ${contactBits}` : undefined}
      />,
    )
  }

  const gateActive = config.entitlements.password_gate && config.gate?.enabled === true
  if (gateActive && config.gate) {
    const cookieStore = await cookies()
    const token = cookieStore.get(gateCookieName(config.site))?.value
    const authorized = token
      ? await isValidGateToken(token, config.site, config.gate.password_version)
      : false

    if (!authorized) {
      return themedShell(
        <GateScreen
          slug={config.site}
          coupleNames={content.basics.couple_names}
          videoUrl={content.basics.gate_video_url}
          prompt={chrome(content, "gate_prompt")}
          placeholder={chrome(content, "gate_placeholder")}
          submitLabel={chrome(content, "gate_submit")}
          errorMessage={chrome(content, "gate_error")}
        />,
      )
    }
  }

  return themedShell(children)
}
