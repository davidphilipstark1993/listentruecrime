import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Fragment, type ReactNode } from 'react'
import { ArrowRight, ChevronDown, ChevronUp } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { PodcastCard } from '@/components/podcasts/podcast-card'
import { NewsletterForm } from '@/components/newsletter/newsletter-form'
import { COUNTRIES } from '@/lib/types/database'
import { COUNTRY_SEO, buildFAQSchema, buildBreadcrumbSchema, buildItemListSchema } from '@/lib/seo/content'
import { getListingCounts, MIN_INDEXABLE_COUNTRY_PODCASTS } from '@/lib/seo/indexability'
import { BASE, ogDefaults } from '@/lib/seo/config'
import { countryFlag } from '@/lib/utils'
import type { Podcast, RatingStats } from '@/lib/types/database'

interface Props {
  params: Promise<{ country: string }>
}

export const revalidate = 3600

/** Fills "{count}" in country copy with the live published-podcast count. */
const withCount = (text: string, count: number) => text.replaceAll('{count}', String(count))

/** Renders `text` with each listed phrase turned into an internal link. Text itself is unchanged. */
function LinkedText({ text, links }: { text: string; links?: { text: string; href: string }[] }): ReactNode {
  if (!links?.length) return text
  const parts: ReactNode[] = []
  let rest = text
  let key = 0
  while (rest) {
    const hit = links
      .map(l => ({ l, i: rest.indexOf(l.text) }))
      .filter(h => h.i >= 0)
      .sort((a, b) => a.i - b.i)[0]
    if (!hit) { parts.push(<Fragment key={key++}>{rest}</Fragment>); break }
    if (hit.i > 0) parts.push(<Fragment key={key++}>{rest.slice(0, hit.i)}</Fragment>)
    parts.push(<Link key={key++} href={hit.l.href} className="text-crimson underline hover:text-stone">{hit.l.text}</Link>)
    rest = rest.slice(hit.i + hit.l.text.length)
  }
  return <>{parts}</>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { country } = await params
  const name = COUNTRIES[country]
  if (!name) return {}

  const seo = COUNTRY_SEO[country]
  const h1 = seo?.h1 ?? `Best ${name} True Crime Podcasts`
  const year = new Date().getFullYear()
  const listingCounts = await getListingCounts()
  const rawDescription = seo?.metaDescription ?? `The best true crime podcasts from ${name}, expertly reviewed and community-rated.`
  const description = withCount(rawDescription, listingCounts.countries[country] ?? 0)
  const title = seo?.title ?? `${h1} (${year})`

  return {
    title,
    description,
    openGraph: {
      title: `${title} | ListenTrueCrime`,
      description,
      url: `${BASE}/country/${country}`,
      ...ogDefaults(title),
    },
    alternates: { canonical: `${BASE}/country/${country}` },
    ...(listingCounts.countries[country] ?? 0) < MIN_INDEXABLE_COUNTRY_PODCASTS && {
      robots: { index: false, follow: true },
    },
  }
}

