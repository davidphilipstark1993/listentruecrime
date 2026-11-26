import Link from 'next/link'
import Image from 'next/image'
import { Flame, Headphones, Star } from 'lucide-react'
import type { Podcast, RatingStats } from '@/lib/types/database'
import { cn, countryFlag, scoreBg, stripHtml } from '@/lib/utils'
import { ratingStatsOf } from '@/lib/rating-stats'

interface PodcastCardProps {
  podcast: Podcast & { rating_stats?: RatingStats | null; review_count?: number }
  priority?: boolean
  className?: string
  /**
   * 'compact' is for dense 3-up grids (homepage Trending): below lg it shows
   * just artwork, title and scores so three cards fit across a phone; from lg
   * it becomes a horizontal card (artwork left, details right) so a 3×2 grid
   * stays a sensible height on desktop.
   */
  variant?: 'default' | 'compact'
  /** Override the responsive image sizes hint for unusual grids. */
  sizes?: string
}

export function PodcastCard({ podcast, priority = false, className, variant = 'default', sizes }: PodcastCardProps) {
  const stats = ratingStatsOf(podcast.rating_stats)
  const score = stats?.avg_overall
  const ratingCount = stats?.rating_count ?? 0
  const shortDescription = podcast.short_description ? stripHtml(podcast.short_description) : null
  const binge = podcast.binge_factor != null ? Number(podcast.binge_factor) : null
  const compact = variant === 'compact'

  return (
    <Link
      href={`/podcasts/${podcast.slug}`}
      className={cn(
        'card-hover group relative flex flex-col h-full min-w-0',
        compact && 'lg:flex-row',
        className
      )}
    >
      {/* Cover image */}
      <div
        className={cn(
          'relative aspect-square shrink-0 rounded-t-lg overflow-hidden bg-ink-700',
          compact && 'lg:w-40 lg:self-start lg:rounded-tr-none lg:rounded-l-lg'
        )}
      >
        {podcast.image_url ? (
          <Image
            src={podcast.image_url}
            alt={`${podcast.title} podcast artwork`}
            fill
            sizes={sizes ?? (compact
              ? '(max-width: 1024px) 33vw, 160px'
              : '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 240px')}
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            priority={priority}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-ink-700 to-ink-800">
            <Headphones size={compact ? 24 : 32} className="text-ink-500" aria-hidden="true" />
          </div>
        )}

        {/* Community score badge */}
        {score && (
          // The colour tint is translucent, so it sits on an opaque dark base to
          // stay legible over busy or light artwork.
          <div className={cn('absolute top-2 right-2 rounded-lg bg-ink-950/90 shadow-card ring-1 ring-white/10', compact && 'max-lg:top-1.5 max-lg:right-1.5')} aria-hidden="true">
            <div className={cn('score-badge text-xs', compact && 'max-lg:w-8 max-lg:h-8', scoreBg(score))}>
              {score.toFixed(1)}
            </div>
          </div>
        )}

        {/* Quick verdict badge — a star-only dot on compact phone cards, where the label won't fit */}
        {podcast.quick_verdict === 'Must listen' && (
          <div
            className={cn(
              'absolute top-2 left-2 max-w-[calc(100%-3.5rem)] flex items-center gap-1 px-2 py-0.5 rounded-full bg-crimson text-white text-2xs font-semibold whitespace-nowrap',
              compact && 'max-lg:top-1.5 max-lg:left-1.5 max-lg:p-1'
            )}
          >
            <Star size={9} fill="currentColor" aria-hidden="true" />
            <span className={cn(compact && 'max-lg:sr-only')}>Must listen</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className={cn('flex flex-col flex-1 min-w-0', compact ? 'p-2.5 sm:p-3 lg:p-4' : 'p-3 sm:p-3.5')}>
        {/* Tags — one on phones (two-column grid leaves ~130px), two from sm up.
            Single line so long case types can't stack and make the card tall. */}
        <div className={cn('items-center gap-1.5 mb-1.5 min-w-0 overflow-hidden', compact ? 'hidden lg:flex' : 'flex')}>
          {podcast.country && (
            <span className="text-stone-subtle text-xs shrink-0" aria-hidden="true">{countryFlag(podcast.country)}</span>
          )}
          {podcast.case_types?.slice(0, 2).map((t, i) => (
            <span key={t} className={cn('tag truncate min-w-0 max-w-full', i === 0 ? 'inline-block' : compact ? 'hidden' : 'hidden sm:inline-block')}>{t}</span>
          ))}
        </div>

        {/* Title */}
        <h3
          className={cn(
            'text-stone font-semibold leading-snug mb-1 group-hover:text-white transition-colors line-clamp-2 break-words',
            compact ? 'text-[13px] sm:text-sm lg:text-[15px]' : 'text-sm sm:text-[13px]'
          )}
        >
          {podcast.title}
        </h3>

        {/* Short description */}
        {shortDescription && (
          <p className={cn('text-stone-subtle leading-relaxed line-clamp-2 mb-2', compact ? 'hidden lg:block text-xs' : 'text-xs sm:text-[11px]')}>
            {shortDescription}
          </p>
        )}

        {/* Footer: editorial Binge Factor (every reviewed show has one) and the
            community score once people have rated it — never an empty "—". */}
        {(binge != null || ratingCount > 0) && (
          <div className={cn('flex flex-wrap items-center gap-x-3 gap-y-1 mt-auto pt-2', !compact && 'border-t border-white/[0.05]')}>
            {binge != null && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-gold-light">
                <Flame size={12} aria-hidden="true" />
                <span><span className="sr-only">Binge Factor </span>{binge.toFixed(0)}<span className="text-stone-subtle font-normal">/10</span></span>
              </span>
            )}
            {ratingCount > 0 && score && (
              <span className={cn('items-center gap-1 text-xs text-stone-muted', compact ? 'hidden sm:inline-flex' : 'inline-flex')}>
                <Star size={11} className="text-gold-light" fill="currentColor" aria-hidden="true" />
                <span><span className="sr-only">Community rating </span>{score.toFixed(1)} <span className="text-stone-subtle">({ratingCount}<span className="sr-only"> ratings</span>)</span></span>
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  )
}

export function PodcastCardSkeleton() {
  return (
    <div className="card overflow-hidden">
      <div className="aspect-square skeleton" />
      <div className="p-3.5 space-y-2">
        <div className="flex gap-1.5">
          <div className="skeleton h-4 w-12 rounded-full" />
          <div className="skeleton h-4 w-16 rounded-full" />
        </div>
        <div className="skeleton h-4 w-full rounded" />
        <div className="skeleton h-3 w-3/4 rounded" />
        <div className="skeleton h-3 w-1/2 rounded" />
      </div>
    </div>
  )
}
