import Image from 'next/image'
import { Coffee, Package, Shirt } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PublicProduct } from '@/lib/shop/types'

const ICONS: Record<string, typeof Shirt> = { 't-shirts': Shirt, hoodies: Shirt, mugs: Coffee, accessories: Package }

/**
 * Clearly-labelled stand-in shown until a real mock-up exists. It is
 * deliberately unmistakable as a placeholder so it can never be mistaken for
 * the finished product shot.
 */
export function PlaceholderArt({ category, label, className }: { category: string; label?: string; className?: string }) {
  const Icon = ICONS[category] ?? Package
  return (
    <div
      role="img"
      aria-label={label ? `Placeholder image for ${label}` : 'Placeholder product image'}
      className={cn('relative flex h-full w-full flex-col items-center justify-center gap-3 overflow-hidden bg-ink-800', className)}
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(190,18,60,0.18),transparent_60%)]" />
      <Icon size={44} strokeWidth={1.25} className="relative text-stone-subtle" aria-hidden="true" />
      <span className="relative rounded-full border border-white/10 px-3 py-1 text-2xs font-semibold uppercase tracking-widest text-stone-subtle">
        Placeholder · artwork to follow
      </span>
    </div>
  )
}

export function ProductImage({
  product, index = 0, sizes, priority = false, className,
}: { product: Pick<PublicProduct, 'title' | 'category' | 'images'>; index?: number; sizes: string; priority?: boolean; className?: string }) {
  const img = product.images.filter(i => !i.placeholder)[index]
  if (!img) return <PlaceholderArt category={product.category} label={product.title} className={className} />
  return (
    <Image
      src={img.url}
      alt={img.alt || product.title}
      fill
      sizes={sizes}
      priority={priority}
      className={cn('object-cover', className)}
    />
  )
}
