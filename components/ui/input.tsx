import type React from "react"
import { cn } from "@/lib/cn"

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full px-4 py-3 rounded-tenant border border-ink/20 bg-canvas text-ink placeholder:text-ink-muted font-light focus:outline-none focus:border-ink/40 transition-colors",
        className,
      )}
      {...props}
    />
  )
}
