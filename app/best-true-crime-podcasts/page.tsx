import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { Star, ArrowRight, ChevronDown, ChevronUp, Headphones } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { PodcastCard } from '@/components/podcasts/podcast-card'
import { RankedPodcastEntry, type RankedPodcast } from '@/components/best/ranked-podcast-entry'
import { NewsletterForm } from '@/components/newsletter/newsletter-form'
import { NewsletterLeadMagnet } from '@/components/newsletter/newsletter-lead-magnet'
import { CATEGORIES, COUNTRIES } from '@/lib/types/database'
import { buildFAQSchema, buildBreadcrumbSchema } from '@/lib/seo/content'
import { BASE, CURRENT_YEAR, ogDefaults } from '@/lib/seo/config'
import { getAffiliateProductsForPage } from '@/lib/affiliates/queries'
import { FurtherReading } from '@/components/affiliates/further-reading'
import { POPULAR_GUIDES } from '@/lib/seo/popular-guides'
import { rankPodcasts } from '@/lib/best-of-meta'
import {
  BEST_PICKS, BEST_PICKS_UPDATED, BEST_TYPE_SECTIONS, formatPicksDate, isMustListen, orderPicks,
} from '@/lib/best-page-picks'
import type { RatingStats } from '@/lib/types/database'

const YEAR = CURRENT_YEAR
const PAGE_URL = `${BASE}/best-true-crime-podcasts`
const PICK_COUNT = BEST_PICKS.length
const HUB_TITLE = `${PICK_COUNT} Best True Crime Podcasts (${YEAR}), Ranked & Reviewed`
const HUB_DESCRIPTION_FALLBACK = `The best true crime podcasts of ${YEAR}, ranked. Cover art, our verdict, episode count and where to start for every show.`

export const revalidate = 3600

/** Columns the page needs (no description/search_vector, which are large). */
const COLUMNS =
  'id, slug, title, image_url, short_description, newsletter_worthy_summary, country, country_name, case_types, ' +
  'format_type, host_name, host_style, factual_style, binge_factor, episode_length, episode_count, ' +
  'best_episode_to_start, platforms, platform_urls, quick_verdict, is_featured, created_at, ' +
  'rating_stats:podcast_rating_stats(*)'

type PagePodcast = RankedPodcast & { is_featured: boolean; created_at: string; rating_stats: RatingStats | null }

async function getPicks(): Promise<PagePodcast[]> {
  const { data } = await createAdminClient()
    .from('podcasts')
    .select(COLUMNS)
    .eq('is_published', true)
    .in('slug', BEST_PICKS)
  return orderPicks((data ?? []) as unknown as PagePodcast[])
}

export async function generateMetadata(): Promise<Metadata> {
  const names = (await getPicks()).slice(0, 3).map(p => p.title)
  const described = names.length === 3
    ? `The best true crime podcasts of ${YEAR}, ranked: ${names.join(", ")} and more, with our verdict and where to start for each.`
    : null
  const description = described && described.length <= 160 ? described : HUB_DESCRIPTION_FALLBACK
  return {
    // Absolute: the site template would append " | ListenTrueCrime" and push this past ~60 characters.
    title: { absolute: HUB_TITLE },
    description,
    openGraph: {
      title: HUB_TITLE,
      description,
      url: PAGE_URL,
      ...ogDefaults('Best True Crime Podcasts', `${PICK_COUNT} ranked and reviewed`),
    },
    twitter: { card: 'summary_large_image', title: HUB_TITLE, description },
    alternates: { canonical: PAGE_URL },
  }
}

