import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Headphones, Star } from 'lucide-react'
import type { Podcast } from '@/lib/types/database'
import { COUNTRIES } from '@/lib/types/database'
import { countryFlag } from '@/lib/utils'
import { audienceLine, clean, isMustListen } from '@/lib/best-page-picks'

export type RankedPodcast = Pick<
  Podcast,
  | 'id' | 'slug' | 'title' | 'image_url' | 'short_description' | 'newsletter_worthy_summary' | 'country'
  | 'country_name' | 'case_types' | 'format_type' | 'host_name' | 'host_style' | 'factual_style'
  | 'binge_factor' | 'episode_length' | 'episode_count' | 'best_episode_to_start' | 'platforms'
  | 'platform_urls' | 'quick_verdict'
>

interface Props {
  podcast: RankedPodcast
  rank: number
  priority?: boolean
}

function formatLabel(format: string | null): string | null {
  const f = (format ?? '').toLowerCase()
  if (f.startsWith('serial')) return 'Serialised'
  if (f === 'episodic') return 'Episodic'
  if (f === 'both') return 'Serialised and episodic'
  return null
}

/** One ranked pick: artwork, key facts, our verdict and where to start. Lines render only when the field exists. */
export function RankedPodcastEntry({ podcast: p, rank, priority = false }: Props) {
  const verdict = clean(p.newsletter_worthy_summary)
  const bestFor = audienceLine(p.short_description)
  const synopsis = bestFor ? null : clean(p.short_description)
  const country = p.country_name || (p.country ? COUNTRIES[p.country] : null)
  const format = formatLabel(p.format_type)
  const start = clean(p.best_episode_to_start)
  const length = clean(p.episode_length)
  const episodes = clean(p.episode_count)
  const platforms = (p.platforms ?? []).filter(Boolean)
  const urls = p.platform_urls ?? {}

  const facts: { label: string; value: string }[] = []
  if (p.host_name) facts.push({ label: 'Host', value: p.host_name })
  if (episodes) facts.push({ label: 'Episodes', value: episodes })
  if (length) facts.push({ label: 'Length', value: length })
  if (p.factual_style) facts.push({ label: 'Tone', value: p.factual_style })
  if (start) facts.push({ label: 'Start with', value: start })

  return (
    <li id={`pick-${rank}`} className="card overflow-hidden scroll-mt-24">
      <article className="flex flex-col sm:flex-row gap-5 p-5 sm:p-6">
        <Link
          href={`/podcasts/${p.slug}`}
          className="relative shrink-0 w-full sm:w-44 md:w-52 aspect-square rounded-xl overflow-hidden bg-ink-700 self-start"
        >
          {p.image_url ? (
            <Image
              src={p.image_url}
              alt={`${p.title} podcast cover art`}
              fill
              sizes="(max-width: 640px) 100vw, 208px"
              className="object-cover"
              priority={priority}
            />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-ink-700 to-ink-800">
              <Headphones size={40} className="text-ink-500" aria-hidden />
            </span>
          )}
        </Link>

        <div className="min-w-0 flex-1">
          <h3 className="font-serif text-2xl text-stone leading-tight">
            <Link href={`/podcasts/${p.slug}`} className="hover:text-white transition-colors">
              <span className="text-crimson tabular-nums mr-2">{rank}.</span>{p.title}
            </Link>
          </h3>

          <p className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            {isMustListen(p) && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-crimson text-white font-semibold">
                <Star size={10} fill="currentColor" aria-hidden /> Must listen
              </span>
            )}
            {p.binge_factor != null && (
              <span className="px-2 py-0.5 rounded-full bg-gold-DEFAULT/10 border border-gold-DEFAULT/20 text-gold-light font-medium">
                Binge Factor {p.binge_factor}/10
              </span>
            )}
            {country && (
              <span className="px-2 py-0.5 rounded-full bg-ink-700 text-stone-muted">
                {countryFlag(p.country)} {country}
              </span>
            )}
            {format && <span className="px-2 py-0.5 rounded-full bg-ink-700 text-stone-muted">{format}</span>}
            {p.case_types?.slice(0, 3).map(t => <span key={t} className="tag">{t}</span>)}
          </p>

          {verdict && <p className="mt-4 text-stone leading-relaxed">{verdict}</p>}
          {synopsis && <p className="mt-3 text-stone-muted text-sm leading-relaxed">{synopsis}</p>}
          {bestFor && (
            <p className="mt-3 text-sm text-stone-muted leading-relaxed">
              <span className="text-stone font-medium">Best for: </span>{bestFor}
            </p>
          )}

          {facts.length > 0 && (
            <dl className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
              {facts.map(f => (
                <div key={f.label} className="flex gap-2 min-w-0">
                  <dt className="text-stone-subtle shrink-0">{f.label}:</dt>
                  <dd className="text-stone-muted min-w-0">{f.value}</dd>
                </div>
              ))}
            </dl>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <Link
              href={`/podcasts/${p.slug}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-crimson text-white font-medium hover:bg-crimson/90 transition-colors"
            >
              Read our {p.title} review <ArrowRight size={14} aria-hidden />
            </Link>
            {platforms.length > 0 && (
              <span className="text-stone-subtle">
                Listen on{' '}
                {platforms.map((name, i) => (
                  <span key={name}>
                    {i > 0 && (i === platforms.length - 1 ? ' and ' : ', ')}
                    {urls[name] ? (
                      <a href={urls[name]} target="_blank" rel="noopener noreferrer" className="text-stone-muted underline underline-offset-2 hover:text-stone">{name}</a>
                    ) : (
                      <span className="text-stone-muted">{name}</span>
                    )}
                  </span>
                ))}
              </span>
            )}
          </div>
        </div>
      </article>
    </li>
  )
}
