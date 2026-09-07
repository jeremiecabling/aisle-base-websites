export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-canvas px-6">
      <div className="text-center space-y-6 max-w-md">
        <h1 className="text-3xl font-body text-ink">Nothing here</h1>
        <div className="w-16 h-px bg-accent mx-auto" aria-hidden />
        <p className="text-ink-muted font-light leading-relaxed">
          There&apos;s no wedding website at this address.
        </p>
      </div>
    </main>
  )
}
