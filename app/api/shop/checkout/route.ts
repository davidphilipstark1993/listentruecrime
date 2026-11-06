import { NextResponse } from 'next/server'
import { checkoutEnabled, shopEnabled } from '@/lib/shop/config'
import { cartSchema } from '@/lib/shop/schema'
import { buildQuote } from '@/lib/shop/quote'
import { attachCheckoutSession, createPendingOrder, logEvent } from '@/lib/shop/orders'
import { createCheckoutSession, expireCheckoutSession, stripeConfigured } from '@/lib/shop/stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { releaseDiscountForOrder, reserveDiscountForOrder } from '@/lib/discounts/redeem'
import { FAILURE_MESSAGES } from '@/lib/discounts/types'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  if (!shopEnabled()) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!checkoutEnabled() || !stripeConfigured()) {
    return NextResponse.json({ error: 'Checkout is not open yet.' }, { status: 503 })
  }

  const parsed = cartSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid basket' }, { status: 400 })

  // Re-price everything from the database and Printify. Nothing from the
  // browser except variant ids and quantities is trusted.
  const quote = await buildQuote(parsed.data.items, undefined, parsed.data.code)
  if (quote.discountError) {
    // They asked for a code that can't be used. Don't silently charge full price: tell them.
    return NextResponse.json({ error: quote.discountError, codeError: true }, { status: 409 })
  }
  if (quote.problems.length || !quote.lines.length) {
    return NextResponse.json({ error: quote.problems[0]?.reason ?? 'Your basket is empty.', problems: quote.problems }, { status: 409 })
  }
  if (quote.shippingPence == null || quote.totalPence == null) {
    return NextResponse.json({ error: quote.shippingError ?? 'Delivery could not be priced.' }, { status: 503 })
  }

  let orderId: string | null = null
  try {
    const { order, items } = await createPendingOrder(quote)
    orderId = order.id

    // Take the code now (before the customer reaches Stripe) so a single-use code can't be
    // spent twice by two checkouts that were both open at once.
    if (quote.discount) {
      const reserved = await reserveDiscountForOrder(
        createAdminClient(),
        { orderId: order.id, code: quote.discount.code },
        { expireSession: expireCheckoutSession },
      )
      if (!reserved.ok) {
        await createAdminClient().from('shop_orders').delete().eq('id', order.id)
        orderId = null
        return NextResponse.json({ error: FAILURE_MESSAGES[reserved.reason], codeError: true }, { status: 409 })
      }
    }

    const imageByVariant = new Map(quote.lines.map(l => [l.variantId, l.imageUrl]))

    const session = await createCheckoutSession(order, items, imageByVariant)
    await attachCheckoutSession(order.id, session.id)
    if (!session.url) throw new Error('Stripe returned no checkout URL')
    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('Shop checkout failed:', err)
    if (orderId) {
      await logEvent(orderId, 'error', 'checkout.failed', err instanceof Error ? err.message : String(err))
      // The customer never got to pay: give a reserved single-use code back.
      await releaseDiscountForOrder(createAdminClient(), orderId).catch(() => {})
    }
    return NextResponse.json({ error: 'We could not start checkout. Please try again.' }, { status: 502 })
  }
}
