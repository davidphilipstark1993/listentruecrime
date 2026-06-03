export const revalidate = 3600

import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'
import { Star, Clock, Headphones, Globe, BookmarkPlus, ExternalLink, ChevronRight } from 'lucide-react'
import { supabasePublic } from '@/lib/supabase/public'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { RatingWidget } from '@/components/podcasts/rating-widget'
import { ReviewForm } from '@/components/podcasts/review-form'
import { PodcastCard } from '@/components/podcasts/podcast-card'
import { NewsletterForm } from '@/components/newsletter/newsletter-form'
import { countryFlag, formatRelativeDate, scoreBg, cn } from '@/lib/utils'
import { COUNTRIES } from '@/lib/types/database'
import { BASE, breadcrumbSchema, faqSchema, podcastSchema } from '@/lib/seo'

interface Props {
  params: Promise<{ slug: string }>
}

async function getPodcast(slug: string) {
  const { data } = await supabasePublic
    .from('podcasts')
    .select(`
      *,
      rating_stats:podcast_rating_stats(*),
      review_count:podcast_review_counts(review_count)
    `)
    .eq('slug', slug)
    .eq('is_published', true)
    .single()

  return data
}

async function getReviews(podcastId: string) {
  const { data } = await supabasePublic
    .from('reviews')
    .select(`*, profile:profiles(username, avatar_url)`)
    .eq('podcast_id', podcastId)
    .eq('approved', true)
    .order('created_at', { ascending: false })
    .limit(20)

  return data ?? []
}

