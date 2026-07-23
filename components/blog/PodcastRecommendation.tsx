import Link from 'next/link'
import Image from 'next/image'
import { Star } from 'lucide-react'

interface PodcastRecommendationProps {
  title: string
  slug: string
  description: string
  rating?: number
  imageUrl?: string
  tags?: string[]
}

export function PodcastRecommendation({
  title,
  slug,
  description,
  rating,
  imageUrl,
  tags = [],
}: PodcastRecommendationProps) {
  return (
    <Link
      href={`/podcasts/${slug}`}
      className="group flex gap-4 rounded-xl border border-white/[0.07] bg-ink-800/40 p-4 hover:bg-ink-700/50 hover:border-crimson/30 transition-all not-prose"
    >
      {imageUrl && (
        <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-ink-700">
          <Image
            src={imageUrl}
            alt={title}
            width={64}
            height={64}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-sm font-semibold text-stone group-hover:text-white transition-colors truncate">
            {title}
          </p>
          {rating && (
            <span className="flex items-center gap-0.5 text-xs text-gold-light flex-shrink-0">
              <Star className="w-3 h-3 fill-gold-light" />
              {rating}/10
            </span>
          )}
        </div>
        <p className="text-xs text-stone-subtle leading-relaxed line-clamp-2">{description}</p>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {tags.slice(0, 3).map(tag => (
              <span
                key={tag}
                className="text-2xs px-1.5 py-0.5 rounded bg-ink-600 text-stone-subtle"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  )
}
