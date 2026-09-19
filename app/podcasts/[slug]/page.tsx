import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'
import { Star, Headphones, ArrowRight, ChevronDown, ChevronUp, Users, Mic, Play, ThumbsUp, ThumbsDown } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { RatingWidget } from '@/components/podcasts/rating-widget'
import { HelpfulWidget } from '@/components/podcasts/helpful-widget'
import { ReviewForm } from '@/components/podcasts/review-form'
import { PodcastCard } from '@/components/podcasts/podcast-card'
import { NewsletterForm } from '@/components/newsletter/newsletter-form'
import { buildBreadcrumbSchema } from '@/lib/seo/content'
import { getPros, getCons, getHostDescription, getPodcastPersonSchema } from '@/lib/seo/podcast-analysis'
import { getAuthor } from '@/lib/authors'
import { BASE } from '@/lib/seo/config'
import { countryFlag, formatRelativeDate, scoreBg, cn, stripHtml } from '@/lib/utils'
import { COUNTRIES, CATEGORIES, CATEGORY_TO_CASE_TYPES } from '@/lib/types/database'
import type { Podcast, RatingStats } from '@/lib/types/database'
import { getCasesForPodcast } from '@/lib/cases'

interface Props {
  params: Promise<{ slug: string }>
}

type PodcastWithStats = Podcast & { rating_stats: RatingStats | null }

async function getPodcast(slug: string) {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('podcasts')
    .select(`*, rating_stats:podcast_rating_stats(*), review_count:podcast_review_counts(review_count)`)
    .eq('slug', slug)
    .eq('is_published', true)
    .single()
  if (!data) return data
  // Imported feed copy sometimes carries raw markup (<p>, &nbsp;) that must
  // never reach a reader — clean it once here rather than at every call site
  // that reads .description / .short_description below.
  return {
    ...data,
    description: data.description ? stripHtml(data.description) : data.description,
    short_description: data.short_description ? stripHtml(data.short_description) : data.short_description,
  }
}

async function getReviews(podcastId: string) {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('reviews')
    .select(`*, profile:profiles(username, avatar_url)`)
    .eq('podcast_id', podcastId)
    .eq('approved', true)
    .order('created_at', { ascending: false })
    .limit(20)
  return data ?? []
}

async function getSimilarPodcasts(podcast: any): Promise<PodcastWithStats[]> {
  const supabase = createAdminClient()
  const results: PodcastWithStats[] = []
  const seen = new Set<string>([podcast.slug])

  // Direct recommendations from if_you_liked_this
  if (podcast.if_you_liked_this?.length) {
    const { data } = await supabase
      .from('podcasts')
      .select(`*, rating_stats:podcast_rating_stats(*)`)
      .in('slug', podcast.if_you_liked_this)
      .eq('is_published', true)
      .limit(4)
    if (data) {
      for (const p of data as PodcastWithStats[]) {
        if (!seen.has(p.slug)) { results.push(p); seen.add(p.slug) }
      }
    }
  }

  // Same case types to fill up to 6
  if (results.length < 6 && podcast.case_types?.length) {
    const { data } = await supabase
      .from('podcasts')
      .select(`*, rating_stats:podcast_rating_stats(*)`)
      .overlaps('case_types', podcast.case_types)
      .eq('is_published', true)
      .neq('slug', podcast.slug)
      .order('binge_factor', { ascending: false })
      .limit(6)
    if (data) {
      for (const p of data as PodcastWithStats[]) {
        if (!seen.has(p.slug)) { results.push(p); seen.add(p.slug) }
        if (results.length >= 6) break
      }
    }
  }

  return results.slice(0, 6)
}

// Derive categories this podcast belongs to
function getPodcastCategories(podcast: any) {
  const cats: typeof CATEGORIES = []
  for (const cat of CATEGORIES) {
    const caseTypes = CATEGORY_TO_CASE_TYPES[cat.slug] ?? []
    if (cat.slug === 'uk-crime' && podcast.country === 'UK') cats.push(cat)
    else if (cat.slug === 'australian-crime' && podcast.country === 'AU') cats.push(cat)
    else if (cat.slug === 'binge-worthy' && (podcast.binge_factor ?? 0) >= 8) cats.push(cat)
    else if (caseTypes.length > 0 && podcast.case_types?.some((t: string) => caseTypes.includes(t))) cats.push(cat)
  }
  return cats
}

