import type { Metadata } from 'next'
import Link from 'next/link'
import { Star, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { PodcastCard } from '@/components/podcasts/podcast-card'
import { NewsletterForm } from '@/components/newsletter/newsletter-form'
import { CATEGORIES } from '@/lib/types/database'
import { BASE, breadcrumbSchema } from '@/lib/seo'
import { BEST_OF_PAGES } from '@/lib/best-of'
import type { Podcast, RatingStats } from '@/lib/types/database'

export const metadata: Metadata = {
  title: 'Best True Crime Podcasts 2025',
  description:
    'The definitive list of the best true crime podcasts, ranked by expert review and community ratings. Murder, cold cases, serial killers, fraud — find your next obsession.',
  alternates: { canonical: `${BASE}/best-true-crime-podcasts` },
  openGraph: {
    title: 'Best True Crime Podcasts 2025 | ListenTrueCrime',
    description: 'Expert-reviewed and community-rated. The definitive true crime podcast rankings.',
    url: `${BASE}/best-true-crime-podcasts`,
  },
}

export default async function BestTrueCrimePodcastsPage() {
  const supabase = await createClient()

  const [{ data: topRated }, { data: newest }, { data: featured }] = await Promise.all([
    supabase
      .from('podcasts')
      .select(`*, rating_stats:podcast_rating_stats(*)`)
      .eq('is_published', true)
      .order('binge_factor', { ascending: false })
      .limit(12),
    supabase
      .from('podcasts')
      .select(`*, rating_stats:podcast_rating_stats(*)`)
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(6),
    supabase
      .from('podcasts')
      .select(`*, rating_stats:podcast_rating_stats(*)`)
      .eq('is_published', true)
      .eq('quick_verdict', 'Must listen')
      .limit(6),
  ])

  type PodcastWithStats = Podcast & { rating_stats: RatingStats | null }
  const top = (topRated ?? []) as PodcastWithStats[]
  const must = (featured ?? []) as PodcastWithStats[]
  const fresh = (newest ?? []) as PodcastWithStats[]

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Best True Crime Podcasts 2025',
    description: 'Expert-reviewed and community-rated true crime podcasts, ranked by binge factor',
    url: `${BASE}/best-true-crime-podcasts`,
    numberOfItems: top.length,
    itemListElement: top.map((p, i) => ({
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

  const breadcrumbs = breadcrumbSchema([
    { name: 'Home', url: BASE },
    { name: 'Best True Crime Podcasts', url: `${BASE}/best-true-crime-podcasts` },
  ])

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
      <Header />

      <main className="pt-24 pb-16">
        {/* Hero */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gold-DEFAULT/10 border border-gold-DEFAULT/20 text-gold-light text-xs font-medium mb-6">
            <Star size={11} fill="currentColor" />
            Community-rated & expert-reviewed
          </div>
          <h1 className="heading-display text-4xl sm:text-5xl mb-4">
            Best True Crime Podcasts 2025
          </h1>
          <p className="text-stone-muted text-lg max-w-2xl mx-auto leading-relaxed">
            Every podcast on this list has been reviewed for storytelling, research quality,
            host quality, and binge-worthiness. No filler — only the ones worth your time.
          </p>
        </section>

        {/* Best-of subcategory links */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
          <h2 className="heading-section text-xl mb-4">Browse by type</h2>
          <div className="flex flex-wrap gap-2">
            {BEST_OF_PAGES.map(p => (
              <Link key={p.slug} href={`/best/${p.slug}`} className="tag hover:border-white/20 transition-colors text-xs">
                {p.h1.replace('Best ', '').replace(' 2025', '')}
              </Link>
            ))}
          </div>
        </section>

        {/* Must Listen */}
        {must.length > 0 && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
            <div className="mb-6">
              <p className="text-2xs text-crimson font-semibold uppercase tracking-widest mb-1">Essential listening</p>
              <h2 className="heading-section text-2xl sm:text-3xl">Must-listen picks</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {must.map((p, i) => <PodcastCard key={p.id} podcast={p} priority={i < 3} />)}
            </div>
          </section>
        )}

        {/* Top by binge factor */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16 section-divider pt-16">
          <div className="flex items-end justify-between mb-6">
            <div>
              <p className="text-2xs text-crimson font-semibold uppercase tracking-widest mb-1">Rankings</p>
              <h2 className="heading-section text-2xl sm:text-3xl">Highest binge factor</h2>
            </div>
            <Link href="/browse?sort=binge_desc" className="text-sm text-stone-muted hover:text-stone transition-colors flex items-center gap-1">
              Full list <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {top.map((p, i) => <PodcastCard key={p.id} podcast={p} priority={i < 6} />)}
          </div>
        </section>

        {/* Browse by category */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16 section-divider pt-16">
          <div className="mb-6">
            <p className="text-2xs text-crimson font-semibold uppercase tracking-widest mb-1">By genre</p>
            <h2 className="heading-section text-2xl sm:text-3xl">Browse by category</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {CATEGORIES.map(cat => (
              <Link key={cat.slug} href={`/category/${cat.slug}`} className="card-hover group p-5 flex flex-col gap-2">
                <span className="text-2xl">{cat.emoji}</span>
                <h3 className="text-stone text-sm font-semibold group-hover:text-white transition-colors">{cat.label}</h3>
                <p className="text-stone-subtle text-xs leading-relaxed line-clamp-2">{cat.description}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* New additions */}
        {fresh.length > 0 && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16 section-divider pt-16">
            <div className="mb-6">
              <p className="text-2xs text-crimson font-semibold uppercase tracking-widest mb-1">Just added</p>
              <h2 className="heading-section text-2xl sm:text-3xl">Newest reviews</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {fresh.map((p) => <PodcastCard key={p.id} podcast={p} />)}
            </div>
          </section>
        )}

        {/* Newsletter CTA */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 section-divider pt-16">
          <div className="relative overflow-hidden rounded-2xl bg-ink-800 border border-white/[0.06] p-8 sm:p-12">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(190,18,60,0.1),transparent_60%)]" />
            <div className="relative z-10 max-w-lg">
              <p className="text-2xs text-crimson font-semibold uppercase tracking-widest mb-3">Newsletter</p>
              <h2 className="heading-section text-2xl sm:text-3xl mb-3">Get the best picks weekly</h2>
              <p className="text-stone-muted text-sm mb-6 leading-relaxed">
                New reviews, hidden gems, and community favourites — straight to your inbox.
              </p>
              <NewsletterForm source="best_page" />
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}
