import { createHash } from 'crypto'
import { z } from 'zod'

export const IMPRESSION_WINDOW_MS = 30 * 60 * 1000 // same advert, spot, page, visitor: once per 30 min
export const CLICK_WINDOW_MS = 10 * 1000 // rapid repeat clicks within 10 s count once

export const trackBodySchema = z.object({
  ad_id: z.string().uuid(),
  event: z.enum(['impression', 'click']),
  placement: z.string().trim().min(1).max(60),
  page_path: z.string().trim().max(300).startsWith('/'),
  // Random per-tab-session id made in the browser. Only ever used inside the hash below.
  session_id: z.string().trim().min(8).max(64),
})
export type TrackBody = z.infer<typeof trackBodySchema>

/** Crawlers and link previewers never count as impressions or clicks. */
const BOT_RE = /bot|crawl|spider|slurp|facebookexternalhit|preview|headless|lighthouse|pingdom|uptime|monitor|curl|wget|python-requests|node-fetch|axios|go-http|java\//i
export function isBot(userAgent: string | null | undefined): boolean {
  return !userAgent || BOT_RE.test(userAgent)
}

export function cleanPagePath(path: string): string {
  return path.split(/[?#]/)[0] || '/'
}

/**
 * Deterministic key: two events that should count once produce the same key,
 * and the unique index on ad_events.dedupe_key rejects the second atomically.
 * Hashed so the session id is never stored.
 */
export function dedupeKey(b: TrackBody, nowMs: number): string {
  const windowMs = b.event === 'impression' ? IMPRESSION_WINDOW_MS : CLICK_WINDOW_MS
  const bucket = Math.floor(nowMs / windowMs)
  const parts = b.event === 'impression'
    ? [b.ad_id, b.event, b.placement, cleanPagePath(b.page_path), b.session_id, bucket]
    : [b.ad_id, b.event, b.placement, b.session_id, bucket]
  return createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 40)
}
