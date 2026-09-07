"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/cn"

export type NavItem = { id: string; label: string }

/**
 * Fixed nav (live :1708-1794): transparent over the hero, white/blur with a
 * hairline border after one viewport of scroll; script-font monogram;
 * mobile = hamburger → right slide-in drawer + scrim.
 * Items are config-driven — only sections present in the tenant's config
 * appear (computed server-side in page.tsx).
 */
export function Nav({
  monogram,
  items,
  openLabel,
  closeLabel,
}: {
  monogram: string
  items: NavItem[]
  openLabel: string
  closeLabel: string
}) {
  const [scrolled, setScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > window.innerHeight)
    }
    handleScroll()
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const scrollToSection = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth" })
    setIsMobileMenuOpen(false)
  }

  return (
    <>
      <nav
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
          scrolled ? "bg-canvas/95 backdrop-blur-sm border-b border-ink/5" : "bg-transparent",
        )}
      >
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div
              className={cn(
                "font-display text-2xl tracking-wide transition-colors duration-300",
                scrolled ? "text-ink" : "text-white",
              )}
            >
              {monogram}
            </div>
            <div className="hidden md:flex space-x-8">
              {items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className={cn(
                    "font-light tracking-wide transition-colors duration-300",
                    scrolled ? "text-ink hover:text-ink-muted" : "text-white hover:text-white/80",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={cn(
                "md:hidden z-50 transition-colors duration-300",
                scrolled || isMobileMenuOpen ? "text-ink" : "text-white",
              )}
              aria-label={isMobileMenuOpen ? closeLabel : openLabel}
              aria-expanded={isMobileMenuOpen}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {isMobileMenuOpen ? <path d="M6 18L18 6M6 6l12 12" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {isMobileMenuOpen ? (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden
        />
      ) : null}

      <div
        className={cn(
          "fixed top-0 right-0 h-full w-64 bg-canvas z-50 transform transition-transform duration-300 ease-in-out md:hidden",
          isMobileMenuOpen ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex flex-col pt-20 px-6 space-y-6">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => scrollToSection(item.id)}
              className="text-left font-light text-lg text-ink hover:text-ink-muted transition-colors"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}
