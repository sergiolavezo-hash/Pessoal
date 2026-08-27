export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      <div className="auth-grid pointer-events-none absolute inset-0" aria-hidden />
      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 text-center">
          <a href="https://atlas-partner.com" className="inline-flex items-baseline gap-2">
            <span className="font-display text-2xl font-extrabold tracking-tight text-ink">
              ATLAS<span className="text-accent">.</span>
            </span>
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-ink-muted">
              Insight AI
            </span>
          </a>
        </div>
        {children}
        <p className="mt-8 text-center text-xs text-ink-dim">
          © {new Date().getFullYear()} Atlas Tecnologia ·{" "}
          <a href="https://atlas-partner.com" className="underline hover:text-accent">
            atlas-partner.com
          </a>
        </p>
      </div>
    </main>
  );
}
