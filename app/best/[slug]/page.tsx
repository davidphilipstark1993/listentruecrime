export const revalidate = 3600

import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Star, ChevronRight } from 'lucide-react'
import { supabasePublic } from '@/lib/supabase/public'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { PodcastCard } from '@/components/podcasts/podcast-card'
import { NewsletterForm } from '@/components/newsletter/newsletter-form'
import { BEST_OF_PAGES, getBestOfPage } from '@/lib/best-of'
import { CATEGORIES } from '@/lib/types/database'
import { BASE, breadcrumbSchema } from '@/lib/seo'
import type { Podcast, RatingStats } from '@/lib/types/database'

interface Props {
  params: Promise<{ slug: string }>
}

type PodcastWithStats = Podcast & { rating_stats: RatingStats | null }

async function getPodcasts(page: ReturnType<typeof getBestOfPage>): Promise<PodcastWithStats[]> {
  if (!page) return []
  let q = supabasePublic
    .from('podcasts')
    .select(`*, rating_stats:podcast_rating_stats(*)`)
    .eq('is_published', true)

  if (page.caseTypes?.length) q = q.overlaps('case_types', page.caseTypes)
  if (page.country) q = q.eq('country', page.country)
  if (page.format) q = q.eq('format_type', page.format)
  if (page.minBinge) q = q.gte('binge_factor', page.minBinge)

  const { data } = await q.order('binge_factor', { ascending: false }).limit(24)
  return (data ?? []) as PodcastWithStats[]
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const page = getBestOfPage(slug)
  if (!page) return {}
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: `${BASE}/best/${slug}` },
    openGraph: {
      title: `${page.title} | ListenTrueCrime`,
      description: page.description,
      url: `${BASE}/best/${slug}`,
    },
  }
}

export default async function BestOfPage({ params }: Props) {
  const { slug } = await params
  const page = getBestOfPage(slug)
  if (!page) notFound()

  const podcasts = await getPodcasts(page)

  const breadcrumbs = breadcrumbSchema([
    { name: 'Home', url: BASE },
    { name: 'Best Podcasts', url: `${BASE}/best-true-crime-podcasts` },
    { name: page.h1, url: `${BASE}/best/${slug}` },
  ])

  const itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: page.h1,
    description: page.description,
    url: `${BASE}/best/${slug}`,
    numberOfItems: podcasts.length,
    itemListElement: podcasts.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: p.title,
      url: `${BASE}/podcasts/${p.slug}`,
      ...(p.rating_stats?.avg_overall ? {
        item: {
          '@type': 'PodcastSeries',
          name: p.title,
          url: `${BASE}/podcasts/${p.slug}`,
          image: p.image_url,
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: p.rating_stats.avg_overall.toFixed(1),
            bestRating: '10',
            ratingCount: p.rating_stats.rating_count,
          },
        },
      } : {}),
    })),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }} />

      <Header />

      <main className="pt-24 pb-16">
        {/* Hero */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-stone-subtle mb-6">
            <Link href="/" className="hover:text-stone transition-colors">Home</Link>
            <ChevronRight size={12} />
            <Link href="/best-true-crime-podcasts" className="hover:text-stone transition-colors">Best Podcasts</Link>
            <ChevronRight size={12} />
            <span className="text-stone-muted">{page.h1}</span>
          </nav>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gold-DEFAULT/10 border border-gold-DEFAULT/20 text-gold-light text-xs font-medium mb-6">
            <Star size={11} fill="currentColor" />
            Community-rated & expert-reviewed
          </div>
          <h1 className="heading-display text-4xl sm:text-5xl mb-4">{page.h1}</h1>
          <p className="text-stone-muted text-lg max-w-2xl leading-relaxed">{page.description}</p>
        </section>

        {/* Editorial intro — AI discoverability */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
          <div className="card p-6 sm:p-8 border-l-4 border-crimson/60">
            <p className="text-stone leading-relaxed">{page.intro}</p>
          </div>
        </section>

        {/* Podcast grid */}
        {podcasts.length > 0 ? (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
            <div className="flex items-center justify-between mb-6">
              <h2 className="heading-section text-2xl">
                {podcasts.length} podcast{podcasts.length !== 1 ? 's' : ''} — ranked by binge factor
              </h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {podcasts.map((p, i) => (
                <PodcastCard key={p.id} podcast={p} priority={i < 6} />
              ))}
            </div>
          </section>
        ) : (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
            <div className="text-center py-24">
              <p className="text-stone-muted text-lg mb-2">No podcasts found yet</p>
              <Link href="/browse" className="btn-outline mt-4 inline-flex">Browse all podcasts</Link>
            </div>
          </section>
        )}

        {/* Browse other best-of lists */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16 section-divider pt-12">
          <h2 className="heading-section text-2xl mb-6">More best-of lists</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {BEST_OF_PAGES.filter(p => p.slug !== slug).slice(0, 6).map(p => (
              <Link key={p.slug} href={`/best/${p.slug}`} className="card-hover p-4 flex flex-col gap-1">
                <span className="text-stone text-sm font-semibold group-hover:text-white">{p.h1}</span>
                <span className="text-stone-subtle text-xs line-clamp-2">{p.description}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Newsletter */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 section-divider pt-12">
          <div className="relative overflow-hidden rounded-2xl bg-ink-800 border border-white/[0.06] p-8 sm:p-12">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(190,18,60,0.1),transparent_60%)]" />
            <div className="relative z-10 max-w-lg">
              <p className="text-2xs text-crimson font-semibold uppercase tracking-widest mb-3">Newsletter</p>
              <h2 className="heading-section text-2xl sm:text-3xl mb-3">Get weekly picks</h2>
              <p className="text-stone-muted text-sm mb-6 leading-relaxed">
                New reviews, hidden gems, and community favourites — straight to your inbox.
              </p>
              <NewsletterForm source={`best_${slug}`} />
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}

export async function generateStaticParams() {
  return BEST_OF_PAGES.map(p => ({ slug: p.slug }))
}
