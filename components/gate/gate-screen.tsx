"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

/**
 * The password gate screen (live :1654-1702): full-screen background video,
 * black/40 overlay, script-font names, frosted-glass input + button, 1s
 * fade+rise entrance.
 *
 * Unlike the live site's cosmetic client-side check, this POSTs to
 * /api/gate/login — the server sets the HMAC cookie and the layout re-renders
 * the real site. Wrong password shows a visible error (the live gate failed
 * silently; that was a UX bug, not a feature).
 *
 * Video autoplay handling is live PR #20 verbatim: mobile browsers require
 * muted-at-play()-time, React's muted prop isn't reliably reflected to the
 * DOM, and iOS Low Power Mode blocks autoplay outright — so mute + play()
 * imperatively, retry on canplay, and fall back to the first user gesture.
 */
export function GateScreen({
  slug,
  coupleNames,
  videoUrl,
  prompt,
  placeholder,
  submitLabel,
  errorMessage,
}: {
  slug: string
  coupleNames: string
  videoUrl?: string
  prompt: string
  placeholder: string
  submitLabel: string
  errorMessage: string
}) {
  const [password, setPassword] = useState("")
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle")
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    video.muted = true
    video.defaultMuted = true

    const tryPlay = () => {
      const playPromise = video.play()
      if (playPromise !== undefined) {
        playPromise.catch(() => {})
      }
    }

    tryPlay()
    video.addEventListener("canplay", tryPlay)

    const gestureEvents = ["pointerdown", "touchstart", "click", "keydown"] as const
    const startOnGesture = () => {
      tryPlay()
      gestureEvents.forEach((evt) => document.removeEventListener(evt, startOnGesture))
    }
    gestureEvents.forEach((evt) =>
      document.addEventListener(evt, startOnGesture, { passive: true }),
    )

    return () => {
      video.removeEventListener("canplay", tryPlay)
      gestureEvents.forEach((evt) => document.removeEventListener(evt, startOnGesture))
    }
  }, [videoUrl])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (status === "submitting") return
    setStatus("submitting")
    try {
      const res = await fetch("/api/gate/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, slug }),
      })
      if (res.ok) {
        // Cookie is set; reload so the server layout renders the site.
        window.location.reload()
        return
      }
      setStatus("error")
    } catch {
      setStatus("error")
    }
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden bg-ink">
      <div className="absolute inset-0 z-0">
        {videoUrl ? (
          <video
            ref={videoRef}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            className="w-full h-full object-cover"
          >
            <source src={videoUrl} type="video/mp4" />
          </video>
        ) : null}
        <div className="absolute inset-0 bg-black/40" />
      </div>

      <div className="relative z-10 max-w-md w-full space-y-8 animate-fade-rise">
        <div className="text-center space-y-6">
          <div className="space-y-2">
            <h1 className="font-display text-white tracking-wide text-7xl">{coupleNames}</h1>
            <div className="w-24 h-px bg-white/60 mx-auto" aria-hidden />
          </div>
          <p className="text-white/90 text-sm leading-relaxed">{prompt}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              if (status === "error") setStatus("idle")
            }}
            placeholder={placeholder}
            autoComplete="current-password"
            className="text-center border-white/30 focus:border-white/60 bg-white/10 backdrop-blur-sm text-white placeholder:text-white/60"
          />
          {status === "error" ? (
            <p className="text-center text-sm text-white/90 bg-black/30 backdrop-blur-sm py-2 px-3">
              {errorMessage}
            </p>
          ) : null}
          <Button type="submit" variant="ghost" className="w-full" disabled={status === "submitting"}>
            {submitLabel}
          </Button>
        </form>
      </div>
    </div>
  )
}
