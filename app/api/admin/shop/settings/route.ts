import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/supabase/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { settingsSchema } from '@/lib/shop/admin-schema'

export async function PUT(req: Request) {
  const { error: authError } = await requireAdmin()
  if (authError) return authError

  const parsed = settingsSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Please check the highlighted fields', fieldErrors: parsed.error.flatten().fieldErrors }, { status: 400 })

  const rows = Object.entries(parsed.data).map(([key, value]) => ({ key, value: value == null ? null : String(value), updated_at: new Date().toISOString() }))
  const { error } = await createAdminClient().from('shop_settings').upsert(rows, { onConflict: 'key' })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
