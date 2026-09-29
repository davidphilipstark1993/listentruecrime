import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/supabase/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { affiliatePlacementSchema } from '@/lib/affiliates/schema'

interface Props {
  params: Promise<{ id: string }>
}

// POST: show this product on a page (article, podcast or case).
export async function POST(req: Request, { params }: Props) {
  const { error: authError } = await requireAdmin()
  if (authError) return authError

  const { id } = await params
  const parsed = affiliatePlacementSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Please check the highlighted fields', fieldErrors: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('affiliate_placements')
    .insert({ ...parsed.data, product_id: id })
    .select('*')
    .single()
  if (error) {
    const message = error.code === '23505' ? 'This product is already on that page' : error.message
    return NextResponse.json({ error: message }, { status: 400 })
  }

  revalidatePath('/', 'layout')
  return NextResponse.json({ ok: true, placement: data })
}

// DELETE ?placement=<id>: remove the product from a page.
export async function DELETE(req: Request, { params }: Props) {
  const { error: authError } = await requireAdmin()
  if (authError) return authError

  const { id } = await params
  const placementId = new URL(req.url).searchParams.get('placement')
  if (!placementId) return NextResponse.json({ error: 'Missing placement' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin.from('affiliate_placements').delete().eq('id', placementId).eq('product_id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  revalidatePath('/', 'layout')
  return NextResponse.json({ ok: true })
}
