import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, ChevronDown, ChevronUp, Headphones, Star } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { PodcastCard } from '@/components/podcasts/podcast-card'
import { NewsletterForm } from '@/components/newsletter/newsletter-form'
import { buildFAQSchema, buildBreadcrumbSchema } from '@/lib/seo/content'
import { getPodcastNarrative } from '@/lib/seo/podcast-analysis'
import { BASE } from '@/lib/seo/config'
import { countryFlag, cn, scoreBg, stripHtml } from '@/lib/utils'
import { COUNTRIES } from '@/lib/types/database'
import type { Podcast, RatingStats } from '@/lib/types/database'

interface Props {
  params: Promise<{ slug: string }>
}

type PodcastWithStats = Podcast & { rating_stats: RatingStats | null }

async function getSourcePodcast(slug: string): Promise<PodcastWithStats | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('podcasts')
    .select(`*, rating_stats:podcast_rating_stats(*)`)
    .eq('slug', slug)
    .eq('is_published', true)
    .single()
  return data
}

async function getRecommendations(podcast: PodcastWithStats): Promise<PodcastWithStats[]> {
  const supabase = await createClient()
  const slugs: string[] = podcast.if_you_liked_this ?? []
  const results: PodcastWithStats[] = []

  // 1. Direct recommendations from if_you_liked_this
  if (slugs.length > 0) {
    const { data } = await supabase
      .from('podcasts')
      .select(`*, rating_stats:podcast_rating_stats(*)`)
      .in('slug', slugs)
      .eq('is_published', true)
      .limit(8)
    if (data) results.push(...(data as PodcastWithStats[]))
  }

  // 2. Reverse: podcasts that list this one in their if_you_liked_this
  const { data: reverse } = await supabase
    .from('podcasts')
    .select(`*, rating_stats:podcast_rating_stats(*)`)
    .contains('if_you_liked_this', [podcast.slug])
    .eq('is_published', true)
    .neq('slug', podcast.slug)
    .limit(4)
  if (reverse) results.push(...(reverse as PodcastWithStats[]))

  // 3. Same case types, deduplicated
  const seen = new Set([podcast.slug, ...results.map(p => p.slug)])
  const remaining = 12 - results.length
  if (remaining > 0 && podcast.case_types?.length) {
    const { data: similar } = await supabase
      .from('podcasts')
      .select(`*, rating_stats:podcast_rating_stats(*)`)
      .overlaps('case_types', podcast.case_types)
      .eq('is_published', true)
      .neq('slug', podcast.slug)
      .order('binge_factor', { ascending: false })
      .limit(remaining + 4)

    if (similar) {
      for (const p of similar as PodcastWithStats[]) {
        if (!seen.has(p.slug)) {
          results.push(p)
          seen.add(p.slug)
          if (results.length >= 12) break
        }
      }
    }
  }

  return results.slice(0, 12)
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const podcast = await getSourcePodcast(slug)
  if (!podcast) return {}

  const title = `Podcasts Like ${podcast.title}`
  const description = `If you loved ${podcast.title}, here are the best podcasts to listen to next. Similar true crime shows matched by case type, storytelling style, and listener ratings.`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: podcast.image_url ? [{ url: podcast.image_url }] : [],
      url: `${BASE}/podcasts-like/${slug}`,
    },
    alternates: { canonical: `${BASE}/podcasts-like/${slug}` },
    // 700+ near-duplicate "podcasts like X" pages, one per published podcast,
    // templated from the same fields as /podcasts/{slug} — thin, auto-generated
    // mirrors that add little unique value per page. noindex,follow keeps them
    // out of the index (no ranking-dilution/duplicate-content risk) while still
    // letting crawlers follow their links through to the real podcast pages and
    // recommendations. See app/sitemap.ts — they're also dropped from the sitemap.
    robots: { index: false, follow: true },
  }
}

