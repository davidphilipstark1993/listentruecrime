import { NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { sanitizeEnv } from '@/lib/utils'

// Ratings from visitors who aren't signed in. One rating per browser per
// podcast (visitor_id lives in the browser's localStorage), plus a per-IP
// cap so a script can't flood the averages. See migration 015.

const SCORE_FIELDS = [
  'storytelling_score',
  'research_score',
  'host_quality_score',
  'production_score',
  'binge_factor_score',
  'factual_accuracy_score',
  'overall_score',
] as const

// Generous enough for a household sharing one connection to rate a batch of
// shows after a newsletter, tight enough to stop scripted floods.
const MAX_WRITES_PER_IP_PER_HOUR = 40

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function clientIpHash(req: Request): string {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  const salt = process.env.RATING_IP_SALT ? sanitizeEnv(process.env.RATING_IP_SALT) : 'ltc-anonymous-ratings'
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex')
}

function parseScores(input: unknown): Record<string, number> | null {
  if (!input || typeof input !== 'object') return null
  const scores: Record<string, number> = {}
  for (const field of SCORE_FIELDS) {
    const value = (input as Record<string, unknown>)[field]
    if (value === undefined || value === null) continue
    if (!Number.isInteger(value) || (value as number) < 1 || (value as number) > 10) return null
    scores[field] = value as number
  }
  return Object.keys(scores).length ? scores : null
}

// POST: create or update this browser's rating for a podcast.
export async function POST(req: Request) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { podcast_id, visitor_id } = body
  if (typeof podcast_id !== 'string' || !UUID_RE.test(podcast_id) ||
      typeof visitor_id !== 'string' || !UUID_RE.test(visitor_id)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const scores = parseScores(body.scores)
  if (!scores) {
    return NextResponse.json({ error: 'Please rate at least one dimension (1–10)' }, { status: 400 })
  }

  const admin = createAdminClient()
  const ipHash = clientIpHash(req)

  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { count } = await admin
    .from('anonymous_ratings')
    .select('id', { count: 'exact', head: true })
    .eq('ip_hash', ipHash)
    .gte('updated_at', since)
  if ((count ?? 0) >= MAX_WRITES_PER_IP_PER_HOUR) {
    return NextResponse.json({ error: 'Too many ratings from your connection — please try again later' }, { status: 429 })
  }

  const { data: podcast } = await admin
    .from('podcasts')
    .select('slug')
    .eq('id', podcast_id)
    .eq('is_published', true)
    .maybeSingle()
  if (!podcast) return NextResponse.json({ error: 'Podcast not found' }, { status: 404 })

  // Explicit nulls so an update replaces the previous rating in full.
  const row: Record<string, unknown> = { visitor_id, podcast_id, ip_hash: ipHash, updated_at: new Date().toISOString() }
  for (const field of SCORE_FIELDS) row[field] = scores[field] ?? null

  const { error } = await admin
    .from('anonymous_ratings')
    .upsert(row, { onConflict: 'visitor_id,podcast_id' })
  if (error) {
    console.error('Anonymous rating upsert error:', error.message)
    return NextResponse.json({ error: 'Could not save rating' }, { status: 500 })
  }

  // Show the new average now rather than after the hourly ISR refresh.
  revalidatePath(`/podcasts/${podcast.slug}`)
  return NextResponse.json({ ok: true })
}

// DELETE: drop this browser's anonymous rating — used when the visitor signs
// in and the rating moves to their account, so it isn't counted twice.
export async function DELETE(req: Request) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { podcast_id, visitor_id } = body
  if (typeof podcast_id !== 'string' || !UUID_RE.test(podcast_id) ||
      typeof visitor_id !== 'string' || !UUID_RE.test(visitor_id)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('anonymous_ratings')
    .delete()
    .eq('visitor_id', visitor_id)
    .eq('podcast_id', podcast_id)
  if (error) return NextResponse.json({ error: 'Could not remove rating' }, { status: 500 })

  return NextResponse.json({ ok: true })
}
