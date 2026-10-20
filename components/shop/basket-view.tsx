'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Loader2, Lock, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { MAX_LINE_QUANTITY } from '@/lib/shop/config'
import { DELIVERY_ESTIMATE } from '@/lib/shop/copy'
import { formatGBP } from '@/lib/shop/money'
import { basket, useBasket } from './basket-store'
import { PlaceholderArt } from './product-image'

interface QuoteLine {
  variantId: string; productSlug: string; title: string; imageUrl: string | null
  colour: string; size: string; quantity: number; unitPricePence: number; linePence: number
}
interface Quote {
  lines: QuoteLine[]
  problems: { variantId: string; reason: string }[]
  subtotalPence: number
  shippingPence: number | null
  shippingError: string | null
  totalPence: number | null
}

export function BasketView({ checkoutOpen }: { checkoutOpen: boolean }) {
  const { items } = useBasket()
  const params = useSearchParams()
  const [quote, setQuote] = useState<Quote | null>(null)
  const [loading, setLoading] = useState(false)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const seq = useRef(0)

  // Re-price on the server whenever the basket changes (debounced). The browser
  // only ever sends variant ids and quantities.
  useEffect(() => {
    if (!items.length) { setQuote(null); return }
    const id = ++seq.current
    setLoading(true)
    const t = setTimeout(async () => {
      try {
        const res = await fetch('/api/shop/quote', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items }),
        })
        if (!res.ok) throw new Error('quote failed')
        const data = (await res.json()) as Quote
        if (id === seq.current) { setQuote(data); setError(null) }
      } catch {
        if (id === seq.current) setError('We could not load your basket prices. Please refresh and try again.')
      } finally {
        if (id === seq.current) setLoading(false)
      }
    }, 250)
    return () => clearTimeout(t)
  }, [items])

  // Drop lines the server says are no longer sold, so the basket never gets stuck.
  const removeUnavailable = useCallback(() => {
    quote?.problems.forEach(p => p.variantId && basket.remove(p.variantId))
  }, [quote])

  const checkout = async () => {
    setPaying(true)
    setError(null)
    try {
      const res = await fetch('/api/shop/checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.url) throw new Error(data.error ?? 'Checkout could not be started.')
      window.location.assign(data.url) // Stripe-hosted checkout
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Checkout could not be started.'
      setError(msg)
      toast.error(msg)
      setPaying(false)
    }
  }

  if (!items.length) {
    return (
      <div className="rounded-xl border border-white/[0.06] bg-ink-800 px-6 py-16 text-center">
        <ShoppingBag size={36} className="mx-auto text-stone-subtle" strokeWidth={1.25} />
        <h2 className="mt-4 font-serif text-2xl text-stone">Your basket is empty</h2>
        <p className="mt-2 text-sm text-stone-muted">The evidence won&apos;t collect itself.</p>
        <Link href="/shop" className="btn-primary mt-6 uppercase tracking-wider">Explore the collection</Link>
      </div>
    )
  }

  const canPay = checkoutOpen && quote && quote.lines.length > 0 && quote.problems.length === 0 && quote.totalPence != null && !loading

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
      <div>
        {params.get('cancelled') && (
          <p className="mb-4 rounded-lg border border-white/10 bg-ink-800 p-3 text-sm text-stone-muted">Checkout was cancelled — nothing has been charged. Your basket is still here.</p>
        )}
        {quote?.problems.length ? (
          <div role="alert" className="mb-4 rounded-lg border border-crimson/30 bg-crimson/10 p-4 text-sm text-stone">
            <ul className="list-disc space-y-1 pl-5">{quote.problems.map((p, i) => <li key={i}>{p.reason}</li>)}</ul>
            <button onClick={removeUnavailable} className="mt-3 text-crimson underline">Remove unavailable items</button>
          </div>
        ) : null}

        <ul className="divide-y divide-white/[0.06] rounded-xl border border-white/[0.06] bg-ink-800">
          {(quote?.lines ?? []).map(l => (
            <li key={l.variantId} className="flex gap-4 p-4">
              <Link href={`/shop/${l.productSlug}`} className="relative h-24 w-20 shrink-0 overflow-hidden rounded-md bg-ink-700">
                {l.imageUrl ? <Image src={l.imageUrl} alt={l.title} fill sizes="80px" className="object-cover" /> : <PlaceholderArt category="t-shirts" label={l.title} className="[&_span]:hidden" />}
              </Link>
              <div className="flex min-w-0 flex-1 flex-col">
                <Link href={`/shop/${l.productSlug}`} className="font-serif text-stone hover:text-crimson">{l.title}</Link>
                <p className="mt-0.5 text-xs text-stone-muted">{l.colour} · {l.size}</p>
                <p className="mt-0.5 text-xs text-stone-subtle">{formatGBP(l.unitPricePence)} each</p>
                <div className="mt-auto flex items-center justify-between pt-3">
                  <div className="inline-flex items-center rounded-md border border-white/10">
                    <button aria-label={`Decrease quantity of ${l.title}`} onClick={() => basket.setQuantity(l.variantId, l.quantity - 1)} className="p-2 text-stone-muted hover:text-stone"><Minus size={13} /></button>
                    <span className="w-7 text-center text-sm tabular-nums">{l.quantity}</span>
                    <button aria-label={`Increase quantity of ${l.title}`} disabled={l.quantity >= MAX_LINE_QUANTITY} onClick={() => basket.setQuantity(l.variantId, l.quantity + 1)} className="p-2 text-stone-muted hover:text-stone disabled:opacity-30"><Plus size={13} /></button>
                  </div>
                  <button aria-label={`Remove ${l.title}`} onClick={() => basket.remove(l.variantId)} className="p-2 text-stone-subtle hover:text-crimson"><Trash2 size={15} /></button>
                </div>
              </div>
              <p className="text-sm tabular-nums text-stone">{formatGBP(l.linePence)}</p>
            </li>
          ))}
          {!quote && loading && <li className="p-8 text-center text-sm text-stone-muted"><Loader2 className="mx-auto animate-spin" size={18} /></li>}
        </ul>
      </div>

      <aside className="h-fit rounded-xl border border-white/[0.06] bg-ink-800 p-5 lg:sticky lg:top-24">
        <h2 className="font-serif text-xl text-stone">Order summary</h2>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between"><dt className="text-stone-muted">Subtotal</dt><dd className="tabular-nums">{quote ? formatGBP(quote.subtotalPence) : '—'}</dd></div>
          <div className="flex justify-between"><dt className="text-stone-muted">Delivery (UK)</dt><dd className="tabular-nums">{quote?.shippingPence != null ? formatGBP(quote.shippingPence) : '—'}</dd></div>
          <div className="flex justify-between border-t border-white/[0.06] pt-3 text-base"><dt>Total</dt><dd className="font-semibold tabular-nums">{quote?.totalPence != null ? formatGBP(quote.totalPence) : '—'}</dd></div>
        </dl>
        {quote?.shippingError && <p className="mt-3 text-xs text-crimson">{quote.shippingError}</p>}
        {error && <p role="alert" className="mt-3 text-xs text-crimson">{error}</p>}
        <p className="mt-3 text-xs text-stone-subtle">
          Delivery is charged at the supplier&apos;s actual rate for the items in your basket. {DELIVERY_ESTIMATE ?? 'Items are printed to order; tracking is emailed when your order is dispatched.'}
        </p>

        <button onClick={checkout} disabled={!canPay || paying} className="btn-primary mt-5 w-full justify-center py-3.5 uppercase tracking-wider">
          {paying ? <Loader2 size={16} className="animate-spin" /> : <Lock size={15} />} {checkoutOpen ? 'Secure checkout' : 'Checkout opens soon'}
        </button>
        <p className="mt-3 text-center text-2xs text-stone-subtle">Pay securely with Stripe. Card, Apple Pay and Google Pay where available. We never see your card details.</p>
      </aside>
    </div>
  )
}
