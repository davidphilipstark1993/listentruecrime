import type { ReactNode } from 'react'

interface EpisodeCardProps {
  /** Short label for why this pick is here, e.g. "Best for newcomers". */
  label: string
  show: string
  episode: string
  /** e.g. "Morbid · May 2024 · 90 min" */
  meta?: string
  /** Direct episode link (Apple Podcasts or the publisher's own page). */
  href: string
  linkLabel?: string
  /** Optional second link, e.g. the show's episode page with sources. */
  secondaryHref?: string
  secondaryLabel?: string
  children: ReactNode
}

/**
 * A single recommended podcast episode, for case guides where the pick is an
 * episode of a show rather than a podcast in our directory (PodcastRecommendation
 * covers those). Plain props so it works from MDX.
 */
export function EpisodeCard({
  label,
  show,
  episode,
  meta,
  href,
  linkLabel = 'Listen on Apple Podcasts',
  secondaryHref,
  secondaryLabel,
  children,
}: EpisodeCardProps) {
  return (
    <div className="not-prose my-6 rounded-xl border border-white/[0.07] bg-ink-800/40 p-5">
      <p className="text-2xs font-semibold uppercase tracking-widest text-crimson mb-2">{label}</p>
      <p className="text-base font-serif font-semibold text-stone leading-snug">{show}</p>
      <p className="text-sm text-stone mt-0.5">&ldquo;{episode}&rdquo;</p>
      {meta && <p className="text-xs text-stone-subtle mt-1">{meta}</p>}
      <div className="mt-3 text-sm text-stone-muted leading-relaxed space-y-2 [&_strong]:text-stone [&_strong]:font-semibold">
        {children}
      </div>
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">
        <a href={href} target="_blank" rel="noopener noreferrer" className="text-crimson hover:underline">
          {linkLabel} &rarr;
        </a>
        {secondaryHref && (
          <a href={secondaryHref} target="_blank" rel="noopener noreferrer" className="text-stone-subtle hover:text-stone hover:underline">
            {secondaryLabel ?? 'Episode page'} &rarr;
          </a>
        )}
      </div>
    </div>
  )
}
