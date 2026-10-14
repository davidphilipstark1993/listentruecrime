import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { BASE } from '@/lib/seo/config'
import { sanitizeEnv } from '@/lib/utils'
import {
  clientIp,
  createRateLimiter,
  fetchSubscriberStats,
  statsKeyMatches,
} from '@/lib/subscriber-stats'

// GET /api/subscriber-count — read-only subscriber numbers for the daily stats
// post. Authenticated with the X-Stats-Key header (env STATS_API_KEY). Returns
// counts only: no emails, names or any other personal data.

export const dynamic = 'force-dynamic'

const limiter = createRateLimiter(30, 60 * 60 * 1000) // 30 requests / hour / IP

function respond(body: Record<string, unknown>, status = 200, extra: Record<string, string> = {}) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store', ...extra } })
}

export async function GET(req: Request) {
  // Rate limit before auth so guessing the key is throttled as well.
  const limit = limiter.check(clientIp(req))
  if (!limit.allowed) {
    return respond({ error: 'Too many requests' }, 429, { 'Retry-After': String(limit.retryAfterSeconds) })
  }

  const expected = process.env.STATS_API_KEY ? sanitizeEnv(process.env.STATS_API_KEY) : undefined
  if (!expected) console.error('subscriber-count: STATS_API_KEY is not configured')
  if (!statsKeyMatches(req.headers.get('x-stats-key'), expected)) {
    return respond({ error: 'Unauthorized' }, 401)
  }

  try {
    const stats = await fetchSubscriberStats(createAdminClient())
    return respond({
      site: new URL(BASE).hostname.replace(/^www\./, ''),
      ...stats,
      as_of: new Date().toISOString(),
    })
  } catch (err) {
    console.error('subscriber-count: query failed:', err instanceof Error ? err.message : 'unknown error')
    return respond({ error: 'Could not load subscriber counts' }, 500)
  }
}
