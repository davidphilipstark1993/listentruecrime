'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Loader2, Lock, Minus, Plus, ShoppingBag, Tag, Trash2, X } from 'lucide-react'
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
  discount: { code: string; percent: number; pence: number } | null
  discountError: string | null
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
  // The code the customer typed vs. the code being priced. Only one code can ever be applied.
  const [codeInput, setCodeInput] = useState('')
  const [appliedCode, setAppliedCode] = useState<string | null>(null)

  // Arrive from an email link such as /shop/basket?code=REF-XXXX and the code is applied for them.
  const urlCode = params.get('code')
  useEffect(() => {
    if (urlCode) { setCodeInput(urlCode); setAppliedCode(urlCode) }
  }, [urlCode])

  // Re-price on the server whenever the basket changes (debounced). The browser
  // only ever sends variant ids and quantities.
  useEffect(() => {
    if (!items.length) { setQuote(null); return }
    const id = ++seq.current
    setLoading(true)
    const t = setTimeout(async () => {
      try {
        const res = await fetch('/api/shop/quote', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items, code: appliedCode }),
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
  }, [items, appliedCode])

  // Drop lines the server says are no longer sold, so the basket never gets stuck.
  const removeUnavailable = useCallback(() => {
    quote?.problems.forEach(p => p.variantId && basket.remove(p.variantId))
  }, [quote])

  const checkout = async () => {
    setPaying(true)
    setError(null)
    try {
      const res = await fetch('/api/shop/checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items, code: quote?.discount ? appliedCode : null }),
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

  const applyCode = (e: React.FormEvent) => {
    e.preventDefault()
    const next = codeInput.trim()
    if (next) setAppliedCode(next)
  }
  const removeCode = () => { setAppliedCode(null); setCodeInput('') }

  // A code that was entered but is invalid blocks payment until it is fixed or removed,
  // so nobody is charged a price they didn't expect.
  const canPay = checkoutOpen && quote && quote.lines.length > 0 && quote.problems.length === 0 && quote.totalPence != null && !loading && !quote.discountError

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
          {quote?.discount && (
            <div className="flex justify-between text-emerald-400"><dt>Discount ({quote.discount.percent}% off)</dt><dd className="tabular-nums">-{formatGBP(quote.discount.pence)}</dd></div>
          )}
          <div className="flex justify-between"><dt className="text-stone-muted">Delivery (UK)</dt><dd className="tabular-nums">{quote?.shippingPence != null ? formatGBP(quote.shippingPence) : '—'}</dd></div>
          <div className="flex justify-between border-t border-white/[0.06] pt-3 text-base"><dt>Total</dt><dd className="font-semibold tabular-nums">{quote?.totalPence != null ? formatGBP(quote.totalPence) : '—'}</dd></div>
        </dl>
        {quote?.shippingError && <p className="mt-3 text-xs text-crimson">{quote.shippingError}</p>}

        <div className="mt-4 border-t border-white/[0.06] pt-4">
          {quote?.discount ? (
            <div className="flex items-center justify-between rounded-md border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-sm">
              <span className="flex items-center gap-2 text-stone"><Tag size={14} className="text-emerald-400" /> <span className="font-mono text-xs">{quote.discount.code}</span></span>
              <button type="button" onClick={removeCode} aria-label="Remove discount code" className="text-stone-subtle hover:text-crimson"><X size={14} /></button>
            </div>
          ) : (
            <form onSubmit={applyCode} noValidate>
              <label htmlFor="discount-code" className="mb-1 block text-xs font-medium text-stone-muted">Discount code</label>
              <div className="flex gap-2">
                <input
                  id="discount-code"
                  value={codeInput}
                  onChange={e => setCodeInput(e.target.value)}
                  placeholder="e.g. REF-AB12CD34"
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  aria-describedby={quote?.discountError ? 'discount-code-error' : undefined}
                  aria-invalid={quote?.discountError ? true : undefined}
                  className="input-base flex-1 font-mono text-sm uppercase"
                />
                <button type="submit" disabled={!codeInput.trim() || loading} className="btn-outline px-4 text-sm">Apply</button>
              </div>
              {quote?.discountError && (
                <p id="discount-code-error" role="alert" className="mt-2 text-xs text-crimson">
                  {quote.discountError}{' '}
                  {appliedCode && <button type="button" onClick={removeCode} className="underline">Clear</button>}
                </p>
              )}
              <p className="mt-2 text-2xs text-stone-subtle">One code per order. Discounts apply to products, not delivery.</p>
            </form>
          )}
        </div>
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
