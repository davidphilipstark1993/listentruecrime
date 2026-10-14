import { createHash, timingSafeEqual } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'

// Logic behind GET /api/subscriber-count. Kept out of the route file so it can
// be unit-tested without a Next.js runtime or a database.

export interface SubscriberStats {
  total_subscribers: number
  new_last_24h: number
  unsubscribed_last_24h: number
}

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Constant-time check of the X-Stats-Key header against STATS_API_KEY.
 * Both sides are hashed first so the comparison is the same length whatever the
 * caller sends. An unset or empty STATS_API_KEY never matches anything.
 */
export function statsKeyMatches(provided: string | null, expected: string | undefined): boolean {
  if (!provided || !expected) return false
  const a = createHash('sha256').update(provided).digest()
  const b = createHash('sha256').update(expected).digest()
  return timingSafeEqual(a, b)
}

export function clientIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  )
}

/**
 * Fixed-window per-key limiter held in process memory. On serverless hosting
 * each warm instance keeps its own counters, so this is a best-effort brake on
 * abuse rather than an exact global cap.
 */
export function createRateLimiter(limit: number, windowMs: number) {
  const hits = new Map<string, { count: number; resetAt: number }>()
  return {
    check(key: string, now = Date.now()): { allowed: boolean; retryAfterSeconds: number } {
      if (hits.size > 5000) {
        hits.forEach((v, k) => { if (v.resetAt <= now) hits.delete(k) })
      }
      const entry = hits.get(key)
      if (!entry || entry.resetAt <= now) {
        hits.set(key, { count: 1, resetAt: now + windowMs })
        return { allowed: true, retryAfterSeconds: 0 }
      }
      entry.count += 1
      return {
        allowed: entry.count <= limit,
        retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
      }
    },
  }
}

/**
 * Counts read from newsletter_subscribers: the same table, and the same
 * `status` values, the admin page at /admin/newsletter lists. This site has no
 * double opt-in, so `active` is the confirmed state; bounced, suppressed and
 * unsubscribed rows are all excluded from the total.
 *
 *  - new_last_24h:          rows created in the last 24 hours (gross signups)
 *  - unsubscribed_last_24h: rows whose status is `unsubscribed` and whose
 *                           unsubscribed_at falls in the last 24 hours
 */
export async function fetchSubscriberStats(
  admin: Pick<SupabaseClient, 'from'>,
  now: Date = new Date(),
): Promise<SubscriberStats> {
  const since = new Date(now.getTime() - DAY_MS).toISOString()

  const count = async (apply: (q: any) => any): Promise<number> => {
    const base = admin.from('newsletter_subscribers').select('id', { count: 'exact', head: true })
    const { count: n, error } = await apply(base)
    if (error) throw new Error(error.message)
    return n ?? 0
  }

  const [total_subscribers, new_last_24h, unsubscribed_last_24h] = await Promise.all([
    count(q => q.eq('status', 'active')),
    count(q => q.gte('created_at', since)),
    count(q => q.eq('status', 'unsubscribed').gte('unsubscribed_at', since)),
  ])

  return { total_subscribers, new_last_24h, unsubscribed_last_24h }
}
