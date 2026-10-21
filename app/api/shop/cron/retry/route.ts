import { timingSafeEqual } from 'crypto'
import { NextResponse } from 'next/server'
import { sanitizeEnv } from '@/lib/utils'
import { processDueRetries } from '@/lib/shop/orders'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

// Called every ~15 minutes by .github/workflows/shop-retry-fulfilment.yml.
// Protected by a shared secret (SHOP_CRON_SECRET) sent as a Bearer token.
export async function POST(req: Request) {
  const secret = process.env.SHOP_CRON_SECRET ? sanitizeEnv(process.env.SHOP_CRON_SECRET) : ''
  const given = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  const ok = secret.length >= 16 && given.length === secret.length && timingSafeEqual(Buffer.from(given), Buffer.from(secret))
  if (!ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  return NextResponse.json(await processDueRetries())
}
