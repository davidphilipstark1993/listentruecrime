import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/supabase/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { adPatchSchema } from '@/lib/ads/schema'
import { AD_BUCKET } from '@/lib/ads/config'

interface Props {
  params: Promise<{ id: string }>
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

// Removes a stored image once no advert refers to it any more.
async function removeImageIfUnused(path: string | null | undefined) {
  if (!path) return
  const admin = createAdminClient()
  const { count } = await admin.from('ads').select('id', { count: 'exact', head: true }).eq('image_path', path)
  if (!count) await admin.storage.from(AD_BUCKET).remove([path])
}

// PATCH: partial update — the edit form, the on/off switch, archive/restore.
export async function PATCH(req: Request, { params }: Props) {
  const { error: authError } = await requireAdmin()
  if (authError) return authError

  const { id } = await params
  if (!UUID.test(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const parsed = adPatchSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Please check the highlighted fields', fieldErrors: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const { archived, ...fields } = parsed.data
  const update: Record<string, unknown> = { ...fields }
  if (archived !== undefined) {
    update.archived_at = archived ? new Date().toISOString() : null
    if (archived) update.is_active = false // archived adverts are never live
  }
  if (Object.keys(update).length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })

  const admin = createAdminClient()
  const { data: before } = await admin.from('ads').select('image_path, starts_at, ends_at').eq('id', id).maybeSingle()
  if (!before) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Date rule must hold against the stored value when only one end is being changed
  const starts = 'starts_at' in update ? (update.starts_at as string | null) : before.starts_at
  const ends = 'ends_at' in update ? (update.ends_at as string | null) : before.ends_at
  if (starts && ends && new Date(ends) <= new Date(starts)) {
    return NextResponse.json({ error: 'The end date must be after the start date', fieldErrors: { ends_at: ['The end date must be after the start date'] } }, { status: 400 })
  }

  const { data, error } = await admin.from('ads').update(update).eq('id', id).select('*').single()
  if (error || !data) return NextResponse.json({ error: error?.message ?? 'Not found' }, { status: 400 })

  if (fields.image_path && fields.image_path !== before.image_path) await removeImageIfUnused(before.image_path)

  revalidatePath('/', 'layout')
  return NextResponse.json({ ok: true, ad: data })
}

// DELETE: permanently removes the advert, its image and its stats.
// (Archive instead to keep the history.)
export async function DELETE(_req: Request, { params }: Props) {
  const { error: authError } = await requireAdmin()
  if (authError) return authError

  const { id } = await params
  if (!UUID.test(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const admin = createAdminClient()
  const { data: ad } = await admin.from('ads').select('image_path').eq('id', id).maybeSingle()
  const { error } = await admin.from('ads').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  await removeImageIfUnused(ad?.image_path)

  revalidatePath('/', 'layout')
  return NextResponse.json({ ok: true })
}