export default async function PodcastsLikePage({ params }: Props) {
  const { slug } = await params
  const podcast = await getSourcePodcast(slug)
  if (!podcast) notFound()

  const recommendations = await getRecommendations(podcast)
  const year = new Date().getFullYear()
  const stats = podcast.rating_stats

  // Only ask a question when this podcast's data actually gives a distinct
  // answer — a generic fallback repeated across 160 pages is filler, not FAQ content.
  const faqs = [
    {
      q: `What podcasts are similar to ${podcast.title}?`,
      a: `The best alternatives to ${podcast.title} are podcasts that share its ${podcast.case_types?.join(', ') ?? 'true crime'} focus and ${podcast.format_type?.toLowerCase() ?? 'compelling'} format. ${podcast.if_you_liked_this?.length ? 'Our editorial team has hand-picked the most similar shows based on content type, storytelling style, and community ratings.' : 'We\'ve matched alternatives based on case types, storytelling format, and community ratings from our database.'}`,
    },
    {
      q: `Why do people love ${podcast.title}?`,
      a: `${podcast.title} is known for its ${podcast.factual_style?.toLowerCase() ?? 'compelling'} approach to ${podcast.case_types?.slice(0, 2).join(' and ') ?? 'true crime'}. ${podcast.binge_factor ? `It scores ${podcast.binge_factor}/10 on our binge factor rating, reflecting how compulsively listenable listeners find it.` : ''} ${podcast.quick_verdict === 'Must listen' ? 'It has earned a "Must Listen" rating from our editorial team.' : ''}`,
    },
    ...(podcast.episode_length
      ? [{
          q: `How long are episodes of ${podcast.title}?`,
          a: `Episodes of ${podcast.title} are typically ${podcast.episode_length} long. ${podcast.format_type === 'Serialized' ? 'It follows a serialized format, covering one story across multiple episodes.' : podcast.format_type === 'Episodic' ? 'It follows an episodic format, with each episode covering a different case.' : 'The format varies between serialized arcs and standalone episodes.'}`,
        }]
      : []),
    ...(podcast.platforms?.length
      ? [{
          q: `Where can I listen to ${podcast.title}?`,
          a: `${podcast.title} is available on ${podcast.platforms.join(', ')}. You can find it by searching the show name on any of those platforms.`,
        }]
      : []),
    ...(podcast.best_episode_to_start
      ? [{
          q: `What is the best episode of ${podcast.title} to start with?`,
          a: `New listeners are recommended to start with ${podcast.best_episode_to_start}. ${podcast.format_type === 'Serialized' ? 'As a serialized podcast, it\'s best to start from the beginning of a season.' : 'Episodes can generally be listened to in any order.'}`,
        }]
      : []),
  ]

  const faqSchema = buildFAQSchema(faqs)
  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: 'Home', url: BASE },
    { name: podcast.title, url: `${BASE}/podcasts/${slug}` },
    { name: `Podcasts Like ${podcast.title}`, url: `${BASE}/podcasts-like/${slug}` },
  ])
  const itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Podcasts Like ${podcast.title}`,
    description: `Best alternatives to ${podcast.title} for true crime listeners`,
    numberOfItems: recommendations.length,
    itemListElement: recommendations.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: p.title,
      url: `${BASE}/podcasts/${p.slug}`,
    })),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }} />

      <Header />

      <main id="main-content" className="pt-16 pb-16 min-h-screen">
        {/* ── Hero ── */}
        <section className="relative overflow-hidden bg-ink-950 py-12 px-4">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_-10%,rgba(190,18,60,0.08),transparent)]" />
          <div className="relative max-w-4xl mx-auto">
            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-stone-subtle mb-6">
              <Link href="/" className="hover:text-stone transition-colors">Home</Link>
              <span>/</span>
              <Link href={`/podcasts/${slug}`} className="hover:text-stone transition-colors">{podcast.title}</Link>
              <span>/</span>
              <span className="text-stone-muted">Podcasts Like This</span>
            </nav>

            {/* Source podcast */}
            <div className="flex items-start gap-5 mb-8 p-5 rounded-xl bg-ink-800 border border-white/[0.06]">
              <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-ink-700 shrink-0">
                {podcast.image_url ? (
                  <Image src={podcast.image_url} alt={podcast.title} fill className="object-cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Headphones size={24} className="text-ink-500" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {podcast.country && (
                    <span className="tag">{countryFlag(podcast.country)} {COUNTRIES[podcast.country] ?? podcast.country}</span>
                  )}
                  {podcast.case_types?.slice(0, 3).map(t => <span key={t} className="tag">{t}</span>)}
                </div>
                <Link href={`/podcasts/${slug}`} className="hover:text-white transition-colors">
                  <h2 className="font-serif text-lg text-stone font-semibold">{podcast.title}</h2>
                </Link>
                {stats?.avg_overall && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className={cn('score-badge text-xs', scoreBg(stats.avg_overall))}>
                      {stats.avg_overall.toFixed(1)}
                    </span>
                    <span className="text-stone-subtle text-xs">{stats.rating_count} community ratings</span>
                  </div>
                )}
                {podcast.short_description && (
                  <p className="text-stone-muted text-xs mt-2 leading-relaxed line-clamp-2">{stripHtml(podcast.short_description)}</p>
                )}
              </div>
            </div>

            <h1 className="heading-display text-3xl sm:text-4xl lg:text-5xl mb-4">
              Podcasts Like <em className="text-crimson not-italic">{podcast.title}</em>
            </h1>
            <p className="text-stone-muted text-sm sm:text-base max-w-2xl leading-relaxed">
              If you loved {podcast.title}, here are the best podcasts to try next. Matched by case type,
              storytelling style, and community ratings from our database of {podcast.case_types?.join(', ') ?? 'true crime'} shows.
            </p>
          </div>
        </section>

        {/* ── Why people love the original ── */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <h2 className="heading-section text-xl mb-4">Why listeners love {podcast.title}</h2>

          {/* Narrative paragraph */}
          {(() => {
            const narrative = getPodcastNarrative(podcast, stats)
            return narrative ? (
              <p className="text-stone-muted text-sm sm:text-base leading-relaxed mb-6 max-w-2xl">
                {narrative}
              </p>
            ) : null
          })()}

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {podcast.binge_factor && (
              <div className="card p-4">
                <p className="text-2xs text-crimson font-semibold uppercase tracking-widest mb-1">Binge Factor</p>
                <p className="text-stone font-semibold text-2xl font-serif">{podcast.binge_factor}/10</p>
                <p className="text-stone-muted text-xs mt-1">Community-rated compulsive listenability</p>
              </div>
            )}
            {podcast.format_type && (
              <div className="card p-4">
                <p className="text-2xs text-crimson font-semibold uppercase tracking-widest mb-1">Format</p>
                <p className="text-stone font-semibold text-lg font-serif">{podcast.format_type}</p>
                <p className="text-stone-muted text-xs mt-1">
                  {podcast.format_type === 'Serialized' ? 'One story told across multiple episodes' :
                   podcast.format_type === 'Episodic' ? 'New case with every episode' :
                   'Mix of serialized and standalone episodes'}
                </p>
              </div>
            )}
            {podcast.factual_style && (
              <div className="card p-4">
                <p className="text-2xs text-crimson font-semibold uppercase tracking-widest mb-1">Style</p>
                <p className="text-stone font-semibold text-lg font-serif">{podcast.factual_style}</p>
                <p className="text-stone-muted text-xs mt-1">Presentation approach</p>
              </div>
            )}
            {podcast.episode_length && (
              <div className="card p-4">
                <p className="text-2xs text-crimson font-semibold uppercase tracking-widest mb-1">Episode Length</p>
                <p className="text-stone font-semibold text-lg font-serif">{podcast.episode_length}</p>
                <p className="text-stone-muted text-xs mt-1">Typical episode duration</p>
              </div>
            )}
            {podcast.host_style && (
              <div className="card p-4">
                <p className="text-2xs text-crimson font-semibold uppercase tracking-widest mb-1">Host Style</p>
                <p className="text-stone font-semibold text-lg font-serif">{podcast.host_style}</p>
                <p className="text-stone-muted text-xs mt-1">Presentation format</p>
              </div>
            )}
            {podcast.quick_verdict && (
              <div className="card p-4">
                <p className="text-2xs text-crimson font-semibold uppercase tracking-widest mb-1">Verdict</p>
                <p className={cn(
                  'font-semibold text-lg font-serif',
                  podcast.quick_verdict === 'Must listen' ? 'text-crimson' : 'text-stone'
                )}>{podcast.quick_verdict}</p>
                <p className="text-stone-muted text-xs mt-1">Our editorial rating</p>
              </div>
            )}
          </div>
        </section>

        {/* ── Recommendations ── */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 section-divider">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-2xs text-crimson font-semibold uppercase tracking-widest mb-1">Recommendations</p>
              <h2 className="heading-section text-2xl">
                {recommendations.length} podcasts like {podcast.title}
              </h2>
            </div>
            <Link href="/browse" className="text-sm text-stone-muted hover:text-stone transition-colors flex items-center gap-1">
              Browse all <ArrowRight size={14} />
            </Link>
          </div>

          {recommendations.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {recommendations.map((p, i) => (
                <PodcastCard key={p.id} podcast={p} priority={i < 6} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 card">
              <p className="text-stone-muted mb-2">No recommendations yet for this podcast.</p>
              <p className="text-stone-subtle text-sm mb-4">We're constantly expanding our recommendation network.</p>
              <Link href="/browse" className="btn-ghost inline-flex">Browse all podcasts</Link>
            </div>
          )}
        </section>

        {/* ── Comparison table ── */}
        {recommendations.length > 0 && (
          <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <h2 className="heading-section text-xl mb-6">How they compare</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.08]">
                    <th className="text-left py-3 pr-4 text-stone-subtle font-medium text-xs uppercase tracking-wider">Podcast</th>
                    <th className="text-left py-3 px-4 text-stone-subtle font-medium text-xs uppercase tracking-wider">Format</th>
                    <th className="text-left py-3 px-4 text-stone-subtle font-medium text-xs uppercase tracking-wider">Country</th>
                    <th className="text-right py-3 pl-4 text-stone-subtle font-medium text-xs uppercase tracking-wider">Binge</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Source podcast row */}
                  <tr className="border-b border-white/[0.06] bg-crimson/5">
                    <td className="py-3 pr-4">
                      <Link href={`/podcasts/${podcast.slug}`} className="text-crimson font-medium hover:underline">
                        {podcast.title} <span className="text-stone-subtle text-xs">(original)</span>
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-stone-muted">{podcast.format_type ?? '—'}</td>
                    <td className="py-3 px-4 text-stone-muted">{podcast.country ? (COUNTRIES[podcast.country] ?? podcast.country) : '—'}</td>
                    <td className="py-3 pl-4 text-right">
                      {podcast.binge_factor ? (
                        <span className={cn('score-badge text-xs', scoreBg(podcast.binge_factor))}>
                          {podcast.binge_factor}/10
                        </span>
                      ) : '—'}
                    </td>
                  </tr>
                  {recommendations.slice(0, 8).map(p => (
                    <tr key={p.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 pr-4">
                        <Link href={`/podcasts/${p.slug}`} className="text-stone hover:text-white transition-colors font-medium">
                          {p.title}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-stone-muted">{p.format_type ?? '—'}</td>
                      <td className="py-3 px-4 text-stone-muted">{p.country ? (COUNTRIES[p.country] ?? p.country) : '—'}</td>
                      <td className="py-3 pl-4 text-right">
                        {p.binge_factor ? (
                          <span className={cn('score-badge text-xs', scoreBg(p.binge_factor))}>
                            {p.binge_factor}/10
                          </span>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ── Newsletter CTA ── */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="relative overflow-hidden rounded-2xl bg-ink-800 border border-white/[0.06] p-8">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(190,18,60,0.1),transparent_60%)]" />
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-6">
              <div className="flex-1">
                <p className="text-2xs text-crimson font-semibold uppercase tracking-widest mb-2">Newsletter</p>
                <h2 className="heading-section text-xl mb-1">Get recommendations like this weekly</h2>
                <p className="text-stone-muted text-sm">Curated picks, new reviews, and hidden gems. Find your next obsession.</p>
              </div>
              <div className="sm:w-72">
                <NewsletterForm source={`podcasts_like_${slug}`} variant="minimal" />
              </div>
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h2 className="heading-section text-2xl mb-8">Frequently Asked Questions</h2>
          <div className="space-y-4">
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
        </section>

        {/* ── Back to podcast ── */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
          <Link
            href={`/podcasts/${slug}`}
            className="inline-flex items-center gap-2 text-sm text-stone-muted hover:text-stone transition-colors"
          >
            ← View full {podcast.title} review
          </Link>
        </div>
      </main>

      <Footer />
    </>
  )
}

export async function generateStaticParams() {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('podcasts')
    .select('slug')
    .eq('is_published', true)
  return (data ?? []).map(p => ({ slug: p.slug }))
}

export const revalidate = 3600
