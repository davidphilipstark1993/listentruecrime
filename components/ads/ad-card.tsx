'use client'
import { useEffect, useRef } from 'react'
import Image from 'next/image'
import { ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AD_LABEL } from '@/lib/ads/config'
import { observeViewable, sendAdEvent, trackAdClick } from '@/lib/ads/client'
import type { AdLayout } from '@/lib/ads/placements'
import type { PublicAd } from '@/lib/ads/types'

interface AdCardProps {
  ad: PublicAd
  layout: AdLayout
  placement: string
  /** Admin preview: renders identically but never tracks and never navigates. */
  preview?: boolean
  /** Several adverts share a row: use one 16:9 frame for all so the cards line up. */
  uniform?: boolean
}

/**
 * One advert. The artwork frame takes its aspect ratio from the stored image
 * size, so its space is reserved before the image loads (no layout shift).
 * Odd ratios are clamped between 5:4 and 2.4:1 and cropped to fit.
 */
export function AdCard({ ad, layout, placement, preview = false, uniform = false }: AdCardProps) {
  const ref = useRef<HTMLElement>(null)
  const ratio = (uniform ? 16 / 9 : Math.min(Math.max(ad.width / ad.height, 1.25), 2.4)).toFixed(4)

  useEffect(() => {
    const el = ref.current
    if (preview || !el) return
    const key = `ltc-ad-imp:${ad.id}:${placement}:${window.location.pathname}`
    try {
      if (sessionStorage.getItem(key)) return // already counted this session
    } catch {}
    return observeViewable(el, () => {
      try { sessionStorage.setItem(key, '1') } catch {}
      sendAdEvent('impression', ad.id, placement)
    })
  }, [ad.id, placement, preview])

  const isFeature = layout === 'feature'
  const isBanner = layout === 'banner'

  return (
    <article
      ref={ref}
      data-ad-id={ad.id}
      style={{ ['--ar' as string]: ratio }}
      className={cn(
        'group relative overflow-hidden rounded-xl bg-ink-800 border border-white/[0.06] shadow-card',
        'transition-all duration-300 hover:border-crimson/30 hover:shadow-glow-crimson',
        isFeature && 'md:grid md:grid-cols-[1.15fr_1fr]',
        isBanner && 'sm:flex sm:items-stretch'
      )}
    >
      <div
        className={cn(
          'relative w-full aspect-[var(--ar)] bg-ink-700',
          isFeature && 'md:aspect-auto md:min-h-[280px]',
          isBanner && 'sm:w-56 lg:w-72 sm:shrink-0 sm:aspect-auto sm:min-h-[120px]'
        )}
      >
        <Image
          src={ad.imageUrl}
          alt={ad.imageAlt}
          fill
          sizes={isFeature ? '(min-width: 1024px) 640px, (min-width: 768px) 55vw, 100vw' : isBanner ? '(min-width: 1024px) 288px, (min-width: 640px) 224px, 100vw' : '(min-width: 1024px) 420px, (min-width: 640px) 50vw, 100vw'}
          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          unoptimized={preview && ad.imageUrl.startsWith('blob:')}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950/40 to-transparent pointer-events-none" />
      </div>

      <div className={cn('p-5', isFeature && 'md:p-8 md:flex md:flex-col md:justify-center', isBanner && 'sm:flex-1 sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-5')}>
        <div className="min-w-0">
          <p className="text-2xs font-semibold uppercase tracking-widest text-crimson mb-2">{AD_LABEL}</p>
          <h3 className={cn('font-serif font-semibold text-stone leading-snug', isFeature ? 'text-xl md:text-2xl' : 'text-lg')}>{ad.title}</h3>
          {ad.description && (
            <p className={cn('text-stone-muted text-sm leading-relaxed mt-2', isBanner && 'line-clamp-2')}>{ad.description}</p>
          )}
        </div>
        {/* The button is the card's only link; its ::after stretches it over the whole card,
            so the full card is tappable on mobile without a second, duplicate link. */}
        <a
          href={preview ? '#' : ad.href}
          target={preview ? undefined : '_blank'}
          rel={ad.rel}
          onClick={preview ? e => e.preventDefault() : () => trackAdClick(ad.id, placement)}
          onAuxClick={preview ? undefined : e => { if (e.button === 1) trackAdClick(ad.id, placement) }}
          className={cn(
            'btn-primary mt-4 after:absolute after:inset-0 after:content-[""] focus-visible:after:ring-2 focus-visible:after:ring-crimson/60 focus-visible:after:rounded-xl',
            isBanner && 'sm:mt-0 sm:shrink-0',
            'self-start'
          )}
        >
          {ad.buttonText}
          <ArrowUpRight size={15} aria-hidden="true" className="shrink-0" />
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      </div>
    </article>
  )
}
