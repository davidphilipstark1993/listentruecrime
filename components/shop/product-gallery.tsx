'use client'
import { useState } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import type { PublicProduct } from '@/lib/shop/types'
import { PlaceholderArt } from './product-image'

export function ProductGallery({ product }: { product: Pick<PublicProduct, 'title' | 'category' | 'images'> }) {
  const real = product.images.filter(i => !i.placeholder)
  const [active, setActive] = useState(0)

  if (!real.length) {
    return <div className="relative aspect-[4/5] overflow-hidden rounded-xl border border-white/[0.06]"><PlaceholderArt category={product.category} label={product.title} /></div>
  }
  const current = real[active] ?? real[0]
  return (
    <div className="space-y-3">
      <div className="relative aspect-[4/5] overflow-hidden rounded-xl border border-white/[0.06] bg-ink-800">
        <Image key={current.url} src={current.url} alt={current.alt || product.title} fill priority sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover animate-fade-in" />
      </div>
      {real.length > 1 && (
        <ul className="grid grid-cols-5 gap-2">
          {real.map((img, i) => (
            <li key={img.url}>
              <button
                type="button"
                onClick={() => setActive(i)}
                aria-label={`Show image ${i + 1}`}
                aria-current={i === active}
                className={cn('relative block aspect-square w-full overflow-hidden rounded-md border transition', i === active ? 'border-crimson' : 'border-white/10 hover:border-white/30')}
              >
                <Image src={img.url} alt="" fill sizes="96px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
