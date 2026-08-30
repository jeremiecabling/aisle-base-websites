import type { Theme } from "@/lib/config-schema"
import { fontStack } from "@/lib/fonts"

/**
 * Theme row → CSS custom properties.
 *
 * Every section component styles itself exclusively through these variables
 * (never stone-* literals — HANDOFF §7.1). The tenant layout renders the
 * result inside <style>:root{...}</style> so a theme change in the admin
 * sheet restyles the whole site with zero code changes.
 */
export function themeToCssVars(theme: Theme): string {
  const vars: Record<string, string> = {
    "--accent": theme.accent_hex,
    "--bg": theme.bg,
    "--bg-alt": theme.bg_alt,
    "--text": theme.text,
    "--text-muted": theme.text_muted,
    "--button-bg": theme.button_bg,
    "--radius": `${theme.radius}px`,
    "--font-display": fontStack(theme.font_display),
    "--font-body": fontStack(theme.font_body),
  }
  return Object.entries(vars)
    .map(([k, v]) => `${k}: ${v};`)
    .join(" ")
}

export function tenantThemeStyle(theme: Theme): string {
  return `:root { ${themeToCssVars(theme)} }
body { background: var(--bg); color: var(--text); font-family: var(--font-body); }`
}
