import { cache } from 'react'
import { createAdminClient } from '@/lib/supabase/admin'
import { AD_SOURCE_SITE, AD_UTM_MEDIUM, adImageUrl, isNetworkUrl } from './config'
import { getPlacement } from './placements'
import { isLive } from './schedule'
import { buildTrackedUrl, slugifyCampaign } from './utm'
import type { Ad, PublicAd } from './types'

// Pages that show adverts are statically cached (ISR, up to an hour). So the
// server also sends adverts that START within this horizon, marked
// visibleAtRender=false; the browser reveals them at their exact start time.
// Adverts that END are hidden by the browser at their exact end time. Pausing,
// archiving or deleting revalidates the whole site immediately.
const START_HORIZON_MS = 2 * 60 * 60 * 1000

// One query per render, shared by every <AdSlot> on the page. Never throws:
// if the table is missing or Supabase hiccups, the page simply has no adverts.
const getCandidatePool = cache(async (): Promise<Ad[]> => {
  try {
    const now = new Date()
    const horizon = new Date(now.getTime() + START_HORIZON_MS).toISOString()
    const { data, error } = await createAdminClient()
      .from('ads')
      .select('*')
      .eq('is_active', true)
      .is('archived_at', null)
      .or(`ends_at.is.null,ends_at.gt.${now.toISOString()}`)
      .or(`starts_at.is.null,starts_at.lte.${horizon}`)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })
    if (error) {
      console.error('Ads query error:', error.message)
      return []
    }
    return (data ?? []) as Ad[]
  } catch (e) {
    console.error('Ads query failed:', e)
    return []
  }
})

export function toPublicAd(ad: Ad, placement: string, now: Date = new Date()): PublicAd {
  return {
    id: ad.id,
    title: ad.title,
    description: ad.description,
    href: buildTrackedUrl(ad.destination_url, {
      source: AD_SOURCE_SITE,
      medium: AD_UTM_MEDIUM,
      campaign: ad.utm_campaign || slugifyCampaign(ad.title),
      content: placement,
    }),
    rel: isNetworkUrl(ad.destination_url) ? 'noopener' : 'sponsored noopener',
    buttonText: ad.button_text,
    imageUrl: adImageUrl(ad.image_path),
    imageAlt: ad.image_alt ?? '',
    width: ad.image_width,
    height: ad.image_height,
    startsAt: ad.starts_at,
    endsAt: ad.ends_at,
    visibleAtRender: isLive(ad, now),
  }
}

export async function getAdsForPlacement(placement: string): Promise<PublicAd[]> {
  if (!getPlacement(placement)) return []
  const now = new Date()
  const pool = await getCandidatePool()
  return pool.filter(a => a.placements.includes(placement)).map(a => toPublicAd(a, placement, now))
}
