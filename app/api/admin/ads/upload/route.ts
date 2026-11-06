import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { requireAdmin } from '@/lib/supabase/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { AD_BUCKET, AD_IMAGE_LIMITS, adImageUrl } from '@/lib/ads/config'
import { validateAdImage } from '@/lib/ads/upload'

export const runtime = 'nodejs'

// POST multipart/form-data { file }. Admin only. The file is validated by
// its real bytes (type, size, dimensions) and stored under a random name —
// the client's filename is never used.
export async function POST(req: Request) {
  const { error: authError } = await requireAdmin()
  if (authError) return authError

  // Reject oversized bodies before buffering them
  const declared = Number(req.headers.get('content-length') ?? 0)
  if (declared > AD_IMAGE_LIMITS.maxBytes + 64 * 1024) {
    return NextResponse.json({ error: `That image is too large. The limit is ${AD_IMAGE_LIMITS.maxBytes / 1024 / 1024} MB.` }, { status: 413 })
  }

  const form = await req.formData().catch(() => null)
  const file = form?.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'Choose an image to upload.' }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())
  const check = validateAdImage(buffer)
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 })

  const path = `${randomUUID()}.${check.ext}`
  const { error } = await createAdminClient().storage.from(AD_BUCKET).upload(path, buffer, {
    contentType: check.contentType,
    cacheControl: '31536000', // immutable: every upload gets a new random name
    upsert: false,
  })
  if (error) return NextResponse.json({ error: `Upload failed: ${error.message}` }, { status: 500 })

  return NextResponse.json({ ok: true, path, url: adImageUrl(path), width: check.width, height: check.height })
}
