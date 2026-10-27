import { NextResponse } from 'next/server'
import { shopEnabled } from '@/lib/shop/config'
import { cartSchema } from '@/lib/shop/schema'
import { buildQuote } from '@/lib/shop/quote'

export const dynamic = 'force-dynamic'

// Prices a basket for display. Everything returned is derived from the
// database / Printify — the request only carries variant ids and quantities.
export async function POST(req: Request) {
  if (!shopEnabled()) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const parsed = cartSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid basket' }, { status: 400 })

  const q = await buildQuote(parsed.data.items)
  return NextResponse.json({
    lines: q.lines.map(l => ({
      variantId: l.variantId,
      productSlug: l.productSlug,
      title: l.productTitle,
      imageUrl: l.imageUrl,
      colour: l.colour,
      size: l.size,
      quantity: l.quantity,
      unitPricePence: l.unitPricePence,
      linePence: l.linePence,
    })),
    problems: q.problems,
    subtotalPence: q.subtotalPence,
    shippingPence: q.shippingPence,
    shippingError: q.shippingError,
    totalPence: q.totalPence,
  })
}
