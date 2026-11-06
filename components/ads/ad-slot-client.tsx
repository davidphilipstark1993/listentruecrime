'use client'
import { useEffect, useState } from 'react'
import { inWindow } from '@/lib/ads/schedule'
import type { AdLayout } from '@/lib/ads/placements'
import type { PublicAd } from '@/lib/ads/types'
import { AdCard } from './ad-card'
import { cn } from '@/lib/utils'

interface Props {
  ads: PublicAd[]
  placement: string
  layout: AdLayout
  maxAds: number
  className?: string
}

const MAX_TIMEOUT = 2 ** 31 - 1

/**
 * Owns the wrapper as well as the cards, so when nothing is showable the
 * whole slot (padding, borders and all) disappears rather than leaving a gap.
 *
 * First render matches the server HTML exactly (visibleAtRender). After
 * hydration it re-checks the clock and schedules itself for the next advert
 * start or end, so scheduled adverts appear and expired ones vanish on time
 * even when the page itself is cached.
 */
export function AdSlotClient({ ads, placement, layout, maxAds, className }: Props) {
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const tick = () => {
      const t = Date.now()
      setNow(t)
      const next = ads
        .flatMap(a => [a.startsAt, a.endsAt])
        .filter((d): d is string => Boolean(d))
        .map(d => new Date(d).getTime())
        .filter(ms => ms > t)
        .sort((a, b) => a - b)[0]
      if (next) timer = setTimeout(tick, Math.min(next - t + 250, MAX_TIMEOUT))
    }
    tick()
    return () => clearTimeout(timer)
  }, [ads])

  const visible = ads
    .filter(a => (now === null ? a.visibleAtRender : inWindow(a.startsAt, a.endsAt, now)))
    .slice(0, maxAds)
  if (visible.length === 0) return null

  // Two adverts share a row as stacked cards rather than two cramped side-by-side panels
  const effective: AdLayout = layout === 'feature' && visible.length > 1 ? 'card' : layout

  return (
    <aside aria-label="Recommended from our network" className={className}>
      <div className={cn(visible.length > 1 && 'grid gap-5 sm:grid-cols-2')}>
        {visible.map(ad => (
          <AdCard key={ad.id} ad={ad} layout={effective} placement={placement} uniform={visible.length > 1} />
        ))}
      </div>
    </aside>
  )
}
