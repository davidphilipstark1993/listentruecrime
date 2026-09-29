import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/supabase/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { affiliateProductSchema } from '@/lib/affiliates/schema'

// POST: create an affiliate product from /admin/affiliates.
export async function POST(req: Request) {
  const { error: authError } = await requireAdmin()
  if (authError) return authError

  const parsed = affiliateProductSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Please check the highlighted fields', fieldErrors: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin.from('affiliate_products').insert(parsed.data).select('*').single()
  if (error) {
    const message = error.code === '23505' ? 'A product with that slug already exists' : error.message
    return NextResponse.json({ error: message }, { status: 400 })
  }

  revalidatePath('/', 'layout')
  return NextResponse.json({ ok: true, product: data })
}