export default async function CountryPage({ params }: Props) {
  const { country } = await params
  const name = COUNTRIES[country]
  if (!name) notFound()

  const seo = COUNTRY_SEO[country]
  const h1 = seo?.h1 ?? `Best ${name} True Crime Podcasts`
  const year = new Date().getFullYear()

  const supabase = createAdminClient()
  const { data, count } = await supabase
    .from('podcasts')
    .select(`*, rating_stats:podcast_rating_stats(*)`, { count: 'exact' })
    .eq('is_published', true)
    .eq('country', country)
    .order('binge_factor', { ascending: false })
    // Curated "Top" slice, not the full catalogue — /browse covers the rest.
    // `count: 'exact'` above still returns the true total for the copy below.
    .limit(24)

  const podcasts = (data ?? []) as (Podcast & { rating_stats: RatingStats | null })[]
  const totalCount = count ?? podcasts.length

  // Must-listen shelf: read from the data (country + current editorial verdict), never hard-coded.
  let picks: (Podcast & { rating_stats: RatingStats | null })[] = []
  if (seo?.picksHeading) {
    const { data: pickRows } = await supabase
      .from('podcasts')
      .select(`*, rating_stats:podcast_rating_stats(*)`)
      .eq('is_published', true)
      .eq('country', country)
      .eq('quick_verdict', 'Must listen')
      .order('binge_factor', { ascending: false })
      .order('id', { ascending: true })
      .limit(12)
    picks = (pickRows ?? []) as typeof picks
  }

  const faqSchema = seo?.faqs ? buildFAQSchema(seo.faqs) : null
  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: 'Home', url: BASE },
    { name: 'Browse', url: `${BASE}/browse` },
    { name: h1, url: `${BASE}/country/${country}` },
  ])
  const itemListSchema = podcasts.length > 0 ? buildItemListSchema(
    h1,
    seo?.intro[0] ? withCount(seo.intro[0], totalCount) : `Best true crime podcasts from ${name}`,
    podcasts.slice(0, 20).map(p => ({ name: p.title, url: `${BASE}/podcasts/${p.slug}` }))
  ) : null

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      {faqSchema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />}
      {itemListSchema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }} />}

      <Header />

      <main id="main-content" className="min-h-screen pb-16">
        {/* ── Hero ── */}
        <section className="relative overflow-hidden bg-ink-950 pt-24 pb-12 px-4">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_-10%,rgba(190,18,60,0.08),transparent)]" />
          <div className="relative max-w-4xl mx-auto">
            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-stone-subtle mb-6">
              <Link href="/" className="hover:text-stone transition-colors">Home</Link>
              <span>/</span>
              <Link href="/browse" className="hover:text-stone transition-colors">Browse</Link>
              <span>/</span>
              <span className="text-stone-muted">{h1}</span>
            </nav>

            <div className="text-4xl mb-4">{countryFlag(country)}</div>
            <h1 className="heading-display text-3xl sm:text-4xl lg:text-5xl mb-4">
              {h1}{!seo?.title && <> <span className="text-stone-subtle text-2xl font-sans font-normal">({year})</span></>}
            </h1>

            {seo?.intro ? (
              <div className="space-y-3 max-w-2xl">
                {seo.intro.map((para, i) => (
                  <p key={i} className="text-stone-muted text-sm sm:text-base leading-relaxed">
                    <LinkedText text={withCount(para, totalCount)} links={seo.introLinks} />
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-stone-muted text-sm">
                {totalCount} podcast{totalCount !== 1 ? 's' : ''} from {name} in our database — expert-reviewed and community-rated.
              </p>
            )}

            <p className="text-stone-subtle text-sm mt-4">
              {totalCount} podcast{totalCount !== 1 ? 's' : ''} from {name}
            </p>
          </div>
        </section>

        {/* ── Must-listen picks (data-driven; omitted when none) ── */}
        {seo?.picksHeading && picks.length > 0 && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12">
            <h2 className="heading-section text-xl mb-6">{seo.picksHeading}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {picks.map(p => (
                <PodcastCard key={p.id} podcast={p} />
              ))}
            </div>
          </section>
        )}

        {/* ── How to choose ── */}
        {seo?.howToChoose && (
          <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-12">
            <h2 className="heading-section text-xl mb-4">{seo.howToChoose.heading}</h2>
            <ul className="space-y-3 text-sm text-stone-muted leading-relaxed list-disc pl-5">
              {seo.howToChoose.items.map(item => (
                <li key={item.lead}><strong className="text-stone font-medium">{item.lead}</strong> {item.text}</li>
              ))}
            </ul>
          </section>
        )}

        {/* ── Podcast grid ── */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {podcasts.length > 0 ? (
            <>
              <div className="flex items-center justify-between mb-6">
                <h2 className="heading-section text-xl">Top {name} True Crime Podcasts</h2>
                {/* UK page: /browse?country=UK is a supported server-side filter, so "Browse all" stays in the country. */}
                <Link href={seo?.picksHeading ? `/browse?country=${country}` : '/browse'} className="text-sm text-stone-muted hover:text-stone transition-colors flex items-center gap-1">
                  {seo?.picksHeading ? `Browse all ${country} podcasts` : 'Browse all'} <ArrowRight size={14} />
                </Link>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {podcasts.map((p, i) => (
                  <PodcastCard key={p.id} podcast={p} priority={i < 6} />
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-24">
              <p className="text-stone-muted text-lg mb-2">No podcasts from {name} yet</p>
              <p className="text-stone-subtle text-sm">We're growing our database every week.</p>
            </div>
          )}
        </section>

        {/* ── Newsletter CTA ── */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="relative overflow-hidden rounded-2xl bg-ink-800 border border-white/[0.06] p-8">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(190,18,60,0.1),transparent_60%)]" />
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-6">
              <div className="flex-1">
                <p className="text-2xs text-crimson font-semibold uppercase tracking-widest mb-2">Newsletter</p>
                <h2 className="heading-section text-xl mb-1">Get the best {name} picks weekly</h2>
                <p className="text-stone-muted text-sm">New reviews, hidden gems, and community favourites. No filler.</p>
              </div>
              <div className="sm:w-72">
                <NewsletterForm source={`country_${country}`} variant="minimal" />
              </div>
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        {seo?.faqs && (
          <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <h2 className="heading-section text-2xl mb-8">Frequently Asked Questions</h2>
            <div className="space-y-4">
              {seo.faqs.map((faq, i) => (
                <details key={i} className="card p-5 group">
                  <summary className="flex items-center justify-between cursor-pointer list-none gap-4">
                    <span className="text-stone font-medium text-sm">{faq.q}</span>
                    <ChevronDown size={16} className="text-stone-subtle shrink-0 group-open:hidden" />
                    <ChevronUp size={16} className="text-stone-subtle shrink-0 hidden group-open:block" />
                  </summary>
                  <p className="text-stone-muted text-sm leading-relaxed mt-3 pt-3 border-t border-white/[0.06]">
                    <LinkedText text={faq.a} links={faq.links} />
                  </p>
                </details>
              ))}
            </div>
          </section>
        )}

        {/* ── Related countries ── */}
        {seo?.relatedLinks && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 section-divider">
            <h2 className="heading-section text-xl mb-6">Explore other regions</h2>
            <div className="flex flex-wrap gap-3">
              {seo.relatedLinks.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-ink-800 border border-white/[0.08] text-stone-muted hover:text-stone hover:border-white/20 text-sm transition-colors"
                >
                  {link.label} <ArrowRight size={13} />
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      <Footer />
    </>
  )
}

export async function generateStaticParams() {
  return Object.keys(COUNTRIES).map(code => ({ country: code }))
}
