import type { Metadata } from "next"
import type React from "react"
import "./globals.css"

// Bare shell only. Tenant sites get their fonts, theme variables, and
// metadata from app/s/[site]/layout.tsx; the apex pages use the :root
// defaults in globals.css.
export const metadata: Metadata = {
  title: "Aisle Base — Custom Wedding Websites",
  description:
    "Beautifully designed, personally managed wedding websites. You share your story; we handle everything else.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
