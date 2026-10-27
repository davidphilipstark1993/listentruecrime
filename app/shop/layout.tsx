import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { shopEnabled } from '@/lib/shop/config'

// The whole shop sits behind NEXT_PUBLIC_SHOP_ENABLED: until it is "true" every
// /shop URL is a 404, so merging this code publishes nothing.
export const revalidate = 300

export default function ShopLayout({ children }: { children: ReactNode }) {
  if (!shopEnabled()) notFound()
  return (
    <>
      <Header />
      <main id="main-content" className="pt-16">{children}</main>
      <Footer />
    </>
  )
}
