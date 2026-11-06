import { getAdsForPlacement } from '@/lib/ads/queries'
import { getPlacement } from '@/lib/ads/placements'
import { AdSlotClient } from './ad-slot-client'

/**
 * Drop this anywhere to show the adverts the admin has assigned to a placement:
 *
 *   <AdSlot placement="article" className="mt-10" />
 *
 * Renders nothing at all when there is no live advert. `className` styles the
 * wrapper (spacing / max-width) and only appears when there is something to show.
 * New placements are registered in lib/ads/placements.ts.
 */
export async function AdSlot({ placement, className }: { placement: string; className?: string }) {
  const def = getPlacement(placement)
  if (!def) {
    if (process.env.NODE_ENV !== 'production') console.warn(`<AdSlot>: unknown placement "${placement}"`)
    return null
  }
  const ads = await getAdsForPlacement(placement)
  if (ads.length === 0) return null
  return <AdSlotClient ads={ads} placement={placement} layout={def.layout} maxAds={def.maxAds} className={className} />
}
