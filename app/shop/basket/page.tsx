import type { Metadata } from 'next'
import { Suspense } from 'react'
import { checkoutEnabled } from '@/lib/shop/config'
import { BasketView } from '@/components/shop/basket-view'

export const metadata: Metadata = {
  title: 'Your basket',
  robots: { index: false, follow: false },
}

// Read at request time so flipping SHOP_CHECKOUT_ENABLED needs no rebuild.
export const dynamic = 'force-dynamic'

export default function BasketPage() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="heading-display mb-8 text-4xl uppercase">Your basket</h1>
      <Suspense fallback={null}>
        <BasketView checkoutOpen={checkoutEnabled()} />
      </Suspense>
    </section>
  )
}