async function getSimilarPodcasts(podcast: any) {
  if (!podcast.if_you_liked_this?.length) return []
  const { data } = await supabasePublic
    .from('podcasts')
    .select(`*, rating_stats:podcast_rating_stats(*)`)
    .in('slug', podcast.if_you_liked_this)
    .eq('is_published', true)
    .limit(4)

  return data ?? []
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const podcast = await getPodcast(slug)
  if (!podcast) return {}

  const description = podcast.short_description
    || (podcast.description ? `${podcast.description.slice(0, 155)}…` : null)
    || `Discover ${podcast.title} on ListenTrueCrime. Community ratings, expert review, and where to listen.`

  const url = `${BASE}/podcasts/${slug}`

  return {
    title: podcast.title,
    description,
    alternates: { canonical: url },
    keywords: [
      ...(podcast.case_types ?? []),
      'true crime podcast',
      `${podcast.title} review`,
      `${podcast.title} podcast`,
      podcast.country ? `${COUNTRIES[podcast.country]} true crime` : '',
    ].filter(Boolean),
    openGraph: {
      title: `${podcast.title} — True Crime Podcast Review`,
      description,
      url,
      type: 'music.radio_station',
      images: podcast.image_url
        ? [{ url: podcast.image_url, width: 1400, height: 1400, alt: `${podcast.title} podcast cover art` }]
        : [{ url: `${BASE}/logo.png`, width: 1200, height: 630, alt: 'ListenTrueCrime' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${podcast.title} | ListenTrueCrime`,
      description,
      images: podcast.image_url ? [podcast.image_url] : [`${BASE}/logo.png`],
    },
  }
}

function buildFaqs(podcast: any): Array<{ q: string; a: string }> {
  const faqs: Array<{ q: string; a: string }> = []

  const summary = podcast.short_description ?? podcast.description?.slice(0, 300)
  if (summary) {
    faqs.push({ q: `What is ${podcast.title}?`, a: summary })
  }

  if (podcast.quick_verdict) {
    const verdict = podcast.newsletter_worthy_summary
      ? `${podcast.quick_verdict}. ${podcast.newsletter_worthy_summary}`
      : podcast.quick_verdict
    faqs.push({ q: `Is ${podcast.title} worth listening to?`, a: verdict })
  }

  if (podcast.platforms?.length) {
    faqs.push({
      q: `Where can I listen to ${podcast.title}?`,
      a: `${podcast.title} is available on ${podcast.platforms.join(', ')}.`,
    })
  }

  if (podcast.best_episode_to_start) {
    faqs.push({
      q: `Where should I start with ${podcast.title}?`,
      a: `Start with: ${podcast.best_episode_to_start}`,
    })
  }

  if (podcast.format_type) {
    const detail = [
      podcast.episode_count ? `${podcast.episode_count} episodes` : null,
      podcast.episode_length ? `approximately ${podcast.episode_length} each` : null,
    ].filter(Boolean).join(', ')
    faqs.push({
      q: `What format is ${podcast.title}?`,
      a: detail ? `${podcast.format_type} — ${detail}.` : podcast.format_type,
    })
  }

  if (podcast.case_types?.length) {
    faqs.push({
      q: `What type of crime does ${podcast.title} cover?`,
      a: `${podcast.title} covers ${podcast.case_types.join(', ')}.`,
    })
  }

  return faqs
}

const RatingBar = ({ label, value }: { label: string; value: number | null }) => (
  <div className="flex items-center gap-3">
    <span className="text-xs text-stone-muted w-32 shrink-0">{label}</span>
    <div className="flex-1 h-1.5 bg-ink-700 rounded-full overflow-hidden">
      <div
        className="h-full bg-gradient-to-r from-crimson to-gold-DEFAULT rounded-full transition-all duration-700"
        style={{ width: value ? `${value * 10}%` : '0%' }}
      />
    </div>
    <span className="text-xs text-stone-muted w-6 text-right tabular-nums">
      {value ? value.toFixed(1) : '—'}
    </span>
  </div>
)

export default async function PodcastPage({ params }: Props) {
  const { slug } = await params
  const podcast = await getPodcast(slug)

  if (!podcast) notFound()

  const [reviews, similar] = await Promise.all([
    getReviews(podcast.id),
    getSimilarPodcasts(podcast),
  ])

  const stats = podcast.rating_stats
  const overallScore = stats?.avg_overall

  const faqs = buildFaqs(podcast)
  const primaryCategory = podcast.case_types?.[0]
  const countryName = podcast.country ? COUNTRIES[podcast.country] : null

  const breadcrumbs = breadcrumbSchema([
    { name: 'Home', url: BASE },
    { name: 'Podcasts', url: `${BASE}/browse` },
    ...(primaryCategory ? [{ name: primaryCategory, url: `${BASE}/browse?q=${encodeURIComponent(primaryCategory)}` }] : []),
    { name: podcast.title, url: `${BASE}/podcasts/${slug}` },
  ])

  const jsonLdPodcast = podcastSchema({
    title: podcast.title,
    description: podcast.description,
    image_url: podcast.image_url,
    slug,
    case_types: podcast.case_types,
    episode_count: podcast.episode_count,
    platforms: podcast.platforms,
    rating_stats: stats,
  })

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdPodcast) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
      {faqs.length > 0 && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema(faqs)) }} />
      )}

      <Header />

      <main className="pt-16">
        {/* ═══ HERO ═══ */}
        <div className="relative">
          <div className="absolute inset-0 h-72 bg-gradient-to-b from-ink-800 to-ink-950" />
          {podcast.image_url && (
            <div className="absolute inset-0 h-72 opacity-10">
              <Image src={podcast.image_url} alt="" fill className="object-cover" sizes="100vw" />
            </div>
          )}
          <div className="absolute inset-0 h-72 bg-gradient-to-b from-transparent via-ink-950/50 to-ink-950" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-0">
            {/* Breadcrumb nav */}
            <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-stone-subtle mb-6">
              <Link href="/" className="hover:text-stone transition-colors">Home</Link>
              <ChevronRight size={12} />
              <Link href="/browse" className="hover:text-stone transition-colors">Podcasts</Link>
              {primaryCategory && (
                <>
                  <ChevronRight size={12} />
                  <Link href={`/browse?q=${encodeURIComponent(primaryCategory)}`} className="hover:text-stone transition-colors">
                    {primaryCategory}
                  </Link>
                </>
              )}
              <ChevronRight size={12} />
              <span className="text-stone-muted truncate max-w-[200px]">{podcast.title}</span>
            </nav>

            <div className="flex flex-col sm:flex-row gap-6 sm:gap-8 items-start">
              {/* Cover */}
              <div className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.5)] shrink-0 bg-ink-700">
                {podcast.image_url ? (
                  <Image
                    src={podcast.image_url}
                    alt={`${podcast.title} podcast cover art`}
                    fill
                    className="object-cover"
                    priority
                    sizes="(max-width: 640px) 128px, 160px"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Headphones size={40} className="text-ink-500" />
                  </div>
                )}
              </div>

              {/* Title block */}
              <div className="flex-1 pt-2">
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {podcast.country && countryName && (
                    <Link href={`/country/${podcast.country}`} className="tag hover:border-white/20 transition-colors">
                      {countryFlag(podcast.country)} {countryName}
                    </Link>
                  )}
                  {podcast.case_types?.map((t: string) => (
                    <Link key={t} href={`/browse?q=${encodeURIComponent(t)}`} className="tag hover:border-white/20 transition-colors">
                      {t}
                    </Link>
                  ))}
                </div>

                <h1 className="heading-display text-3xl sm:text-4xl mb-3">{podcast.title}</h1>

                {/* Score row */}
                <div className="flex items-center gap-4 flex-wrap">
                  {overallScore && (
                    <div className="flex items-center gap-2">
                      <span className={cn('score-badge text-sm', scoreBg(overallScore))}>
                        {overallScore.toFixed(1)}
                      </span>
                      <div className="flex">
                        {[...Array(10)].map((_, i) => (
                          <Star
                            key={i}
                            size={12}
                            className={i < Math.round(overallScore) ? 'text-gold-light' : 'text-ink-500'}
                            fill={i < Math.round(overallScore) ? 'currentColor' : 'none'}
                          />
                        ))}
                      </div>
                      <span className="text-stone-subtle text-xs">
                        ({stats?.rating_count} ratings)
                      </span>
                    </div>
                  )}
                  {podcast.quick_verdict && (
                    <span className={cn(
                      'text-xs font-medium px-2.5 py-1 rounded-full',
                      podcast.quick_verdict === 'Must listen'
                        ? 'bg-crimson/15 text-crimson border border-crimson/20'
                        : 'bg-ink-700 text-stone-muted'
                    )}>
                      {podcast.quick_verdict}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ CONTENT ═══ */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
          <div className="grid lg:grid-cols-3 gap-8">

            {/* Main column */}
            <div className="lg:col-span-2 space-y-8">

              {/* Quick Take — AI snippet target */}
              {(podcast.short_description || podcast.description) && (
                <div className="card p-6 border-l-4 border-crimson/60">
                  <p className="text-2xs text-crimson font-semibold uppercase tracking-widest mb-2">Quick take</p>
                  <p className="text-stone text-base leading-relaxed">
                    {podcast.short_description ?? podcast.description?.slice(0, 220)}
                  </p>
                  {podcast.quick_verdict && (
                    <p className="mt-3 text-stone-muted text-sm">
                      <strong className="text-stone">Verdict:</strong> {podcast.quick_verdict}.
                      {podcast.newsletter_worthy_summary && ` ${podcast.newsletter_worthy_summary}`}
                    </p>
                  )}
                </div>
              )}

              {/* Full description */}
              {podcast.description && podcast.short_description && (
                <div className="card p-6">
                  <h2 className="font-serif text-lg text-stone mb-3">About this podcast</h2>
                  <p className="text-stone-muted text-sm leading-relaxed">{podcast.description}</p>
                </div>
              )}

              {/* Community ratings breakdown */}
              {stats && stats.rating_count > 0 && (
                <div className="card p-6">
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="font-serif text-lg text-stone">Community ratings</h2>
                    <span className="text-stone-subtle text-xs">{stats.rating_count} ratings</span>
                  </div>
                  <div className="space-y-3">
                    <RatingBar label="Storytelling" value={stats.avg_storytelling} />
                    <RatingBar label="Research Quality" value={stats.avg_research} />
                    <RatingBar label="Host Quality" value={stats.avg_host_quality} />
                    <RatingBar label="Production / Audio" value={stats.avg_production} />
                    <RatingBar label="Binge Factor" value={stats.avg_binge_factor} />
                    <RatingBar label="Factual Accuracy" value={stats.avg_factual_accuracy} />
                    <div className="h-px bg-white/[0.06] my-2" />
                    <RatingBar label="Overall Score" value={stats.avg_overall} />
                  </div>
                </div>
              )}

              {/* Rate this */}
              <div>
                <h2 className="font-serif text-xl text-stone mb-4">Rate this podcast</h2>
                <RatingWidget podcastId={podcast.id} podcastTitle={podcast.title} />
              </div>

              {/* Reviews */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-serif text-xl text-stone">Community reviews</h2>
                  <span className="text-stone-subtle text-xs">{reviews.length} reviews</span>
                </div>

                <ReviewForm podcastId={podcast.id} podcastTitle={podcast.title} />

                <div className="mt-4 space-y-3">
                  {reviews.map((review: any) => (
                    <div key={review.id} className="card p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-full bg-crimson/20 border border-crimson/20 flex items-center justify-center text-crimson text-xs font-semibold shrink-0">
                          {(review.profile?.username?.[0] ?? '?').toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-stone text-xs font-semibold">{review.profile?.username ?? 'Anonymous'}</span>
                            <span className="text-stone-subtle text-xs">{formatRelativeDate(review.created_at)}</span>
                          </div>
                          <p className="text-stone-muted text-sm leading-relaxed">{review.content}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {reviews.length === 0 && (
                    <p className="text-stone-subtle text-sm text-center py-8">
                      No reviews yet. Be the first!
                    </p>
                  )}
                </div>
              </div>

              {/* FAQ — AI discoverability + FAQPage schema */}
              {faqs.length > 0 && (
                <div className="card p-6">
                  <h2 className="font-serif text-lg text-stone mb-5">Frequently asked questions</h2>
                  <dl className="space-y-5">
                    {faqs.map(({ q, a }) => (
                      <div key={q}>
                        <dt className="text-stone text-sm font-semibold mb-1.5">{q}</dt>
                        <dd className="text-stone-muted text-sm leading-relaxed">{a}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-5">
              {/* Quick facts */}
              <div className="card p-5">
                <h3 className="font-serif text-sm text-stone mb-4 uppercase tracking-wide">Quick facts</h3>
                <dl className="space-y-3">
                  {[
                    { label: 'Format', value: podcast.format_type },
                    { label: 'Host style', value: podcast.host_style },
                    { label: 'Style', value: podcast.factual_style },
                    { label: 'Episode length', value: podcast.episode_length },
                    { label: 'Episodes', value: podcast.episode_count },
                    { label: 'Binge factor', value: podcast.binge_factor ? `${podcast.binge_factor}/10` : null },
                    { label: 'Best to start', value: podcast.best_episode_to_start },
                  ].filter(i => i.value).map(item => (
                    <div key={item.label} className="flex justify-between gap-3">
                      <dt className="text-stone-subtle text-xs">{item.label}</dt>
                      <dd className="text-stone text-xs text-right">{item.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              {/* Platforms */}
              {podcast.platforms && podcast.platforms.length > 0 && (
                <div className="card p-5">
                  <h3 className="font-serif text-sm text-stone mb-3 uppercase tracking-wide">Listen on</h3>
                  <div className="flex flex-wrap gap-2">
                    {podcast.platforms.map((p: string) => (
                      <span key={p} className="tag">{p}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Internal links */}
              {(primaryCategory || countryName) && (
                <div className="card p-5">
                  <h3 className="font-serif text-sm text-stone mb-3 uppercase tracking-wide">Explore more</h3>
                  <ul className="space-y-2">
                    {primaryCategory && (
                      <li>
                        <Link href={`/browse?q=${encodeURIComponent(primaryCategory)}`} className="text-xs text-stone-muted hover:text-stone transition-colors flex items-center gap-1.5">
                          <ChevronRight size={12} /> More {primaryCategory} podcasts
                        </Link>
                      </li>
                    )}
                    {podcast.country && (
                      <li>
                        <Link href={`/country/${podcast.country}`} className="text-xs text-stone-muted hover:text-stone transition-colors flex items-center gap-1.5">
                          <ChevronRight size={12} /> More {countryName} podcasts
                        </Link>
                      </li>
                    )}
                    <li>
                      <Link href="/best-true-crime-podcasts" className="text-xs text-stone-muted hover:text-stone transition-colors flex items-center gap-1.5">
                        <ChevronRight size={12} /> Best true crime podcasts
                      </Link>
                    </li>
                    <li>
                      <Link href="/browse" className="text-xs text-stone-muted hover:text-stone transition-colors flex items-center gap-1.5">
                        <ChevronRight size={12} /> Browse all podcasts
                      </Link>
                    </li>
                  </ul>
                </div>
              )}

              {/* Newsletter */}
              <div className="card p-5 bg-gradient-to-br from-ink-800 to-ink-700">
                <p className="text-xs text-crimson font-semibold uppercase tracking-widest mb-2">Newsletter</p>
                <p className="text-stone text-sm font-medium mb-1">Get weekly recommendations</p>
                <p className="text-stone-subtle text-xs mb-4">Curated picks, new reviews, hidden gems.</p>
                <NewsletterForm source="podcast_page" variant="minimal" />
              </div>
            </div>
          </div>

          {/* Similar podcasts */}
          {similar.length > 0 && (
            <div className="mt-12 pt-12 border-t border-white/[0.06]">
              <h2 className="heading-section text-2xl mb-6">
                If you liked this, try…
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {similar.map((p: any) => (
                  <PodcastCard key={p.id} podcast={p} />
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  )
}

export async function generateStaticParams() {
  const { createClient: createDirectClient } = await import('@supabase/supabase-js')
  const client = createDirectClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data } = await client.from('podcasts').select('slug').eq('is_published', true)
  return (data ?? []).map(p => ({ slug: p.slug }))
}
