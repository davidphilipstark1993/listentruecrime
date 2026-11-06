import { createAdminClient } from '@/lib/supabase/admin'

export interface Counts { impressions: number; clicks: number }
export interface DayCounts extends Counts { day: string }

export function ctr({ impressions, clicks }: Counts): number {
  return impressions > 0 ? (clicks / impressions) * 100 : 0
}
export function formatCtr(c: Counts): string {
  return c.impressions > 0 ? `${ctr(c).toFixed(2)}%` : '—'
}

export const RANGES = [
  { value: '7', label: '7 days', days: 7 },
  { value: '30', label: '30 days', days: 30 },
  { value: '90', label: '90 days', days: 90 },
  { value: 'all', label: 'All time', days: null },
] as const
export type RangeValue = (typeof RANGES)[number]['value']

export function parseRange(v: string | undefined): (typeof RANGES)[number] {
  return RANGES.find(r => r.value === v) ?? RANGES[1]
}

const n = (v: unknown) => Number(v ?? 0)

export async function getAdStats(days: number | null, adId?: string) {
  const admin = createAdminClient()
  const since = days ? new Date(Date.now() - days * 86400000).toISOString() : null

  const [byAd, byPlacement, daily] = await Promise.all([
    admin.rpc('ad_stats_by_ad', { p_since: since }),
    admin.rpc('ad_stats_by_placement', { p_since: since }),
    admin.rpc('ad_stats_daily', { p_since: since, p_ad_id: adId ?? null }),
  ])
  const error = byAd.error ?? byPlacement.error ?? daily.error
  if (error) return { ok: false as const, error: error.message }

  const adMap = new Map<string, Counts>(
    ((byAd.data ?? []) as { ad_id: string; impressions: number; clicks: number }[]).map(r => [r.ad_id, { impressions: n(r.impressions), clicks: n(r.clicks) }])
  )
  const placements = ((byPlacement.data ?? []) as { placement: string; impressions: number; clicks: number }[]).map(r => ({
    placement: r.placement, impressions: n(r.impressions), clicks: n(r.clicks),
  }))
  const dailyRows = ((daily.data ?? []) as { day: string; impressions: number; clicks: number }[]).map(r => ({
    day: r.day, impressions: n(r.impressions), clicks: n(r.clicks),
  }))
  const totals: Counts = { impressions: 0, clicks: 0 }
  adMap.forEach(c => { totals.impressions += c.impressions; totals.clicks += c.clicks })

  return { ok: true as const, byAd: adMap, byPlacement: placements, daily: fillDays(dailyRows, days), totals }
}

/** Zero-fills days with no events so the chart's time axis is continuous. */
export function fillDays(rows: DayCounts[], days: number | null): DayCounts[] {
  const byDay = new Map(rows.map(r => [r.day, r]))
  const toKey = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London' }).format(d) // YYYY-MM-DD
  const end = new Date()
  const first = rows[0] ? new Date(`${rows[0].day}T12:00:00Z`) : end
  const start = days ? new Date(end.getTime() - (days - 1) * 86400000) : first
  const out: DayCounts[] = []
  for (let t = start.getTime(); t <= end.getTime() + 3600000; t += 86400000) {
    const key = toKey(new Date(t))
    if (out.length && out[out.length - 1].day === key) continue
    out.push(byDay.get(key) ?? { day: key, impressions: 0, clicks: 0 })
  }
  return out
}
