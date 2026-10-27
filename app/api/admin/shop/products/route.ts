import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/supabase/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { productSaveSchema } from '@/lib/shop/admin-schema'

export async function POST(req: Request) {
  const { error: authError } = await requireAdmin()
  if (authError) return authError

  const parsed = productSaveSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Please check the highlighted fields', fieldErrors: parsed.error.flatten().fieldErrors }, { status: 400 })

  const admin = createAdminClient()
  const { data: product, error } = await admin.from('shop_products').insert(parsed.data.product).select('*').single()
  if (error || !product) return NextResponse.json({ error: error?.code === '23505' ? 'A product with that slug already exists' : error?.message }, { status: 400 })

  if (parsed.data.variants.length) {
    const { error: vErr } = await admin.from('shop_variants').insert(parsed.data.variants.map(({ id: _id, ...v }) => ({ ...v, product_id: product.id })))
    if (vErr) return NextResponse.json({ error: vErr.message, product }, { status: 400 })
  }
  revalidatePath('/shop', 'layout')
  return NextResponse.json({ ok: true, product })
}
