import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cleanPagePath, dedupeKey, isBot, trackBodySchema } from '@/lib/ads/track'
import { isLive } from '@/lib/ads/schedule'

// Receives the beacons fired by <AdCard>. Only counts an event when:
//   - the request isn't from a crawler,
//   - the advert exists and is live right now (inactive/expired/archived never count),
//   - the placement is one the advert is actually assigned to,
//   - it isn't a duplicate (unique dedupe_key — see lib/ads/track.ts).
// Stores no IP, user agent or session id. Always answers 204.

const done = () => new NextResponse(null, { status: 204 })

export async function POST(req: Request) {
  if (isBot(req.headers.get('user-agent'))) return done()

  const parsed = trackBodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return done()
  const body = parsed.data

  try {
    const admin = createAdminClient()
    const { data: ad } = await admin
      .from('ads')
      .select('id, is_active, archived_at, starts_at, ends_at, placements')
      .eq('id', body.ad_id)
      .maybeSingle()
    if (!ad || !isLive(ad) || !ad.placements.includes(body.placement)) return done()

    const { error } = await admin.from('ad_events').upsert(
      {
        ad_id: ad.id,
        event_type: body.event,
        placement: body.placement,
        page_path: cleanPagePath(body.page_path),
        dedupe_key: dedupeKey(body, Date.now()),
      },
      { onConflict: 'dedupe_key', ignoreDuplicates: true }
    )
    if (error) console.error('Ad event insert error:', error.message)
  } catch (e) {
    console.error('Ad event failed:', e)
  }
  return done()
}
