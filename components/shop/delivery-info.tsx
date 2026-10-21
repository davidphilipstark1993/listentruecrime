import Link from 'next/link'
import { Package, RotateCcw, ShieldCheck, Truck } from 'lucide-react'
import { DELIVERY_ESTIMATE, DELIVERY_SUMMARY, RETURNS_SUMMARY } from '@/lib/shop/copy'

export function DeliveryInfo({ variant = 'full' }: { variant?: 'full' | 'strip' }) {
  if (variant === 'strip') {
    const items = [
      { icon: Package, title: 'Printed to order', body: 'Made after you buy, so nothing sits in a warehouse.' },
      { icon: Truck, title: 'UK delivery', body: 'Tracked updates by email once dispatched.' },
      { icon: ShieldCheck, title: 'Secure payment', body: 'Paid through Stripe. We never see your card.' },
      { icon: RotateCcw, title: 'Fair returns', body: 'Faulty or misprinted? We will put it right.' },
    ]
    return (
      <section aria-labelledby="delivery-info" className="border-y border-white/[0.06] bg-ink-900">
        <h2 id="delivery-info" className="sr-only">Delivery information</h2>
        <ul className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
          {items.map(i => (
            <li key={i.title} className="flex gap-3">
              <i.icon size={20} className="mt-0.5 shrink-0 text-crimson" strokeWidth={1.5} />
              <div><p className="text-sm font-semibold text-stone">{i.title}</p><p className="mt-1 text-xs text-stone-muted">{i.body}</p></div>
            </li>
          ))}
        </ul>
        <p className="pb-8 text-center text-xs text-stone-subtle">
          <Link href="/shop/shipping-policy" className="hover:text-stone underline">Shipping policy</Link> · <Link href="/shop/returns-and-refunds" className="hover:text-stone underline">Returns and refunds</Link>
        </p>
      </section>
    )
  }
  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-stone"><Truck size={15} className="text-crimson" /> Delivery</h3>
        <ul className="space-y-1.5 text-sm text-stone-muted">
          {DELIVERY_ESTIMATE && <li>{DELIVERY_ESTIMATE}</li>}
          {DELIVERY_SUMMARY.map(l => <li key={l}>{l}</li>)}
        </ul>
        <Link href="/shop/shipping-policy" className="mt-2 inline-block text-xs text-crimson hover:underline">Shipping policy</Link>
      </div>
      <div>
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-stone"><RotateCcw size={15} className="text-crimson" /> Returns</h3>
        <ul className="space-y-1.5 text-sm text-stone-muted">{RETURNS_SUMMARY.map(l => <li key={l}>{l}</li>)}</ul>
        <Link href="/shop/returns-and-refunds" className="mt-2 inline-block text-xs text-crimson hover:underline">Returns and refunds policy</Link>
      </div>
    </div>
  )
}
