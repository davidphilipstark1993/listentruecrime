'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Check, Minus, Plus, ShoppingBag } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'
import { MAX_LINE_QUANTITY } from '@/lib/shop/config'
import { formatGBP } from '@/lib/shop/money'
import type { PublicProduct } from '@/lib/shop/types'
import { basket } from './basket-store'

/** Colour / size / quantity picker. Only valid, purchasable variants can ever be added. */
export function PurchasePanel({ product, compact = false }: { product: PublicProduct; compact?: boolean }) {
  const firstBuyable = product.variants.find(v => v.purchasable) ?? product.variants[0]
  const [colour, setColour] = useState(firstBuyable?.colour ?? '')
  const [size, setSize] = useState(product.sizes.length === 1 ? product.sizes[0] : '')
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)

  const variant = useMemo(() => product.variants.find(v => v.colour === colour && v.size === size), [product.variants, colour, size])
  const sizesForColour = useMemo(() => product.variants.filter(v => v.colour === colour), [product.variants, colour])
  const singleSize = product.sizes.length === 1
  const showSize = !singleSize
  const showColour = product.colours.length > 1

  const price = variant?.pricePence ?? product.fromPricePence
  const canBuy = Boolean(variant?.purchasable)

  const add = () => {
    if (!variant?.purchasable) return
    basket.add(variant.id, qty)
    setAdded(true)
    toast.success(`${product.title} added to your basket`)
    setTimeout(() => setAdded(false), 2000)
  }

  return (
    <div className="space-y-6">
      <div>
        {price != null ? (
          <p className="font-serif text-3xl text-stone">
            {!variant && product.variants.some(v => v.purchasable) && <span className="mr-1 text-base text-stone-subtle">From</span>}
            {formatGBP(price)}
          </p>
        ) : (
          <p className="font-serif text-2xl text-stone-muted">Price to be confirmed</p>
        )}
        <p className="mt-1 text-xs text-stone-subtle">Prices in GBP. Delivery is calculated at the basket.</p>
      </div>

      {showColour && (
        <fieldset>
          <legend className="mb-2 text-xs font-semibold uppercase tracking-widest text-stone-muted">
            Colour <span className="ml-1 font-normal normal-case tracking-normal text-stone">{colour}</span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {product.colours.map(c => (
              <button
                key={c.name}
                type="button"
                onClick={() => { setColour(c.name); setSize(singleSize ? product.sizes[0] : '') }}
                aria-pressed={colour === c.name}
                aria-label={c.name}
                className={cn(
                  'h-9 w-9 rounded-full border-2 transition',
                  colour === c.name ? 'border-crimson ring-2 ring-crimson/30' : 'border-white/20 hover:border-white/50',
                )}
                style={{ background: c.hex ?? '#444' }}
              />
            ))}
          </div>
        </fieldset>
      )}

      {showSize && (
        <fieldset>
          <legend className="mb-2 text-xs font-semibold uppercase tracking-widest text-stone-muted">Size</legend>
          <div className="flex flex-wrap gap-2">
            {product.sizes.map(s => {
              const v = sizesForColour.find(x => x.size === s)
              const disabled = !v?.purchasable
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSize(s)}
                  aria-pressed={size === s}
                  className={cn(
                    'min-w-[3rem] rounded-md border px-3 py-2 text-sm transition',
                    size === s ? 'border-crimson bg-crimson/10 text-stone' : 'border-white/10 text-stone-muted hover:border-white/30 hover:text-stone',
                    disabled && size !== s && 'opacity-50',
                  )}
                >
                  {s}
                </button>
              )
            })}
          </div>
        </fieldset>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <div className="inline-flex items-center rounded-lg border border-white/10">
          <button type="button" aria-label="Decrease quantity" onClick={() => setQty(q => Math.max(1, q - 1))} className="p-3 text-stone-muted hover:text-stone"><Minus size={14} /></button>
          <span aria-live="polite" className="w-8 text-center text-sm tabular-nums">{qty}</span>
          <button type="button" aria-label="Increase quantity" onClick={() => setQty(q => Math.min(MAX_LINE_QUANTITY, q + 1))} className="p-3 text-stone-muted hover:text-stone"><Plus size={14} /></button>
        </div>

        <button
          type="button"
          onClick={add}
          disabled={!canBuy}
          className="btn-primary min-w-[12rem] flex-1 justify-center py-3.5 uppercase tracking-wider"
        >
          {added ? <><Check size={16} /> Added</> : <><ShoppingBag size={16} /> {canBuy ? 'Add to basket' : product.purchasable ? (showSize && !size ? 'Select a size' : 'Unavailable') : 'Coming soon'}</>}
        </button>
      </div>

      {added && !compact && (
        <p className="text-sm text-stone-muted">
          <Link href="/shop/basket" className="text-crimson hover:underline">View your basket</Link> or keep browsing.
        </p>
      )}
      {!product.purchasable && (
        <p className="rounded-lg border border-white/10 bg-ink-800 p-3 text-xs text-stone-muted">
          This design is on its way. Subscribe to the newsletter below and we will tell you when it is ready to order.
        </p>
      )}
    </div>
  )
}
