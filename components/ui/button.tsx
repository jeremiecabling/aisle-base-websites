import type React from "react"
import { cn } from "@/lib/cn"

/**
 * The live design's button: solid dark fill, light weight, square by default
 * (radius comes from the tenant theme token). Ghost variant is the gate's
 * frosted-glass style.
 */
type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "solid" | "ghost"
}

export function Button({ className, variant = "solid", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center px-4 py-3 font-light tracking-wider rounded-tenant transition-all duration-300 disabled:opacity-50 disabled:pointer-events-none",
        variant === "solid" && "bg-button text-white hover:opacity-90",
        variant === "ghost" &&
          "bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur-sm",
        className,
      )}
      {...props}
    />
  )
}

/** Anchor styled as a button — for booking / registry CTAs. */
export function ButtonLink({
  className,
  href,
  children,
}: {
  className?: string
  href: string
  children: React.ReactNode
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center justify-center px-4 py-3 font-light tracking-wider rounded-tenant transition-all duration-300 bg-button text-white hover:opacity-90",
        className,
      )}
    >
      {children}
    </a>
  )
}
