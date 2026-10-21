import type { Metadata } from 'next'
import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'
import { supportEmail } from '@/lib/shop/config'
import { ClearBasket } from '@/components/shop/clear-basket'

export const metadata: Metadata = { title: 'Order received', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

// Deliberately shows nothing personal: no address, no email. The Stripe session
// id in the URL is only used to look up the order number.
export default async function SuccessPage({ searchParams }: { searchParams: { session_id?: string } }) {
  const sid = searchParams.session_id
  let orderNumber: string | null = null
  if (sid && /^cs_[A-Za-z0-9_]+$/.test(sid)) {
    const { data } = await createAdminClient().from('shop_orders').select('order_number').eq('stripe_checkout_session_id', sid).maybeSingle()
    orderNumber = data?.order_number ?? null
  }
  return (
    <section className="mx-auto max-w-xl px-4 py-20 text-center">
      <ClearBasket />
      <CheckCircle2 size={44} className="mx-auto text-emerald-400" strokeWidth={1.5} />
      <h1 className="heading-display mt-5 text-4xl uppercase">Case closed. Order received.</h1>
      {orderNumber && <p className="mt-3 text-stone-muted">Your order number is <strong className="text-stone">{orderNumber}</strong>.</p>}
      <p className="mt-4 text-stone-muted">
        A confirmation is on its way to your inbox. Everything is printed to order, and we will email your tracking details as soon as it is dispatched.
      </p>
      <p className="mt-4 text-sm text-stone-subtle">No email after a few minutes? Check your spam folder or contact <a className="text-crimson hover:underline" href={`mailto:${supportEmail()}`}>{supportEmail()}</a>.</p>
      <Link href="/shop" className="btn-outline mt-8">Back to the shop</Link>
    </section>
  )
}