const faqs = [
  {
    q: `What are the best true crime podcasts in ${YEAR}?`,
    a: 'Our top five are Serial, In the Dark, Casefile, The Teacher\'s Pet and S-Town. Serial and In the Dark are the benchmark for investigative audio journalism, Casefile is the best long-running episodic show, and The Teacher\'s Pet and S-Town are two of the finest single-season stories the genre has produced. The full ranked list of 25 is above.',
  },
  {
    q: 'What true crime podcast should I start with?',
    a: 'Start with Serial Season 1: twelve episodes, one case, and a clear beginning, middle and end. If you would rather dip in and out, try Casefile or Crime Junkie, where every episode is a self-contained case. For a short binge, Dr. Death and Dirty John can each be finished in a weekend.',
  },
  {
    q: 'What is the best ongoing true crime podcast?',
    a: 'For a weekly show with a deep back catalogue, Casefile is our pick for documentary-style storytelling and Crime Junkie for shorter, conversational episodes. Morbid suits listeners who like hosts with a sense of humour, and Wrongful Conviction with Jason Flom is the best interview-led show.',
  },
  {
    q: 'What are the best UK true crime podcasts?',
    a: 'From our list: The Missing Cryptoqueen (BBC), Sweet Bobby (Tortoise) and Murder Mile, which walks the London streets where each crime happened. Where Is George Gibney? covers an Irish case. See the UK section on this page and our British true crime guide for more.',
  },
  {
    q: 'What are the best investigative true crime podcasts?',
    a: 'In the Dark, Serial, Bone Valley, Your Own Backyard, The Teacher\'s Pet and Someone Knows Something are all built on original reporting rather than retelling. Several of them turned up new evidence or contributed to arrests or convictions.',
  },
  {
    q: 'How do we choose and rank the podcasts?',
    a: 'The list is chosen by our editor. We weigh our editorial verdict ("Must listen" is our highest), the Binge Factor score we give every show, the quality of the reporting and how well the show has held up. Binge Factor alone is not the ranking: a weekly show like Crime Junkie scores lower on binge-ability than a tight limited series but earns its place for consistency. Full details are on our How We Review page.',
  },
  {
    q: 'What is the difference between investigative and regular true crime podcasts?',
    a: 'Investigative podcasts do original reporting: interviewing witnesses, requesting records and finding new evidence. Many popular true crime podcasts instead retell cases from existing public sources. Both have their place: on this list Serial and In the Dark are investigative, while Casefile and Crime Junkie are mostly retelling.',
  },
]

