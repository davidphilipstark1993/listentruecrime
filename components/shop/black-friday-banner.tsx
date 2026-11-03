// Black Friday 2026 announcement on the shop home page. The BF26- campaign stops working at
// 2026-12-01T00:00:00Z, so the banner hides itself at the same moment (shop layout revalidates
// every 5 minutes).
const BF_ENDS = Date.parse('2026-12-01T00:00:00Z')

export function BlackFridayBanner() {
  if (Date.now() >= BF_ENDS) return null
  return (
    <aside aria-label="Black Friday offer" className="border-b border-crimson/30 bg-crimson/10 px-4 py-3 text-center">
      <p className="text-sm text-stone">
        <span className="font-semibold uppercase tracking-widest text-crimson">Black Friday</span>
        <span className="mx-2 text-stone-subtle" aria-hidden="true">·</span>
        30% off all merch with code{' '}
        <code className="rounded border border-white/10 bg-ink-800 px-2 py-0.5 font-semibold tracking-wider text-stone">BF26-BLACKFRIDAY</code>
        <span className="text-stone-muted"> at checkout. Offer ends 1 December.</span>
      </p>
    </aside>
  )
}
