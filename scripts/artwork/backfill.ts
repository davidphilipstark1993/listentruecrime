// Admin-triggered (or cron-scheduled) batch artwork recovery for the
// existing podcast catalogue. Deliberately NOT run automatically on app
// startup or on every deploy — see .github/workflows/artwork-recovery.yml
// for the scheduled invocation, and /admin/artwork's "Recover all" button
// for the on-demand one (which calls the API route instead of this script).
//
// Resumable by construction: each run selects whichever matching rows have
// gone longest without a check (oldest artwork_checked_at first, nulls —
// i.e. never checked — first of all), so an interrupted run's un-processed
// rows are simply picked up again next time, and already-verified rows are
// never reprocessed.
//
// Usage: npx tsx scripts/artwork/backfill.ts [--limit=50] [--concurrency=5] [--scope=broken] [--force]
import { createDiscoveryClient } from '../discovery/supabaseClient'
import { resolvePodcastArtwork } from '@/lib/artwork/resolve'
import { mapWithConcurrency } from '@/lib/artwork/concurrency'
import type { ArtworkResolutionResult, ArtworkSource } from '@/lib/artwork/types'

type Scope = 'missing' | 'needs_review' | 'failed' | 'broken'

function parseArgs() {
  const args = process.argv.slice(2)
  const get = (name: string, fallback: string) => args.find(a => a.startsWith(`--${name}=`))?.split('=')[1] ?? fallback
  return {
    limit: Number(get('limit', '50')),
    concurrency: Number(get('concurrency', '5')),
    scope: get('scope', 'broken') as Scope,
    force: args.includes('--force'),
  }
}

async function main() {
  const { limit, concurrency, scope, force } = parseArgs()
  const admin = createDiscoveryClient()

  console.log(`Artwork backfill: scope=${scope} limit=${limit} concurrency=${concurrency} force=${force}`)

  let query = admin.from('podcasts').select('id').eq('artwork_manual_override', false)
    .order('artwork_checked_at', { ascending: true, nullsFirst: true }).limit(limit)

  if (scope === 'missing') query = query.eq('artwork_status', 'missing')
  else if (scope === 'needs_review') query = query.eq('artwork_status', 'needs_review')
  else if (scope === 'failed') query = query.eq('artwork_status', 'failed').or(`artwork_next_retry_at.is.null,artwork_next_retry_at.lte.${new Date().toISOString()}`)
  else query = query.in('artwork_status', ['missing', 'failed'])

  const { data: rows, error } = await query
  if (error) {
    console.error('Failed to load candidate podcasts:', error.message)
    process.exit(1)
  }

  const ids = (rows ?? []).map(r => r.id as string)
  if (!ids.length) {
    console.log('No podcasts matched this scope. Nothing to do.')
    return
  }

  const start = Date.now()
  const outcomes = await mapWithConcurrency(ids, concurrency, id => resolvePodcastArtwork(admin, id, { force }))
  const durationMs = Date.now() - start

  const bySource: Partial<Record<ArtworkSource, number>> = {}
  let verified = 0, needsReview = 0, missing = 0, failed = 0, errors = 0
  const errorMessages: string[] = []

  for (const outcome of outcomes) {
    if ('error' in outcome) {
      errors++
      errorMessages.push(outcome.error instanceof Error ? outcome.error.message : String(outcome.error))
      continue
    }
    const r: ArtworkResolutionResult = outcome.result
    if (r.status === 'verified' || r.status === 'found') {
      verified++
      if (r.source) bySource[r.source] = (bySource[r.source] ?? 0) + 1
    } else if (r.status === 'needs_review') needsReview++
    else if (r.status === 'missing') missing++
    else { failed++; if (r.error) errorMessages.push(r.error) }
  }

  console.log('')
  console.log('=== Artwork Backfill Report ===')
  console.log(`Processed:        ${ids.length}`)
  console.log(`Artwork found:    ${verified}`)
  for (const [source, count] of Object.entries(bySource)) console.log(`  - ${source}: ${count}`)
  console.log(`Needs review:     ${needsReview}`)
  console.log(`Still missing:    ${missing}`)
  console.log(`Failed:           ${failed}`)
  console.log(`Errors:           ${errors}`)
  console.log(`Avg time/podcast: ${(durationMs / ids.length).toFixed(0)}ms`)
  console.log(`Total duration:   ${(durationMs / 1000).toFixed(1)}s`)
  if (errorMessages.length) {
    console.log('')
    console.log('Sample errors:')
    for (const msg of errorMessages.slice(0, 10)) console.log(`  - ${msg}`)
  }
}

main().catch(err => {
  console.error('Artwork backfill run failed:', err)
  process.exit(1)
})
