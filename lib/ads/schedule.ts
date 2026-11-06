export type AdStatus = 'live' | 'scheduled' | 'expired' | 'inactive' | 'archived'

interface Schedulable {
  is_active: boolean
  archived_at: string | null
  starts_at: string | null
  ends_at: string | null
}

/** The single definition of "is this advert showable right now". */
export function adStatus(ad: Schedulable, now: Date = new Date()): AdStatus {
  if (ad.archived_at) return 'archived'
  if (!ad.is_active) return 'inactive'
  const t = now.getTime()
  if (ad.starts_at && new Date(ad.starts_at).getTime() > t) return 'scheduled'
  if (ad.ends_at && new Date(ad.ends_at).getTime() <= t) return 'expired'
  return 'live'
}

export function isLive(ad: Schedulable, now: Date = new Date()): boolean {
  return adStatus(ad, now) === 'live'
}

/** Time-window check only, for the browser (which already knows the advert is active). */
export function inWindow(startsAt: string | null, endsAt: string | null, nowMs: number): boolean {
  if (startsAt && new Date(startsAt).getTime() > nowMs) return false
  if (endsAt && new Date(endsAt).getTime() <= nowMs) return false
  return true
}
