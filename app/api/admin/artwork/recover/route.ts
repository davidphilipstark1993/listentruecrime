import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/supabase/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolvePodcastArtwork } from '@/lib/artwork/resolve'
import { mapWithConcurrency } from '@/lib/artwork/concurrency'
import { DEFAULT_RECOVERY_CONCURRENCY } from '@/lib/artwork/types'

type Scope = 'missing' | 'needs_review' | 'failed' | 'broken' | 'selected'

interface RecoverBody {
  scope?: Scope
  podcastIds?: string[]
  limit?: number
  concurrency?: number
  force?: boolean
}

const MAX_BATCH_LIMIT = 50 // keeps one invocation well inside a serverless function's execution window
const MAX_CONCURRENCY = 10

/**
 * Runs a bounded batch of artwork recovery. Deliberately processes at most
 * MAX_BATCH_LIMIT podcasts per call rather than all matching rows at once —
 * the admin dashboard calls this repeatedly ("Recover All" polls it in a
 * loop) so an interrupted run simply resumes on the next call instead of
 * risking a serverless function timeout partway through hundreds of rows.
 */
export async function POST(req: Request) {
  const { error: authError } = await requireAdmin()
  if (authError) return authError

  const body = (await req.json().catch(() => ({}))) as RecoverBody
  const scope = body.scope ?? 'missing'
  const limit = Math.min(Math.max(1, body.limit ?? 20), MAX_BATCH_LIMIT)
  const concurrency = Math.min(Math.max(1, body.concurrency ?? DEFAULT_RECOVERY_CONCURRENCY), MAX_CONCURRENCY)
  const force = body.force === true

  const admin = createAdminClient()

  let ids: string[] = []
  if (scope === 'selected') {
    ids = (body.podcastIds ?? []).slice(0, limit)
  } else {
    let q = admin.from('podcasts').select('id').eq('artwork_manual_override', false).limit(limit)
    if (scope === 'missing') {
      q = q.eq('artwork_status', 'missing')
    } else if (scope === 'needs_review') {
      q = q.eq('artwork_status', 'needs_review')
    } else if (scope === 'failed') {
      q = q.eq('artwork_status', 'failed').or(`artwork_next_retry_at.is.null,artwork_next_retry_at.lte.${new Date().toISOString()}`)
    } else if (scope === 'broken') {
      q = q.in('artwork_status', ['missing', 'failed'])
    }
    const { data, error } = await q
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    ids = (data ?? []).map(r => r.id as string)
  }

  if (!ids.length) {
    return NextResponse.json({ processed: 0, verified: 0, needsReview: 0, missing: 0, failed: 0, results: [] })
  }

  const outcomes = await mapWithConcurrency(ids, concurrency, id => resolvePodcastArtwork(admin, id, { force }))

  const counts = { processed: 0, verified: 0, needsReview: 0, missing: 0, failed: 0 }
  const results = outcomes.map(o => {
    counts.processed++
    if ('error' in o) {
      counts.failed++
      return { podcastId: (o.item as string), status: 'failed', error: o.error instanceof Error ? o.error.message : String(o.error) }
    }
    const r = o.result
    if (r.status === 'verified' || r.status === 'found') counts.verified++
    else if (r.status === 'needs_review') counts.needsReview++
    else if (r.status === 'missing') counts.missing++
    else counts.failed++
    return r
  })

  // Lets the dashboard's "Recover All" loop know whether to fire another
  // batch — the same scope query, just counted instead of limited/fetched.
  let remaining: number | null = null
  if (scope !== 'selected') {
    let countQuery = admin.from('podcasts').select('id', { count: 'exact', head: true }).eq('artwork_manual_override', false)
    if (scope === 'missing') countQuery = countQuery.eq('artwork_status', 'missing')
    else if (scope === 'needs_review') countQuery = countQuery.eq('artwork_status', 'needs_review')
    else if (scope === 'failed') countQuery = countQuery.eq('artwork_status', 'failed').or(`artwork_next_retry_at.is.null,artwork_next_retry_at.lte.${new Date().toISOString()}`)
    else if (scope === 'broken') countQuery = countQuery.in('artwork_status', ['missing', 'failed'])
    const { count } = await countQuery
    remaining = count ?? 0
  }

  return NextResponse.json({ ...counts, remaining, results })
}
