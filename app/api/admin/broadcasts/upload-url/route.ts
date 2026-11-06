import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { requireAdmin } from '@/lib/supabase/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { ALLOWED_TYPES, BROADCAST_BUCKET, MAX_FILE_BYTES } from '@/lib/newsletter/broadcast'

// Issues a one-off signed upload URL so the browser can send the file
// straight to Supabase Storage. Going through this function instead would
// hit Vercel's ~4.5 MB request body limit, which a PDF easily exceeds.
export async function POST(req: Request) {
  const { error: authError } = await requireAdmin()
  if (authError) return authError

  const body = await req.json().catch(() => null) as { name?: unknown; type?: unknown; size?: unknown } | null
  const name = typeof body?.name === 'string' ? body.name : ''
  const type = typeof body?.type === 'string' ? body.type : ''
  const size = typeof body?.size === 'number' ? body.size : 0

  if (!name || !ALLOWED_TYPES.includes(type)) {
    return NextResponse.json({ error: 'That file type isn\'t supported. Use images, PDF, Office documents, CSV/text, ZIP or MP3.' }, { status: 400 })
  }
  if (size <= 0 || size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: 'Files must be under 25 MB.' }, { status: 400 })
  }

  const safeName = name.normalize('NFKD').replace(/[^\w.\- ]+/g, '').trim().replace(/\s+/g, '-').slice(-80) || 'file'
  const month = new Date().toISOString().slice(0, 7)
  const path = `${month}/${randomUUID()}-${safeName}`

  const admin = createAdminClient()
  const { data, error } = await admin.storage.from(BROADCAST_BUCKET).createSignedUploadUrl(path)
  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Could not prepare upload' }, { status: 500 })
  }

  const { data: pub } = admin.storage.from(BROADCAST_BUCKET).getPublicUrl(path)
  return NextResponse.json({ path, token: data.token, url: pub.publicUrl })
}
