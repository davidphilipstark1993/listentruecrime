'use client'
import Link from 'next/link'
import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Eye, X } from 'lucide-react'
import { formatGBP } from '@/lib/shop/money'
import type { PublicProduct } from '@/lib/shop/types'
import { ProductImage } from './product-image'
import { PurchasePanel } from './purchase-panel'

export function ProductCard({ product, priority = false }: { product: PublicProduct; priority?: boolean }) {
  const [open, setOpen] = useState(false)
  const href = `/shop/${product.slug}`

  return (
    <article className="group relative flex flex-col">
      <Link href={href} className="relative block aspect-[4/5] overflow-hidden rounded-lg border border-white/[0.06] bg-ink-800 transition-all duration-300 group-hover:border-white/20 group-hover:shadow-card-hover">
        <div className="absolute inset-0 transition-transform duration-500 group-hover:scale-[1.04]">
          <ProductImage product={product} sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw" priority={priority} />
        </div>
        <div className="absolute left-3 top-3 flex flex-col gap-1.5">
          {!product.purchasable && <span className="tag bg-ink-950/80 backdrop-blur">Coming soon</span>}
          {product.isNew && <span className="tag-crimson bg-ink-950/80 backdrop-blur">New</span>}
          {product.isBestSeller && <span className="tag bg-ink-950/80 backdrop-blur">Best seller</span>}
        </div>
      </Link>

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-ink-950/85 p-2 text-xs text-stone opacity-100 backdrop-blur transition hover:bg-crimson sm:px-3 sm:py-1.5 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
        aria-label={`Quick view ${product.title}`}
      >
        <Eye size={12} /> <span className="hidden sm:inline">Quick view</span>
      </button>

      <div className="mt-4 flex-1">
        <h3 className="font-serif text-lg leading-snug text-stone">
          <Link href={href} className="hover:text-crimson transition-colors">{product.title}</Link>
        </h3>
        <p className="mt-1 text-sm text-stone-muted">
          {product.fromPricePence != null ? formatGBP(product.fromPricePence) : 'Price to be confirmed'}
        </p>
        {product.colours.length > 0 && (
          <div className="mt-2 flex items-center gap-1.5" aria-label={`Available colours: ${product.colours.map(c => c.name).join(', ')}`}>
            {product.colours.map(c => (
              <span key={c.name} title={c.name} className="h-3.5 w-3.5 rounded-full border border-white/25" style={{ background: c.hex ?? '#444' }} />
            ))}
          </div>
        )}
      </div>

      <button type="button" onClick={() => setOpen(true)} className="btn-outline mt-4 w-full justify-center uppercase tracking-wider text-xs">
        {product.purchasable ? 'Add to basket' : 'View details'}
      </button>

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm animate-fade-in" />
          <Dialog.Content className="fixed inset-x-4 top-1/2 z-[61] mx-auto max-h-[90vh] max-w-3xl -translate-y-1/2 overflow-auto rounded-xl border border-white/10 bg-ink-900 p-5 shadow-card-hover sm:p-8">
            <Dialog.Close className="absolute right-4 top-4 rounded-md p-1.5 text-stone-muted hover:bg-ink-700 hover:text-stone" aria-label="Close quick view"><X size={18} /></Dialog.Close>
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-ink-800">
                <ProductImage product={product} sizes="(min-width: 640px) 360px, 90vw" />
              </div>
              <div>
                <Dialog.Title className="font-serif text-2xl text-stone">{product.title}</Dialog.Title>
                <Dialog.Description className="mt-2 text-sm text-stone-muted">{product.shortDescription}</Dialog.Description>
                <div className="mt-5"><PurchasePanel product={product} compact /></div>
                <Link href={href} className="mt-5 inline-block text-sm text-crimson hover:underline">Full details, size guide and delivery →</Link>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </article>
  )
}
