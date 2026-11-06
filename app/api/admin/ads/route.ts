import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/supabase/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { adSchema } from '@/lib/ads/schema'

// POST: create an advert from /admin/ads/new.
export async function POST(req: Request) {
  const { error: authError } = await requireAdmin()
  if (authError) return authError

  const parsed = adSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Please check the highlighted fields', fieldErrors: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const { data, error } = await createAdminClient().from('ads').insert(parsed.data).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  revalidatePath('/', 'layout')
  return NextResponse.json({ ok: true, ad: data })
}
