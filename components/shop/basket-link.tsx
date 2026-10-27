'use client'
import Link from 'next/link'
import { ShoppingBag } from 'lucide-react'
import { useBasket } from './basket-store'

/** Header basket icon with live count. Rendered only when the shop is enabled. */
export function BasketLink() {
  const { count } = useBasket()
  return (
    <Link
      href="/shop/basket"
      className="relative p-2 text-stone-muted hover:text-stone hover:bg-ink-700 rounded-md transition-colors"
      aria-label={count ? `Basket, ${count} item${count === 1 ? '' : 's'}` : 'Basket'}
    >
      <ShoppingBag size={18} />
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-crimson px-1 text-[10px] font-semibold text-white">{count}</span>
      )}
    </Link>
  )
}
