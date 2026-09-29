import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/supabase/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { affiliateProductSchema } from '@/lib/affiliates/schema'

interface Props {
  params: Promise<{ id: string }>
}

// PATCH: save the full product form. Revalidates the site so a changed
// URL, description or on/off switch shows on public pages straight away.
export async function PATCH(req: Request, { params }: Props) {
  const { error: authError } = await requireAdmin()
  if (authError) return authError

  const { id } = await params
  const parsed = affiliateProductSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Please check the highlighted fields', fieldErrors: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin.from('affiliate_products').update(parsed.data).eq('id', id).select('*').single()
  if (error || !data) {
    const message = error?.code === '23505' ? 'A product with that slug already exists' : error?.message ?? 'Not found'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  revalidatePath('/', 'layout')
  return NextResponse.json({ ok: true, product: data })
}

// DELETE: remove a product and its placements. Click history is kept
// (product_id is set to null, product_slug remains).
export async function DELETE(_req: Request, { params }: Props) {
  const { error: authError } = await requireAdmin()
  if (authError) return authError

  const { id } = await params
  const admin = createAdminClient()
  const { error } = await admin.from('affiliate_products').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  revalidatePath('/', 'layout')
  return NextResponse.json({ ok: true })
}