export default async function BestTrueCrimePodcastsPage() {
  const supabase = createAdminClient()

  const [picks, { data: mustData }, { data: newest }, reading] = await Promise.all([
    getPicks(),
    // Pool for the "best by type" sections.
    supabase
      .from('podcasts')
      .select(COLUMNS)
      .eq('is_published', true)
      .eq('quick_verdict', 'Must listen')
      .not('image_url', 'is', null)
      .order('binge_factor', { ascending: false })
      .limit(300),
    supabase
      .from('podcasts')
      .select(COLUMNS)
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(6),
    // Books placed on this page in /admin/affiliates (page type "Other page")
    getAffiliateProductsForPage('page', 'best-true-crime-podcasts'),
  ])

  const pickSlugs = new Set(picks.map(p => p.slug))
  const pool = rankPodcasts(((mustData ?? []) as unknown as PagePodcast[]).filter(p => isMustListen(p)))
  const fresh = (newest ?? []) as unknown as PagePodcast[]

  // Each type section shows up to 6 shows not already in the ranked list, and never repeats a show.
  const shown = new Set(pickSlugs)
  const typeSections = BEST_TYPE_SECTIONS.map(section => {
    const items = pool.filter(p => !shown.has(p.slug) && section.predicate(p)).slice(0, 6)
    items.forEach(p => shown.add(p.slug))
    // Ranked picks that fit this section, named in the intro line.
    const fromList = picks.filter(p => section.predicate(p)).slice(0, 4)
    return { ...section, items, fromList }
  }).filter(s => s.items.length >= 3)

  const updated = formatPicksDate()
  const top5 = picks.slice(0, 5)

  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: 'Home', url: BASE },
    { name: 'Best True Crime Podcasts', url: PAGE_URL },
  ])
  const pageSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${PAGE_URL}#webpage`,
    url: PAGE_URL,
    name: `The ${PICK_COUNT} Best True Crime Podcasts (${YEAR})`,
    description: HUB_DESCRIPTION_FALLBACK,
    dateModified: BEST_PICKS_UPDATED,
    inLanguage: 'en-GB',
    author: { '@type': 'Person', name: 'David Stark', url: `${BASE}/authors/david-stark` },
    publisher: { '@type': 'Organization', name: 'ListenTrueCrime', url: BASE },
    mainEntity: {
      '@type': 'ItemList',
      name: 'Best True Crime Podcasts',
      itemListOrder: 'https://schema.org/ItemListOrderAscending',
      numberOfItems: picks.length,
      itemListElement: picks.map((p, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: `${BASE}/podcasts/${p.slug}`,
        name: p.title,
        ...(p.image_url ? { image: p.image_url } : {}),
      })),
    },
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pageSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(buildFAQSchema(faqs)) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <Header />

      <main id="main-content" className="pt-24 pb-16">
        {/* Hero */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-10">
          <nav aria-label="Breadcrumb" className="flex items-center justify-center gap-1.5 text-xs text-stone-subtle mb-6">
            <Link href="/" className="hover:text-stone transition-colors">Home</Link>
            <span>/</span>
            <span className="text-stone-muted">Best True Crime Podcasts</span>
          </nav>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gold-DEFAULT/10 border border-gold-DEFAULT/20 text-gold-light text-xs font-medium mb-6">
            <Star size={11} fill="currentColor" />
            {PICK_COUNT} podcasts, ranked and reviewed
          </div>
          <h1 className="heading-display text-4xl sm:text-5xl mb-5">
            The Best True Crime Podcasts ({YEAR})
          </h1>
          <p className="text-stone-muted text-lg max-w-2xl mx-auto leading-relaxed">
            {top5.length === 5 ? (
              <>
                Looking for good true crime podcasts? The best true crime podcasts right now are{' '}
                {top5.map((p, i) => (
                  <span key={p.id}>
                    {i > 0 && (i === 4 ? ' and ' : ', ')}
                    <Link href={`#pick-${i + 1}`} className="text-stone hover:text-white underline decoration-white/20 underline-offset-4">{p.title}</Link>
                  </span>
                ))}
                . Below are our {picks.length} favourites, each with cover art, our verdict, episode count and the best episode to start with.
              </>
            ) : (
              <>Looking for good true crime podcasts? Our ranked list of the ones most worth your time, each with our verdict and where to start.</>
            )}
          </p>
          <p className="text-stone-subtle text-sm mt-4">
            By <Link href="/authors/david-stark" className="hover:text-stone underline underline-offset-2">David Stark</Link>, Editor
            {' · '}Last updated <time dateTime={BEST_PICKS_UPDATED}>{updated}</time>
            {' · '}<Link href="/how-we-review" className="hover:text-stone underline underline-offset-2">How we review</Link>
          </p>
        </section>

        {/* Quick picks: cover-art grid that jumps to each entry */}
        {picks.length > 0 && (
          <section aria-labelledby="quick-picks" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mb-14">
            <h2 id="quick-picks" className="text-2xs text-crimson font-semibold uppercase tracking-widest mb-4 text-center">
              At a glance: the top true crime podcasts
            </h2>
            <ol className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
              {picks.slice(0, 10).map((p, i) => (
                <li key={p.id}>
                  <a href={`#pick-${i + 1}`} className="group block">
                    <span className="relative block aspect-square rounded-lg overflow-hidden bg-ink-700">
                      {p.image_url ? (
                        <Image
                          src={p.image_url}
                          alt={`${p.title} podcast cover art`}
                          fill
                          sizes="(max-width: 640px) 50vw, 20vw"
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                          priority={i < 5}
                        />
                      ) : (
                        <span className="absolute inset-0 flex items-center justify-center"><Headphones size={28} className="text-ink-500" aria-hidden /></span>
                      )}
                      <span className="absolute top-1.5 left-1.5 min-w-[1.75rem] h-7 px-1.5 rounded-full bg-ink-900/90 border border-white/10 flex items-center justify-center text-sm text-white font-semibold tabular-nums">
                        {i + 1}
                      </span>
                    </span>
                    <span className="block mt-2 text-sm text-stone font-medium leading-snug group-hover:text-white line-clamp-2">{p.title}</span>
                  </a>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* The ranked list */}
        <section aria-labelledby="ranked-list" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
          <div className="mb-8">
            <p className="text-2xs text-crimson font-semibold uppercase tracking-widest mb-1">The list</p>
            <h2 id="ranked-list" className="heading-section text-2xl sm:text-3xl">
              The {picks.length} best true crime podcasts, ranked
            </h2>
            <p className="text-stone-muted text-sm mt-2 leading-relaxed">
              Chosen by our editor for reporting, storytelling and how well each show has held up.
              Binge Factor is our 1 to 10 score for how hard a show is to stop listening to.
              Tap any show for the full review.
            </p>
          </div>
          <ol className="space-y-6">
            {picks.map((p, i) => (
              <RankedPodcastEntry key={p.id} podcast={p} rank={i + 1} priority={i < 2} />
            ))}
          </ol>
        </section>

        {/* Best by type */}
        {typeSections.length > 0 && (
          <section aria-labelledby="by-type" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16 section-divider pt-16">
            <div className="mb-8 max-w-3xl">
              <p className="text-2xs text-crimson font-semibold uppercase tracking-widest mb-1">More must-listens</p>
              <h2 id="by-type" className="heading-section text-2xl sm:text-3xl">Best true crime podcasts by type</h2>
              <p className="text-stone-muted text-sm mt-2">
                More shows with our Must listen verdict, grouped by what they cover. None of these repeat the ranked list above.
              </p>
              <nav aria-label="Jump to a type" className="mt-4 flex flex-wrap gap-2">
                {typeSections.map(s => (
                  <a key={s.id} href={`#${s.id}`} className="px-3 py-1.5 rounded-full bg-ink-800 border border-white/[0.08] text-xs text-stone-muted hover:text-stone hover:border-white/20 transition-colors">
                    {s.shortLabel}
                  </a>
                ))}
              </nav>
            </div>
            <div className="space-y-14">
              {typeSections.map(s => (
                <div key={s.id} id={s.id} className="scroll-mt-24">
                  <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
                    <div className="max-w-3xl">
                      <h3 className="heading-section text-xl sm:text-2xl">{s.heading}</h3>
                      <p className="text-stone-muted text-sm mt-1">
                        {s.blurb}
                        {s.fromList.length > 0 && (
                          <> From our ranked list: {s.fromList.map((p, i) => (
                            <span key={p.id}>
                              {i > 0 && (i === s.fromList.length - 1 ? ' and ' : ', ')}
                              <Link href={`/podcasts/${p.slug}`} className="text-stone hover:text-white underline underline-offset-2 decoration-white/20">{p.title}</Link>
                            </span>
                          ))}.</>
                        )}
                      </p>
                    </div>
                    <Link href={s.more.href} className="text-sm text-crimson hover:underline inline-flex items-center gap-1">
                      {s.more.label} <ArrowRight size={14} aria-hidden />
                    </Link>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                    {s.items.map(p => <PodcastCard key={p.id} podcast={p as any} />)}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Popular guides */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16 section-divider pt-16">
          <div className="mb-6">
            <p className="text-2xs text-crimson font-semibold uppercase tracking-widest mb-1">Guides</p>
            <h2 className="heading-section text-2xl sm:text-3xl">Popular true crime podcast guides</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {POPULAR_GUIDES.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="card-hover p-4 flex items-center text-stone-muted text-sm font-medium hover:text-white transition-colors"
              >
                {link.label}
              </Link>
            ))}
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
              <Link href="/new-true-crime-podcasts" className="text-sm text-stone-muted hover:text-stone transition-colors inline-flex items-center gap-1 mt-1">
                See all new true crime podcasts <ArrowRight size={14} />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {fresh.map((p) => <PodcastCard key={p.id} podcast={p as any} />)}
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

        {/* Related reading — only shown once products placed here are live */}
        {reading.products.length > 0 && (
          <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
            <FurtherReading
              products={reading.products}
              placement="best-podcasts-reading"
              heading="More true crime to read"
              headingAs="h2"
              note={reading.note}
            />
          </section>
        )}

        {/* FAQ */}
        <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
          <h2 className="heading-section text-2xl sm:text-3xl mb-8">Best true crime podcasts: FAQ</h2>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <details key={i} className="card p-5 group" open={i === 0}>
                <summary className="flex items-center justify-between cursor-pointer list-none gap-4">
                  <h3 className="text-stone font-medium text-sm">{faq.q}</h3>
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
