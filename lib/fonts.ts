import { FONT_WHITELIST } from "@/lib/config-schema"

/**
 * Self-hosted OFL font registry (addendum Q18).
 *
 * Per-tenant fonts CANNOT use next/font — it is build-time and cannot vary
 * per request. Instead the tenant layout emits @font-face rules for exactly
 * the fonts that tenant's theme uses, pointing at files committed under
 * public/fonts/ (each directory carries its OFL.txt license).
 *
 * Symphony Pro is commercial and must never appear here (HANDOFF §6).
 */

type FontFace = {
  /** Path under public/ */
  src: string
  weight: string // CSS font-weight value or range (variable fonts)
  style: "normal" | "italic"
}

export type FontDef = {
  family: (typeof FONT_WHITELIST)[number]
  faces: FontFace[]
  fallback: string
}

export const FONTS: Record<(typeof FONT_WHITELIST)[number], FontDef> = {
  "Great Vibes": {
    family: "Great Vibes",
    faces: [
      { src: "/fonts/great-vibes/GreatVibes-Regular.woff2", weight: "400", style: "normal" },
    ],
    fallback: "cursive",
  },
  Allura: {
    family: "Allura",
    faces: [{ src: "/fonts/allura/Allura-Regular.woff2", weight: "400", style: "normal" }],
    fallback: "cursive",
  },
  "Pinyon Script": {
    family: "Pinyon Script",
    faces: [
      { src: "/fonts/pinyon-script/PinyonScript-Regular.woff2", weight: "400", style: "normal" },
    ],
    fallback: "cursive",
  },
  "Cormorant Garamond": {
    family: "Cormorant Garamond",
    faces: [
      {
        src: "/fonts/cormorant-garamond/CormorantGaramond-wght.woff2",
        weight: "300 700",
        style: "normal",
      },
      {
        src: "/fonts/cormorant-garamond/CormorantGaramond-Italic-wght.woff2",
        weight: "300 700",
        style: "italic",
      },
    ],
    fallback: "Georgia, serif",
  },
}

/** @font-face CSS for one font family. */
function fontFaceCss(def: FontDef): string {
  return def.faces
    .map(
      (face) => `@font-face {
  font-family: '${def.family}';
  src: url('${face.src}') format('woff2');
  font-weight: ${face.weight};
  font-style: ${face.style};
  font-display: swap;
}`,
    )
    .join("\n")
}

/**
 * The @font-face block for a tenant: exactly the display + body fonts its
 * theme selects, deduplicated. Rendered into a <style> tag by the tenant
 * layout.
 */
export function tenantFontCss(
  fontDisplay: (typeof FONT_WHITELIST)[number],
  fontBody: (typeof FONT_WHITELIST)[number],
): string {
  const families = fontDisplay === fontBody ? [fontDisplay] : [fontDisplay, fontBody]
  return families.map((f) => fontFaceCss(FONTS[f])).join("\n")
}

export function fontStack(family: (typeof FONT_WHITELIST)[number]): string {
  return `'${FONTS[family].family}', ${FONTS[family].fallback}`
}
