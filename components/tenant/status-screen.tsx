/**
 * Guest-facing screen for paused/expired tenants (HANDOFF §7.4: term
 * enforcement is automatic — status flips in the admin sheet, this renders).
 * Contact line uses the COUPLE's contact (Q23a), shown for paused sites
 * where guests may genuinely need to reach someone; expired sites just rest.
 */
export function StatusScreen({
  heading,
  body,
  contactLine,
}: {
  heading: string
  body: string
  contactLine?: string
}) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-canvas px-6">
      <div className="text-center space-y-6 max-w-md">
        <h1 className="text-3xl font-body text-ink">{heading}</h1>
        <div className="w-16 h-px bg-accent mx-auto" aria-hidden />
        <p className="text-ink-muted font-light leading-relaxed">{body}</p>
        {contactLine ? <p className="text-ink-muted font-light text-sm">{contactLine}</p> : null}
      </div>
    </main>
  )
}
