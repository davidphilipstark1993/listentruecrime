import Link from 'next/link'
import Image from 'next/image'
import { Headphones, Star } from 'lucide-react'
import type { Podcast, RatingStats } from '@/lib/types/database'
import { cn, countryFlag, stripHtml } from '@/lib/utils'
import { communityRatingOf, editorScoreOf, formatScore, NOT_ENOUGH_RATINGS_LABEL } from '@/lib/rating-stats'

interface PodcastCardProps {
  podcast: Podcast & { rating_stats?: RatingStats | null; review_count?: number }
  priority?: boolean
  className?: string
}

export function PodcastCard({ podcast, priority = false, className }: PodcastCardProps) {
  const community = communityRatingOf(podcast.rating_stats)
  const editorScore = editorScoreOf(podcast)
  const shortDescription = podcast.short_description ? stripHtml(podcast.short_description) : null

  return (
    <Link
      href={`/podcasts/${podcast.slug}`}
      className={cn('card-hover group block', className)}
    >
      {/* Cover image */}
      <div className="relative aspect-square rounded-t-lg overflow-hidden bg-ink-700">
        {podcast.image_url ? (
          <Image
            src={podcast.image_url}
            alt={`${podcast.title} podcast artwork`}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            priority={priority}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-ink-700 to-ink-800">
            <Headphones size={32} className="text-ink-500" />
          </div>
        )}

        {/* Quick verdict badge */}
        {podcast.quick_verdict === 'Must listen' && (
          <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-crimson text-white text-2xs font-semibold">
            <Star size={9} fill="currentColor" />
            Must listen
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3.5">
        {/* Tags */}
        <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
          {podcast.country && (
            <span className="text-stone-subtle text-2xs">{countryFlag(podcast.country)}</span>
          )}
          {podcast.case_types?.slice(0, 2).map(t => (
            <span key={t} className="tag">{t}</span>
          ))}
        </div>

        {/* Title */}
        <h3 className="text-stone text-[13px] font-semibold leading-snug mb-1 group-hover:text-white transition-colors line-clamp-2">
          {podcast.title}
        </h3>

        {/* Short description */}
        {shortDescription && (
          <p className="text-stone-subtle text-[11px] leading-relaxed line-clamp-2 mb-2">
            {shortDescription}
          </p>
        )}

        {/* Footer: editorial score and community rating are shown separately */}
        <div className="mt-auto pt-2 border-t border-white/[0.05] space-y-1 text-2xs">
          <div className="flex items-center justify-between text-stone-subtle">
            <span>Editor score</span>
            <span className="text-stone-muted font-medium">
              {editorScore != null ? `${formatScore(editorScore)}/10` : '—'}
            </span>
          </div>
          <div className="flex items-center justify-between text-stone-subtle">
            <span>Community</span>
            {community ? (
              <span className="flex items-center gap-1 text-stone-muted">
                <Star size={10} className="text-gold-light" fill="currentColor" />
                {community.average.toFixed(1)}
                <span className="text-stone-faint">({community.count})</span>
              </span>
            ) : (
              <span className="text-stone-faint">{NOT_ENOUGH_RATINGS_LABEL}</span>
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
