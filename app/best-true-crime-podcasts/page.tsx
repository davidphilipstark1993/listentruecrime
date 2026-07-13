import type { Metadata } from 'next'
import Link from 'next/link'
import { Star, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { PodcastCard } from '@/components/podcasts/podcast-card'
import { NewsletterForm } from '@/components/newsletter/newsletter-form'
import { NewsletterLeadMagnet } from '@/components/newsletter/newsletter-lead-magnet'
import { CATEGORIES, COUNTRIES } from '@/lib/types/database'
import { buildFAQSchema, buildBreadcrumbSchema, buildItemListSchema } from '@/lib/seo/content'
import { BASE } from '@/lib/seo/config'
import type { Podcast, RatingStats } from '@/lib/types/database'
const YEAR = new Date().getFullYear()

export const metadata: Metadata = {
  title: `Best True Crime Podcasts (${YEAR}) — Expert Reviews & Rankings`,
  description:
    'The definitive list of the best true crime podcasts, ranked by expert review and community ratings. From Serial to Crime Junkie, Casefile to Teacher\'s Pet — find your next obsession.',
  openGraph: {
    title: `Best True Crime Podcasts (${YEAR}) | ListenTrueCrime`,
    description: 'Expert-reviewed and community-rated. Find your next true crime obsession.',
    url: `${BASE}/best-true-crime-podcasts`,
  },
  twitter: {
    card: 'summary_large_image',
    title: `Best True Crime Podcasts (${YEAR})`,
    description: 'Expert-reviewed and community-rated. From Serial to Crime Junkie, Casefile to Teacher\'s Pet — find your next obsession.',
  },
  alternates: { canonical: `${BASE}/best-true-crime-podcasts` },
}

const faqs = [
  {
    q: `What are the best true crime podcasts in ${YEAR}?`,
    a: 'The best true crime podcasts right now include Serial (the podcast that started the genre\'s golden age), Casefile (the definitive Australian crime podcast), Crime Junkie (for weekly case summaries), In the Dark (for serious investigative journalism), and Teacher\'s Pet (arguably the finest single-season true crime podcast ever made). Our community ratings and expert scores are updated regularly as new shows emerge.',
  },
  {
    q: 'What is the most popular true crime podcast of all time?',
    a: 'Serial is the most downloaded and influential true crime podcast of all time, with hundreds of millions of downloads since its 2014 launch. Crime Junkie is arguably the most popular currently-active weekly true crime podcast, with millions of listeners per episode. Casefile is the most popular Australian true crime podcast globally.',
  },
  {
    q: 'What true crime podcast should I start with?',
    a: 'If you\'re new to true crime podcasts, start with Serial Season 1. It\'s short (12 episodes), brilliantly produced, and perfectly encapsulates what the genre can do at its best. After that, try Casefile for episodic variety, or Teacher\'s Pet if you want another deep serialized investigation.',
  },
  {
    q: 'How do we rank true crime podcasts?',
    a: 'Our rankings combine editorial expert reviews across six dimensions (storytelling, research quality, host quality, production, binge factor, and factual accuracy) with community ratings from our registered listener base. Podcasts with a "Must Listen" verdict have scored exceptionally across all dimensions.',
  },
  {
    q: 'Are there true crime podcasts specifically about cold cases?',
    a: 'Yes — cold case podcasts are one of the most popular subgenres. Your Own Backyard, In the Dark, Atlanta Monster, and dedicated episodes from Casefile all focus on unsolved or long-cold cases. Browse our Cold Cases category for the full list.',
  },
  {
    q: 'What are the best UK true crime podcasts?',
    a: 'The best UK true crime podcasts include Real Crimes, Crime & Punishment UK, and various BBC documentary podcasts. For British cases covered by international shows, Casefile and Crime Junkie both regularly cover UK crimes. Browse our UK True Crime category for a curated selection.',
  },
  {
    q: 'What\'s the difference between investigative podcasts and true crime podcasts?',
    a: 'Investigative true crime podcasts conduct original reporting — filing FOIA requests, interviewing primary sources, and bringing new evidence to light. Standard true crime podcasts typically retell cases using existing public records. Shows like Serial, In the Dark, and Your Own Backyard are investigative; Crime Junkie is summarising and retelling.',
  },
]

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

  const faqSchema = buildFAQSchema(faqs)
  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: 'Home', url: BASE },
    { name: 'Best True Crime Podcasts', url: `${BASE}/best-true-crime-podcasts` },
  ])
  const itemListSchema = buildItemListSchema(
    'Best True Crime Podcasts',
    'Expert-reviewed and community-rated true crime podcasts',
    top.map((p, i) => ({ name: p.title, url: `${BASE}/podcasts/${p.slug}` }))
  )

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }} />
      <Header />

      <main className="pt-24 pb-16">
        {/* Hero */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-16">
          <nav aria-label="Breadcrumb" className="flex items-center justify-center gap-1.5 text-xs text-stone-subtle mb-6">
            <Link href="/" className="hover:text-stone transition-colors">Home</Link>
            <span>/</span>
            <span className="text-stone-muted">Best True Crime Podcasts</span>
          </nav>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gold-DEFAULT/10 border border-gold-DEFAULT/20 text-gold-light text-xs font-medium mb-6">
            <Star size={11} fill="currentColor" />
            Community-rated & expert-reviewed
          </div>
          <h1 className="heading-display text-4xl sm:text-5xl mb-4">
            Best True Crime Podcasts ({YEAR})
          </h1>
          <p className="text-stone-muted text-lg max-w-2xl mx-auto leading-relaxed">
            Every podcast on this list has been reviewed for storytelling, research quality,
            host quality, and binge-worthiness. No filler — only the ones worth your time.
          </p>
          <p className="text-stone-subtle text-sm mt-3">
            Updated {new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
          </p>
        </section>

        {/* Must Listen */}
        {must.length > 0 && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
            <div className="mb-6">
              <p className="text-2xs text-crimson font-semibold uppercase tracking-widest mb-1">Essential listening</p>
              <h2 className="heading-section text-2xl sm:text-3xl">Must-listen picks</h2>
              <p className="text-stone-muted text-sm mt-1">Podcasts that have earned our highest editorial rating across all dimensions</p>
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
              <p className="text-stone-muted text-sm mt-1">Ranked by our community's compulsive listenability score</p>
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

        {/* By country */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16 section-divider pt-16">
          <div className="mb-6">
            <p className="text-2xs text-crimson font-semibold uppercase tracking-widest mb-1">By region</p>
            <h2 className="heading-section text-2xl sm:text-3xl">Browse by country</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            {Object.entries(COUNTRIES).map(([code, name]) => (
              <Link
                key={code}
                href={`/country/${code}`}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-ink-800 border border-white/[0.08] text-stone-muted hover:text-stone hover:border-white/20 text-sm transition-colors"
              >
                {name} True Crime <ArrowRight size={13} />
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
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 section-divider pt-16 mb-16">
          <div className="relative overflow-hidden rounded-2xl bg-ink-800 border border-white/[0.06] p-8 sm:p-12">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(190,18,60,0.1),transparent_60%)]" />
            <div className="relative z-10 max-w-lg">
              <p className="text-2xs text-crimson font-semibold uppercase tracking-widest mb-3">Newsletter</p>
              <h2 className="heading-section text-2xl sm:text-3xl mb-3">Get the best picks weekly</h2>
              <p className="text-stone-muted text-sm mb-6 leading-relaxed">
                New reviews, hidden gems, and community favourites — straight to your inbox every week.
              </p>
              <NewsletterForm source="best_page" />
            </div>
          </div>
        </section>

        {/* Lead magnet */}
        <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 mb-10">
          <NewsletterLeadMagnet variant="banner" source="best_page_lead_magnet" />
        </section>

        {/* FAQ */}
        <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
          <h2 className="heading-section text-2xl sm:text-3xl mb-8">Frequently Asked Questions</h2>
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
      </main>

      <Footer />
    </>
  )
}