// Derive "who it's for" text from podcast attributes
function getWhoIsItFor(podcast: any): string[] {
  const lines: string[] = []
  if (podcast.format_type === 'Serialized') lines.push('Listeners who enjoy following a single case from start to finish')
  if (podcast.format_type === 'Episodic') lines.push('Listeners who prefer variety — a new case with every episode')
  if (podcast.case_types?.includes('Cold Case')) lines.push('Cold case enthusiasts who love decades-old unsolved mysteries')
  if (podcast.case_types?.includes('Missing Person')) lines.push('Anyone fascinated by missing persons investigations')
  if (podcast.case_types?.includes('Investigative')) lines.push('Fans of original investigative journalism over retold news')
  if (podcast.case_types?.includes('Courtroom') || podcast.case_types?.includes('Wrongful Conviction')) lines.push('Legal procedure enthusiasts and wrongful conviction advocates')
  if (podcast.case_types?.includes('Serial Killer')) lines.push('Those interested in the psychology of serial offenders')
  if (podcast.case_types?.includes('Fraud') || podcast.case_types?.includes('White-Collar Crime')) lines.push('Fans of financial crime and corporate misconduct stories')
  if ((podcast.binge_factor ?? 0) >= 8) lines.push('Binge listeners who want something they can\'t stop at one episode')
  if (podcast.host_style === 'Dual Host') lines.push('Listeners who enjoy a conversational, back-and-forth dynamic')
  if (podcast.factual_style === 'Purely Factual') lines.push('Those who prefer straight reporting over host commentary')
  if (podcast.country === 'UK') lines.push('Listeners interested in British cases and the UK criminal justice system')
  if (podcast.country === 'AU') lines.push('Fans of Australian true crime and its unique landscape and culture')
  return lines.slice(0, 4)
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const podcast = await getPodcast(slug)
  if (!podcast) return {}

  const description = podcast.short_description ?? podcast.description?.slice(0, 160) ?? ''

  const ogParams = new URLSearchParams({ title: podcast.title })
  if (podcast.quick_verdict) ogParams.set('verdict', podcast.quick_verdict)
  if (podcast.binge_factor) ogParams.set('score', String(podcast.binge_factor))
  ogParams.set('sub', podcast.case_types?.slice(0, 2).join(' · ') ?? 'True Crime Podcast')
  const brandedOg = `${BASE}/og?${ogParams.toString()}`

  return {
    title: `${podcast.title} Review`,
    description,
    openGraph: {
      title: `${podcast.title} | ListenTrueCrime`,
      description,
      // Use podcast cover art when available, otherwise fall back to branded OG
      images: podcast.image_url
        ? [{ url: podcast.image_url, width: 1400, height: 1400, alt: podcast.title }]
        : [{ url: brandedOg, width: 1200, height: 630, alt: podcast.title }],
      url: `${BASE}/podcasts/${slug}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: podcast.title,
      description,
      images: podcast.image_url ? [podcast.image_url] : [brandedOg],
    },
    alternates: { canonical: `${BASE}/podcasts/${slug}` },
  }
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
  const podcastCategories = getPodcastCategories(podcast)
  const whoIsItFor = getWhoIsItFor(podcast)
  const relatedCases = getCasesForPodcast(slug)
  const stats = podcast.rating_stats
  const overallScore = stats?.avg_overall
  const year = new Date().getFullYear()
  const pros = getPros(podcast, stats)
  const cons = getCons(podcast, stats)
  const hostInfo = getHostDescription(podcast)
  const personSchema = getPodcastPersonSchema(podcast)

  const faqs = [
    {
      q: `What is ${podcast.title} about?`,
      a: podcast.description ?? podcast.short_description ?? `${podcast.title} is a true crime podcast covering ${podcast.case_types?.join(', ') ?? 'real criminal cases'}.`,
    },
    {
      q: `Is ${podcast.title} worth listening to?`,
      a: `${podcast.quick_verdict ? `Our editorial verdict is "${podcast.quick_verdict}". ` : ''}${overallScore ? `The community has rated it ${overallScore.toFixed(1)}/10 overall. ` : ''}${podcast.binge_factor ? `It scores ${podcast.binge_factor}/10 on binge factor. ` : ''}${podcast.short_description ?? ''}`,
    },
    {
      q: `Who is ${podcast.title} for?`,
      a: whoIsItFor.length > 0
        ? `${podcast.title} is ideal for: ${whoIsItFor.join('; ')}.`
        : `${podcast.title} is recommended for true crime enthusiasts who enjoy ${podcast.case_types?.join(' and ') ?? 'compelling crime stories'}.`,
    },
    {
      q: `What is the best episode of ${podcast.title} to start with?`,
      a: podcast.best_episode_to_start
        ? `We recommend starting with ${podcast.best_episode_to_start}. ${podcast.format_type === 'Serialized' ? 'As a serialized show, it\'s best to listen from the beginning of a season.' : 'Episodes can generally be enjoyed in any order.'}`
        : `${podcast.format_type === 'Serialized' ? `${podcast.title} is a serialized podcast — start from Episode 1 of any season for the full experience.` : 'Start with whichever case title sounds most interesting to you.'}`,
    },
    {
      q: `Where can I listen to ${podcast.title}?`,
      a: podcast.platforms?.length
        ? `${podcast.title} is available on ${podcast.platforms.join(', ')}. Search for it by name on any of those apps.`
        : `${podcast.title} is available on major podcast platforms including Spotify and Apple Podcasts.`,
    },
    {
      q: `What podcasts are similar to ${podcast.title}?`,
      a: similar.length > 0
        ? `If you enjoy ${podcast.title}, you might also like: ${similar.slice(0, 4).map(p => p.title).join(', ')}. See our full "Podcasts Like ${podcast.title}" page for more recommendations.`
        : `Browse our ${podcast.case_types?.slice(0, 1)[0] ?? 'true crime'} category for similar podcasts.`,
    },
  ]

  const ratingCount = stats?.rating_count ?? 0

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'PodcastSeries',
    name: podcast.title,
    description: podcast.description,
    image: podcast.image_url,
    url: `${BASE}/podcasts/${slug}`,
    inLanguage: 'en',
    datePublished: podcast.created_at?.split('T')[0],
    dateModified: podcast.updated_at?.split('T')[0],
    ...(podcast.case_types?.length && { genre: podcast.case_types }),
    ...(podcast.country && { countryOfOrigin: { '@type': 'Country', name: COUNTRIES[podcast.country] ?? podcast.country } }),
    ...(podcast.platforms?.length && { potentialAction: podcast.platforms.map((p: string) => ({ '@type': 'ListenAction', target: p })) }),
    // Only emit aggregateRating when there are real community ratings
    ...(ratingCount >= 1 && overallScore != null && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: overallScore,
        bestRating: 10,
        worstRating: 1,
        ratingCount,
      },
    }),
  }

  // Editorial review schema — only when we have editorial content
  const reviewSchema = (podcast.binge_factor != null || podcast.quick_verdict || podcast.newsletter_worthy_summary) ? {
    '@context': 'https://schema.org',
    '@type': 'Review',
    itemReviewed: {
      '@type': 'PodcastSeries',
      name: podcast.title,
      url: `${BASE}/podcasts/${slug}`,
    },
    author: {
      '@type': 'Person',
      name: getAuthor('david-stark').name,
      url: `${BASE}/authors/david-stark`,
    },
    reviewRating: {
      '@type': 'Rating',
      ratingValue: podcast.binge_factor ?? 5,
      bestRating: 10,
      worstRating: 1,
      ...(podcast.quick_verdict && { description: podcast.quick_verdict }),
    },
    ...(podcast.newsletter_worthy_summary && { reviewBody: podcast.newsletter_worthy_summary }),
    datePublished: podcast.created_at?.split('T')[0],
    dateModified: podcast.updated_at?.split('T')[0],
  } : null

  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: 'Home', url: BASE },
    { name: 'Browse', url: `${BASE}/browse` },
    { name: podcast.title, url: `${BASE}/podcasts/${slug}` },
  ])

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: { '@type': 'Answer', text: faq.a },
    })),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      {reviewSchema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(reviewSchema) }} />}
      {personSchema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }} />}

      <Header />

      <main className="pt-16">
        {/* ═══ HERO ═══ */}
        <div className="relative">
          <div className="absolute inset-0 h-72 bg-gradient-to-b from-ink-800 to-ink-950" />
          {podcast.image_url && (
            <div className="absolute inset-0 h-72 opacity-10">
              <Image src={podcast.image_url} alt="" fill className="object-cover" sizes="100vw" quality={20} />
            </div>
          )}
          <div className="absolute inset-0 h-72 bg-gradient-to-b from-transparent via-ink-950/50 to-ink-950" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-0">
            {/* Breadcrumb */}
            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-stone-subtle mb-6">
              <Link href="/" className="hover:text-stone transition-colors">Home</Link>
              <span>/</span>
              <Link href="/browse" className="hover:text-stone transition-colors">Browse</Link>
              <span>/</span>
              <span className="text-stone-muted truncate max-w-[200px]">{podcast.title}</span>
            </nav>

            <div className="flex flex-col sm:flex-row gap-6 sm:gap-8 items-start">
              {/* Cover */}
              <div className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.5)] shrink-0 bg-ink-700">
                {podcast.image_url ? (
                  <Image src={podcast.image_url} alt={`${podcast.title} podcast artwork`} fill className="object-cover" priority sizes="(max-width: 640px) 128px, 160px" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Headphones size={40} className="text-ink-500" />
                  </div>
                )}
              </div>

              {/* Title block */}
              <div className="flex-1 pt-2">
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {podcast.country && (
                    <span className="tag">
                      {countryFlag(podcast.country)} {COUNTRIES[podcast.country] ?? podcast.country}
                    </span>
                  )}
                  {podcast.case_types?.map((t: string) => <span key={t} className="tag">{t}</span>)}
                </div>

                <h1 className="heading-display text-3xl sm:text-4xl mb-2">{podcast.title}</h1>
                <p className="text-stone-subtle text-sm mb-1">
                  True crime podcast review — {year}
                </p>
                <p className="text-stone-subtle text-xs mb-3">
                  Reviewed{' '}
                  <time dateTime={podcast.created_at?.split('T')[0]}>
                    {new Date(podcast.created_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                  </time>
                  {podcast.updated_at !== podcast.created_at && (
                    <>
                      {' · Updated '}
                      <time dateTime={podcast.updated_at?.split('T')[0]}>
                        {new Date(podcast.updated_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                      </time>
                    </>
                  )}
                </p>

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

              {/* Editorial Quick Verdict */}
              {(podcast.newsletter_worthy_summary || podcast.quick_verdict) && (
                <div className="card p-6 border-crimson/20 bg-crimson/5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xs text-crimson font-semibold uppercase tracking-widest">Quick Verdict</span>
                    {podcast.quick_verdict && (
                      <span className={cn(
                        'text-xs font-medium px-2 py-0.5 rounded-full',
                        podcast.quick_verdict === 'Must listen'
                          ? 'bg-crimson/20 text-crimson'
                          : 'bg-ink-700 text-stone-muted'
                      )}>
                        {podcast.quick_verdict}
                      </span>
                    )}
                  </div>
                  {podcast.newsletter_worthy_summary && (
                    <blockquote className="text-stone text-sm sm:text-base leading-relaxed font-medium italic">
                      "{podcast.newsletter_worthy_summary}"
                    </blockquote>
                  )}
                  <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center justify-between">
                    <span className="text-stone-subtle text-xs">
                      By <Link href="/authors/david-stark" className="text-stone-muted hover:text-crimson transition-colors">David Stark</Link>
                    </span>
                    <Link href="/how-we-review" className="text-xs text-stone-subtle hover:text-crimson transition-colors">
                      How we review →
                    </Link>
                  </div>
                </div>
              )}

              {/* Who is it for */}
              {whoIsItFor.length > 0 && (
                <div className="card p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Users size={16} className="text-crimson" />
                    <h2 className="font-serif text-lg text-stone">Who is this podcast for?</h2>
                  </div>
                  <ul className="space-y-2">
                    {whoIsItFor.map((line, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-stone-muted text-sm">
                        <span className="text-crimson mt-0.5 shrink-0">✓</span>
                        {line}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 pt-4 border-t border-white/[0.06]">
                    <Link
                      href={`/podcasts-like/${slug}`}
                      className="inline-flex items-center gap-1.5 text-crimson text-sm hover:underline"
                    >
                      Find podcasts like {podcast.title} <ArrowRight size={13} />
                    </Link>
                  </div>
                </div>
              )}

              {/* Pros & Cons */}
              {(pros.length > 0 || cons.length > 0) && (
                <div className="card p-6">
                  <h2 className="font-serif text-lg text-stone mb-5">Pros &amp; cons</h2>
                  <div className="grid sm:grid-cols-2 gap-5">
                    {pros.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <ThumbsUp size={14} className="text-emerald-400" />
                          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Pros</span>
                        </div>
                        <ul className="space-y-2">
                          {pros.map((p, i) => (
                            <li key={i} className="flex items-start gap-2 text-stone-muted text-sm">
                              <span className="text-emerald-400 mt-0.5 shrink-0 text-xs">+</span>
                              {p}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {cons.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <ThumbsDown size={14} className="text-stone-subtle" />
                          <span className="text-xs font-semibold text-stone-subtle uppercase tracking-wider">Cons</span>
                        </div>
                        <ul className="space-y-2">
                          {cons.map((c, i) => (
                            <li key={i} className="flex items-start gap-2 text-stone-muted text-sm">
                              <span className="text-stone-subtle mt-0.5 shrink-0 text-xs">−</span>
                              {c}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Host information */}
              {hostInfo && (
                <div className="card p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Mic size={15} className="text-crimson" />
                    <h2 className="font-serif text-lg text-stone">About the host</h2>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-crimson/15 border border-crimson/20 flex items-center justify-center shrink-0">
                      <Mic size={16} className="text-crimson" />
                    </div>
                    <div>
                      {hostInfo.name ? (
                        <>
                          <p className="text-stone text-sm font-semibold mb-1">{hostInfo.name}</p>
                          <p className="text-stone-muted text-sm leading-relaxed">{hostInfo.detail}</p>
                        </>
                      ) : (
                        <>
                          <p className="text-stone text-sm font-medium mb-1">{hostInfo.headline}</p>
                          <p className="text-stone-muted text-sm leading-relaxed">{hostInfo.detail}</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Description */}
              {podcast.description && (
                <div className="card p-6">
                  <h2 className="font-serif text-lg text-stone mb-3">About this podcast</h2>
                  <p className="text-stone-muted text-sm leading-relaxed">{podcast.description}</p>
                </div>
              )}

              {/* Best episode to start */}
              {podcast.best_episode_to_start && (
                <div className="card p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Play size={15} className="text-crimson" />
                    <h2 className="font-serif text-lg text-stone">Best episode to start with</h2>
                  </div>
                  <div className="bg-ink-800 rounded-lg p-4">
                    <p className="text-stone font-medium text-sm">{podcast.best_episode_to_start}</p>
                    <p className="text-stone-subtle text-xs mt-1">
                      {podcast.format_type === 'Serialized'
                        ? 'Serialized format — listen from the beginning for the full experience'
                        : 'Episodic format — episodes can generally be enjoyed in any order'}
                    </p>
                  </div>
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
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-serif text-xl text-stone">Rate this podcast</h2>
                  <HelpfulWidget podcastSlug={podcast.slug} />
                </div>
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

              {/* FAQ Section */}
              <div>
                <h2 className="font-serif text-xl text-stone mb-5">
                  Frequently Asked Questions about {podcast.title}
                </h2>
                <div className="space-y-3">
                  {faqs.map((faq, i) => (
                    <details key={i} className="card p-5 group">
                      <summary className="flex items-center justify-between cursor-pointer list-none gap-4">
                        <span className="text-stone font-medium text-sm">{faq.q}</span>
                        <ChevronDown size={16} className="text-stone-subtle shrink-0 group-open:hidden" />
                        <ChevronUp size={16} className="text-stone-subtle shrink-0 hidden group-open:block" />
                      </summary>
                      <p className="text-stone-muted text-sm leading-relaxed mt-3 pt-3 border-t border-white/[0.06]">
                        {faq.a}
                      </p>
                    </details>
                  ))}
                </div>
              </div>
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
                    { label: 'Country', value: podcast.country ? (COUNTRIES[podcast.country] ?? podcast.country) : null },
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
                      <Link
                        key={p}
                        href={`/platform/${encodeURIComponent(p)}`}
                        className="tag hover:border-white/20 transition-colors"
                      >
                        {p}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Categories this podcast belongs to */}
              {podcastCategories.length > 0 && (
                <div className="card p-5">
                  <h3 className="font-serif text-sm text-stone mb-3 uppercase tracking-wide">Browse category</h3>
                  <div className="space-y-2">
                    {podcastCategories.map(cat => (
                      <Link
                        key={cat.slug}
                        href={`/category/${cat.slug}`}
                        className="flex items-center gap-2 text-stone-muted hover:text-stone text-xs transition-colors"
                      >
                        <span>{cat.emoji}</span>
                        <span>{cat.label}</span>
                        <ArrowRight size={12} className="ml-auto" />
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Country link */}
              {podcast.country && COUNTRIES[podcast.country] && (
                <div className="card p-5">
                  <h3 className="font-serif text-sm text-stone mb-3 uppercase tracking-wide">Region</h3>
                  <Link
                    href={`/country/${podcast.country}`}
                    className="flex items-center gap-2 text-stone-muted hover:text-stone text-sm transition-colors"
                  >
                    <span>{countryFlag(podcast.country)}</span>
                    <span>{COUNTRIES[podcast.country]} True Crime</span>
                    <ArrowRight size={12} className="ml-auto" />
                  </Link>
                </div>
              )}

              {/* Cases covered */}
              {relatedCases.length > 0 && (
                <div className="card p-5">
                  <h3 className="font-serif text-sm text-stone mb-3 uppercase tracking-wide">Cases covered</h3>
                  <div className="space-y-2">
                    {relatedCases.map(c => (
                      <Link
                        key={c.slug}
                        href={`/cases/${c.slug}`}
                        className="flex items-start gap-2 text-stone-muted hover:text-stone text-xs transition-colors group"
                      >
                        <ArrowRight size={11} className="text-crimson shrink-0 mt-0.5" />
                        <span>{c.name}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Podcasts like this */}
              <div className="card p-5">
                <h3 className="font-serif text-sm text-stone mb-3 uppercase tracking-wide">Liked this?</h3>
                <Link
                  href={`/podcasts-like/${slug}`}
                  className="flex items-center gap-2 text-crimson hover:text-crimson/80 text-sm transition-colors font-medium"
                >
                  <span>Podcasts Like {podcast.title}</span>
                  <ArrowRight size={12} className="ml-auto" />
                </Link>
                <p className="text-stone-subtle text-xs mt-2">Find your next obsession</p>
              </div>

              {/* Badge */}
              {podcast.quick_verdict && podcast.quick_verdict !== 'Avoid' && (
                <div className="card p-5">
                  <h3 className="font-serif text-sm text-stone mb-2 uppercase tracking-wide">Podcaster?</h3>
                  <p className="text-stone-subtle text-xs mb-3">
                    Show listeners this podcast has been independently reviewed.
                  </p>
                  <Link
                    href="/badge"
                    className="flex items-center gap-2 text-crimson hover:text-crimson/80 text-sm font-medium transition-colors"
                  >
                    Get your badge
                    <ArrowRight size={12} className="ml-auto" />
                  </Link>
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
              <div className="flex items-center justify-between mb-6">
                <h2 className="heading-section text-2xl">
                  If you liked this, try…
                </h2>
                <Link
                  href={`/podcasts-like/${slug}`}
                  className="text-sm text-crimson hover:text-crimson/80 transition-colors flex items-center gap-1"
                >
                  See all alternatives <ArrowRight size={14} />
                </Link>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {similar.map((p: PodcastWithStats) => (
                  <PodcastCard key={p.id} podcast={p} />
                ))}
              </div>
            </div>
          )}

          {/* Category cross-links */}
          {podcastCategories.length > 0 && (
            <div className="mt-12 pt-12 border-t border-white/[0.06]">
              <p className="text-stone-subtle text-sm mb-4">Explore more in these categories:</p>
              <div className="flex flex-wrap gap-3">
                {podcastCategories.map(cat => (
                  <Link
                    key={cat.slug}
                    href={`/category/${cat.slug}`}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-ink-800 border border-white/[0.08] text-stone-muted hover:text-stone hover:border-white/20 text-sm transition-colors"
                  >
                    {cat.emoji} {cat.label} <ArrowRight size={13} />
                  </Link>
                ))}
                <Link
                  href="/best-true-crime-podcasts"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-ink-800 border border-white/[0.08] text-stone-muted hover:text-stone hover:border-white/20 text-sm transition-colors"
                >
                  ⭐ Best True Crime Podcasts <ArrowRight size={13} />
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  )
}

// Pre-build all published podcast pages at deploy time so every deploy
// serves current HTML (header, canonicals, schema) without waiting for ISR.
// revalidate keeps community rating data fresh in the background.
export async function generateStaticParams() {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('podcasts')
    .select('slug')
    .eq('is_published', true)
  return (data ?? []).map(p => ({ slug: p.slug }))
}

export const revalidate = 3600
