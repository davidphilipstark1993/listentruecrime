import { NextResponse } from 'next/server'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/supabase/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPrintProvider, getProduct, printifyConfigured, PrintifyError } from '@/lib/shop/printify'
import { importVariants } from '@/lib/shop/printify-import'
import { logEvent } from '@/lib/shop/orders'

interface Props { params: Promise<{ id: string }> }

const bodySchema = z.object({ printifyProductId: z.string().trim().min(5).max(100) })

// POST: link a product to its REAL Printify product and pull its variants.
// Read-only against Printify (we never create or edit Printify products).
// Prices are never imported — set them yourself. Existing placeholder variants
// are matched by colour+size so their ids are filled in rather than duplicated.
export async function POST(req: Request, { params }: Props) {
  const { error: authError } = await requireAdmin()
  if (authError) return authError
  const { id } = await params

  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Enter the Printify product id' }, { status: 400 })
  if (!printifyConfigured()) return NextResponse.json({ error: 'Printify is not configured (PRINTIFY_API_TOKEN / PRINTIFY_SHOP_ID).' }, { status: 503 })

  let remote
  try { remote = await getProduct(parsed.data.printifyProductId) } catch (err) {
    return NextResponse.json({ error: err instanceof PrintifyError ? `Printify said: ${err.message}` : 'Could not reach Printify' }, { status: 502 })
  }

  const admin = createAdminClient()
  const { data: existing } = await admin.from('shop_variants').select('*').eq('product_id', id)
  const incoming = importVariants(remote)
  let created = 0, updated = 0

  for (const v of incoming) {
    const match = (existing ?? []).find(e => e.printify_variant_id === v.printify_variant_id)
      ?? (existing ?? []).find(e => e.printify_variant_id == null && e.colour.toLowerCase() === v.colour.toLowerCase() && e.size.toLowerCase() === v.size.toLowerCase())
    if (match) {
      await admin.from('shop_variants').update({
        printify_variant_id: v.printify_variant_id, sku: v.sku, colour_hex: v.colour_hex ?? match.colour_hex,
        cost_minor: v.cost_minor ?? match.cost_minor, is_enabled: v.is_enabled,
      }).eq('id', match.id)
      updated++
    } else {
      await admin.from('shop_variants').insert({ product_id: id, ...v, price_pence: null })
      created++
    }
  }

  // Mock-ups from Printify, added after any images already chosen.
  const { data: prod } = await admin.from('shop_products').select('images, title').eq('id', id).single()
  const have = new Set(((prod?.images ?? []) as { url: string }[]).map(i => i.url))
  const newImages = (remote.images ?? [])
    .filter(i => i.src && !have.has(i.src.replace(/^http:/, 'https:')))
    .slice(0, 12)
    .map(i => ({ url: i.src.replace(/^http:/, 'https:'), alt: `${prod?.title ?? remote.title} — ${i.position} view` }))
  await admin.from('shop_products').update({
    printify_product_id: remote.id,
    images: [...((prod?.images ?? []) as unknown[]), ...newImages],
  }).eq('id', id)

  // Warn when the chosen print provider is not UK-based: longer delivery, higher
  // shipping and possible import charges for UK customers.
  let warning: string | null = null
  if (remote.print_provider_id) {
    try {
      const provider = await getPrintProvider(remote.print_provider_id)
      const country = provider.location?.country
      if (country && country !== 'GB') {
        warning = `This product is made by "${provider.title}" in ${provider.location?.city ?? country} (${country}), not the UK. Delivery will be slower and dearer, and UK customers may face import charges. Consider switching the print provider in Printify to a UK one, then sync again (variant ids change when the provider changes).`
      }
    } catch { /* advisory only */ }
  }

  await logEvent(null, 'info', 'admin.printify_sync', `Linked product ${id} to Printify ${remote.id}`, { created, updated })
  revalidatePath('/shop', 'layout')
  return NextResponse.json({ ok: true, printifyTitle: remote.title, created, updated, images: newImages.length, warning })
}
