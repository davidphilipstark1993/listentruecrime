import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  MAX_FILES, isOurMediaUrl, sendBroadcast, sendBroadcastTest,
  type BroadcastAttachment,
} from '@/lib/newsletter/broadcast'

// Headroom for batching through a few thousand recipients.
export const maxDuration = 60

function parseAttachments(input: unknown): BroadcastAttachment[] | null {
  if (input === undefined) return []
  if (!Array.isArray(input) || input.length > MAX_FILES) return null
  const out: BroadcastAttachment[] = []
  for (const a of input) {
    if (!a || typeof a.name !== 'string' || typeof a.url !== 'string' || typeof a.type !== 'string' || typeof a.size !== 'number') return null
    if (!isOurMediaUrl(a.url)) return null
    out.push({ name: a.name.slice(0, 120), url: a.url, type: a.type, size: a.size })
  }
  return out
}

export async function POST(req: Request) {
  const cookieClient = await createClient()
  const { data: { user } } = await cookieClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await cookieClient.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => null) as Record<string, unknown> | null
  const subject = typeof body?.subject === 'string' ? body.subject.trim() : ''
  const message = typeof body?.message === 'string' ? body.message.trim() : ''
  const attachments = parseAttachments(body?.attachments)
  const mode = body?.mode

  if (!subject || subject.length > 150) return NextResponse.json({ error: 'Add a subject (up to 150 characters).' }, { status: 400 })
  if (!message || message.length > 20000) return NextResponse.json({ error: 'Add a message (up to 20,000 characters).' }, { status: 400 })
  if (!attachments) return NextResponse.json({ error: 'Invalid attachments.' }, { status: 400 })
  if (mode !== 'test' && mode !== 'all') return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })

  // Wrapped so provider errors come back as JSON rather than an empty 500.
  try {
    if (mode === 'test') {
      if (!user.email) return NextResponse.json({ error: 'Your account has no email address.' }, { status: 400 })
      await sendBroadcastTest({ subject, message, attachments }, user.email)
      return NextResponse.json({ ok: true, sentTo: user.email })
    }
    const result = await sendBroadcast(createAdminClient(), { subject, message, attachments, sentBy: user.id })
    return NextResponse.json({ ok: true, sentCount: result.sentCount })
  } catch (err) {
    console.error('Broadcast send error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Send failed' }, { status: 500 })
  }
}
