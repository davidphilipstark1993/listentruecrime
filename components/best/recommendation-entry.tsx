import Link from 'next/link'
import Image from 'next/image'
import { Headphones, Star, ArrowRight } from 'lucide-react'
import type { BestPodcast } from '@/lib/best-page'
import { describeEntry, listenUrlFor } from '@/lib/best-page'
import { formatLabel, isMustListen } from '@/lib/podcast-facets'
import { countryDisplayName } from '@/lib/country-names'
import { stripHtml, truncate } from '@/lib/utils'

interface Props {
  podcast: BestPodcast
  /** 1-based position, shown for ranked lists. */
  rank?: number
  priority?: boolean
  /** Platform whose listen link to show, when the section is platform-specific. */
  platform?: string
}

/**
 * One recommendation. Every line is rendered only if the field exists, so a
 * sparse record shows less rather than something invented.
 */
export function RecommendationEntry({ podcast: p, rank, priority = false, platform }: Props) {
  const { summary, who } = describeEntry(p)
  const country = countryDisplayName(p)
  const format = formatLabel(p)
  const listen = platform ? listenUrlFor(p, platform) : null

  return (
    <li className="card p-4 sm:p-5 flex gap-4 sm:gap-5 items-start">
      <Link href={`/podcasts/${p.slug}`} className="relative shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden bg-ink-700" aria-hidden tabIndex={-1}>
        {p.image_url ? (
          <Image src={p.image_url} alt="" width={96} height={96} className="w-full h-full object-cover" priority={priority} />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center"><Headphones size={26} className="text-ink-500" /></span>
        )}
      </Link>
      <div className="min-w-0 flex-1">
        <h3 className="font-serif text-lg text-stone leading-snug">
          {rank != null && <span className="text-crimson tabular-nums mr-2">{rank}.</span>}
          <Link href={`/podcasts/${p.slug}`} className="hover:text-white transition-colors">{p.title}</Link>
        </h3>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-subtle">
          {isMustListen(p) && (
            <span className="inline-flex items-center gap-1 text-crimson font-semibold"><Star size={10} fill="currentColor" aria-hidden />Must listen</span>
          )}
          {p.binge_factor != null && <span>Binge Factor {p.binge_factor}/10 <span className="sr-only">(editorial score)</span></span>}
          {country && <span>{country}</span>}
          {format && <span>{format}</span>}
          {p.case_types?.slice(0, 2).map(t => <span key={t} className="tag">{t}</span>)}
        </p>
        {summary && <p className="mt-2 text-sm text-stone-muted leading-relaxed">{summary}</p>}
        <dl className="mt-2 space-y-1 text-sm text-stone-muted leading-relaxed">
          {who && (
            <div><dt className="inline text-stone font-medium">Who it’s for: </dt><dd className="inline">{who}</dd></div>
          )}
          {p.best_episode_to_start && (
            <div><dt className="inline text-stone font-medium">Start with: </dt><dd className="inline">{truncate(stripHtml(p.best_episode_to_start), 140)}</dd></div>
          )}
        </dl>
        <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <Link href={`/podcasts/${p.slug}`} className="inline-flex items-center gap-1 text-crimson hover:underline">
            Read our review of {p.title} <ArrowRight size={13} aria-hidden />
          </Link>
          {listen && platform && (
            <a href={listen} target="_blank" rel="noopener noreferrer" className="text-stone-muted hover:text-stone underline underline-offset-2">
              Listen on {platform}
            </a>
          )}
        </p>
      </div>
    </li>
  )
}
