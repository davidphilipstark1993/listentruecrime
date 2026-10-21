import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/supabase/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { productSaveSchema } from '@/lib/shop/admin-schema'

interface Props { params: Promise<{ id: string }> }

// PUT: save the whole product form — the product plus its full variant list.
// Variants with an id are updated, without an id are created, and any existing
// variant absent from the list is removed (order history is unaffected: order
// items are snapshots).
export async function PUT(req: Request, { params }: Props) {
  const { error: authError } = await requireAdmin()
  if (authError) return authError
  const { id } = await params

  const parsed = productSaveSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Please check the highlighted fields', fieldErrors: parsed.error.flatten().fieldErrors }, { status: 400 })

  const admin = createAdminClient()
  const { data: product, error } = await admin.from('shop_products').update(parsed.data.product).eq('id', id).select('*').single()
  if (error || !product) return NextResponse.json({ error: error?.code === '23505' ? 'A product with that slug already exists' : error?.message ?? 'Not found' }, { status: 400 })

  const { data: existing } = await admin.from('shop_variants').select('id').eq('product_id', id)
  const keep = new Set(parsed.data.variants.filter(v => v.id).map(v => v.id as string))
  const toDelete = (existing ?? []).map(v => v.id).filter(vid => !keep.has(vid))
  if (toDelete.length) await admin.from('shop_variants').delete().in('id', toDelete)

  for (const v of parsed.data.variants) {
    const { id: vid, ...fields } = v
    const res = vid
      ? await admin.from('shop_variants').update(fields).eq('id', vid).eq('product_id', id)
      : await admin.from('shop_variants').insert({ ...fields, product_id: id })
    if (res.error) {
      const msg = res.error.code === '23505' ? `Duplicate variant: ${v.colour} / ${v.size} (or Printify variant id) already exists on this product` : res.error.message
      return NextResponse.json({ error: msg }, { status: 400 })
    }
  }

  revalidatePath('/shop', 'layout')
  revalidatePath('/', 'page')
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: Request, { params }: Props) {
  const { error: authError } = await requireAdmin()
  if (authError) return authError
  const { id } = await params
  const admin = createAdminClient()
  const { error } = await admin.from('shop_products').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  revalidatePath('/shop', 'layout')
  return NextResponse.json({ ok: true })
}
