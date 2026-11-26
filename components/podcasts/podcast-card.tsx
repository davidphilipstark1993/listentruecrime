import Link from 'next/link'
import Image from 'next/image'
import { Headphones, Star } from 'lucide-react'
import type { Podcast, RatingStats } from '@/lib/types/database'
import { cn, countryFlag, scoreBg, stripHtml, truncate } from '@/lib/utils'
import { ratingStatsOf } from '@/lib/rating-stats'

interface PodcastCardProps {
  podcast: Podcast & { rating_stats?: RatingStats | null; review_count?: number }
  priority?: boolean
  className?: string
}

export function PodcastCard({ podcast, priority = false, className }: PodcastCardProps) {
  const stats = ratingStatsOf(podcast.rating_stats)
  const score = stats?.avg_overall
  const ratingCount = stats?.rating_count ?? 0
  const shortDescription = podcast.short_description ? stripHtml(podcast.short_description) : null

  return (
    <Link
      href={`/podcasts/${podcast.slug}`}
      className={cn('card-hover group relative flex flex-col h-full min-w-0', className)}
    >
      {/* Cover image */}
      <div className="relative aspect-square shrink-0 rounded-t-lg overflow-hidden bg-ink-700">
        {podcast.image_url ? (
          <Image
            src={podcast.image_url}
            alt={`${podcast.title} podcast artwork`}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 240px"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            priority={priority}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-ink-700 to-ink-800">
            <Headphones size={32} className="text-ink-500" />
          </div>
        )}

        {/* Score badge */}
        {score && (
          <div className={cn('absolute top-2 right-2 score-badge text-xs', scoreBg(score))} aria-hidden="true">
            {score.toFixed(1)}
          </div>
        )}

        {/* Quick verdict badge */}
        {podcast.quick_verdict === 'Must listen' && (
          <div className="absolute top-2 left-2 max-w-[calc(100%-3.5rem)] flex items-center gap-1 px-2 py-0.5 rounded-full bg-crimson text-white text-2xs font-semibold whitespace-nowrap">
            <Star size={9} fill="currentColor" aria-hidden="true" />
            Must listen
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-3 sm:p-3.5">
        {/* Tags — one on phones (two-column grid leaves ~130px), two from sm up.
            Single line so long case types can't stack and make the card tall. */}
        <div className="flex items-center gap-1.5 mb-1.5 min-w-0 overflow-hidden">
          {podcast.country && (
            <span className="text-stone-subtle text-xs shrink-0" aria-hidden="true">{countryFlag(podcast.country)}</span>
          )}
          {podcast.case_types?.slice(0, 2).map((t, i) => (
            <span key={t} className={cn('tag truncate min-w-0 max-w-full', i > 0 ? 'hidden sm:inline-block' : 'inline-block')}>{t}</span>
          ))}
        </div>

        {/* Title */}
        <h3 className="text-stone text-sm sm:text-[13px] font-semibold leading-snug mb-1 group-hover:text-white transition-colors line-clamp-2 break-words">
          {podcast.title}
        </h3>

        {/* Short description */}
        {shortDescription && (
          <p className="text-stone-subtle text-xs sm:text-[11px] leading-relaxed line-clamp-2 mb-2">
            {shortDescription}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-auto pt-2 border-t border-white/[0.05]">
          <div className="flex items-center gap-1 text-stone-muted text-xs">
            <Star size={11} className="text-gold-light" fill="currentColor" aria-hidden="true" />
            {score ? (
              <span><span className="sr-only">Community rating </span>{score.toFixed(1)}</span>
            ) : (
              <span><span aria-hidden="true">—</span><span className="sr-only">Not yet rated</span></span>
            )}
            {ratingCount > 0 && (
              <span className="text-stone-subtle">({ratingCount}<span className="sr-only"> ratings</span>)</span>
            )}
          </div>
        </div>
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
