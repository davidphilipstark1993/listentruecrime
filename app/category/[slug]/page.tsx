import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { PodcastCard } from '@/components/podcasts/podcast-card'
import { NewsletterForm } from '@/components/newsletter/newsletter-form'
import { NewsletterLeadMagnet } from '@/components/newsletter/newsletter-lead-magnet'
import { CATEGORIES, CATEGORY_TO_CASE_TYPES } from '@/lib/types/database'
import { CATEGORY_SEO, buildFAQSchema, buildBreadcrumbSchema, buildItemListSchema } from '@/lib/seo/content'
import { BASE } from '@/lib/seo/config'
import { HubIntro } from '@/components/seo/hub-intro'
import { FaqList } from '@/components/seo/faq-list'
import { buildHubContent, mergeFaqs, type HubShow } from '@/lib/seo/hub-content'
import type { Podcast, RatingStats } from '@/lib/types/database'

interface Props {
  params: Promise<{ slug: string }>
}

export const revalidate = 3600

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const cat = CATEGORIES.find(c => c.slug === slug)
  if (!cat) return {}

  const seo = CATEGORY_SEO[slug]
  const h1 = seo?.h1 ?? `Best ${cat.label} Podcasts`
  const year = new Date().getFullYear()

  // For geography-overlap categories, differentiate from country pages explicitly
  const geoNote: Record<string, string> = {
    'uk-crime': ' Editorial picks for quality — for the full list by country see /country/uk.',
    'australian-crime': ' Editorial picks for quality — for the full list by country see /country/au.',
  }
  const descriptionSuffix = geoNote[slug] ?? ' Expert-reviewed and community-rated.'
  const baseDescription = seo?.intro[0] ?? `Discover the best ${cat.label.toLowerCase()} true crime podcasts. ${cat.description}`

  return {
    title: `${h1} (${year})`,
    description: (baseDescription + descriptionSuffix).slice(0, 160),
    openGraph: {
      title: `${h1} (${year}) | ListenTrueCrime`,
      description: baseDescription.slice(0, 160),
      url: `${BASE}/category/${slug}`,
    },
    alternates: { canonical: `${BASE}/category/${slug}` },
  }
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params
  const cat = CATEGORIES.find(c => c.slug === slug)
  if (!cat) notFound()

  const seo = CATEGORY_SEO[slug]
  const caseTypes = CATEGORY_TO_CASE_TYPES[slug] ?? []
  const year = new Date().getFullYear()

  const supabase = createAdminClient()
  // Same filter for the card grid and the lightweight full-category fetch
  // that feeds the generated intro/FAQ facts.
  const filterCategory = <Q extends { eq: any; gte: any; overlaps: any }>(query: Q): Q => {
    if (slug === 'uk-crime') return query.eq('country', 'UK')
    if (slug === 'australian-crime') return query.eq('country', 'AU')
    if (slug === 'binge-worthy') return query.gte('binge_factor', 8)
    if (caseTypes.length > 0) return query.overlaps('case_types', caseTypes)
    return query
  }

  // Curated "Top" slice, not the full catalogue — the page already links to
  // /browse for the rest, so trimming this keeps the page's HTML weight down
  // (was rendering all 48 at once with no pagination). `count: 'exact'` above
  // still returns the true total for the copy below.
  const [{ data, count }, { data: hubRows }] = await Promise.all([
    filterCategory(
      supabase.from('podcasts').select(`*, rating_stats:podcast_rating_stats(*)`, { count: 'exact' }).eq('is_published', true)
    ).order('binge_factor', { ascending: false }).limit(24),
    filterCategory(
      supabase.from('podcasts').select('title, slug, binge_factor, case_types, country, platforms, format_type, episode_length').eq('is_published', true)
    ),
  ])
  const podcasts = (data ?? []) as (Podcast & { rating_stats: RatingStats | null })[]
  const totalCount = count ?? podcasts.length
  const hub = buildHubContent({ kind: 'category', key: slug, shows: (hubRows ?? []) as HubShow[] })

  const h1 = seo?.h1 ?? `Best ${cat.label} Podcasts`

  const faqs = mergeFaqs(hub?.faqs ?? [], seo?.faqs ?? [])
  const faqSchema = faqs.length > 0 ? buildFAQSchema(faqs) : null
  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: 'Home', url: BASE },
    { name: 'Browse', url: `${BASE}/browse` },
    { name: h1, url: `${BASE}/category/${slug}` },
  ])
  const itemListSchema = podcasts.length > 0 ? buildItemListSchema(
    h1,
    seo?.intro[0] ?? cat.description,
    podcasts.map(p => ({ name: p.title, url: `${BASE}/podcasts/${p.slug}` }))
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

            <div className="text-4xl mb-4">{cat.emoji}</div>
            <h1 className="heading-display text-3xl sm:text-4xl lg:text-5xl mb-4">
              {h1} <span className="text-stone-subtle text-2xl font-sans font-normal">({year})</span>
            </h1>

            {hub ? (
              <HubIntro paragraphs={hub.intro} />
            ) : seo?.intro ? (
              <div className="space-y-3 max-w-2xl">
                {seo.intro.map((para, i) => (
                  <p key={i} className="text-stone-muted text-sm sm:text-base leading-relaxed">{para}</p>
                ))}
              </div>
            ) : (
              <p className="text-stone-muted text-sm max-w-xl">{cat.description}</p>
            )}

            <p className="text-stone-subtle text-sm mt-4">
              {totalCount} podcast{totalCount !== 1 ? 's' : ''} — expert-reviewed and community-rated
            </p>

            {/* Differentiation notice for geography-overlap categories */}
            {(slug === 'uk-crime' || slug === 'australian-crime') && (
              <div className="mt-5 inline-flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-ink-800 border border-white/[0.08] text-stone-muted text-xs">
                <span>
                  This is our <strong className="text-stone">editorial picks</strong> list — curated for quality and binge factor.
                </span>
                <Link
                  href={slug === 'uk-crime' ? '/country/uk' : '/country/au'}
                  className="text-crimson hover:underline shrink-0"
                >
                  See all {slug === 'uk-crime' ? 'UK' : 'Australian'} podcasts →
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* ── Podcast grid ── */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {podcasts.length > 0 ? (
            <>
              <div className="flex items-center justify-between mb-6">
                <h2 className="heading-section text-xl">
                  Top {h1}
                </h2>
                <Link href="/browse" className="text-sm text-stone-muted hover:text-stone transition-colors flex items-center gap-1">
                  Browse all <ArrowRight size={14} />
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
              <p className="text-stone-muted text-lg mb-2">No podcasts yet in this category</p>
              <p className="text-stone-subtle text-sm">Check back soon — we're adding more every week.</p>
            </div>
          )}
        </section>

        {/* ── Longer write-up (kept from the original hub copy) ── */}
        {hub && seo?.intro && (
          <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <h2 className="heading-section text-xl mb-4">About these podcasts</h2>
            <div className="space-y-3">
              {seo.intro.map((para, i) => (
                <p key={i} className="text-stone-muted text-sm leading-relaxed">{para}</p>
              ))}
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
                <h2 className="heading-section text-xl mb-1">Get the best {cat.label} picks weekly</h2>
                <p className="text-stone-muted text-sm">New reviews, hidden gems, and community favourites. No filler.</p>
              </div>
              <div className="sm:w-72">
                <NewsletterForm source={`category_${slug}`} variant="minimal" />
              </div>
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        {faqs.length > 0 && (
          <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <h2 className="heading-section text-2xl mb-8">Frequently Asked Questions</h2>
            <FaqList items={faqs} />
          </section>
        )}

        {/* ── Lead magnet ── */}
        <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
          <NewsletterLeadMagnet variant="banner" source={`category_lead_${slug}`} />
        </section>

        {/* ── Related categories ── */}
        {seo?.relatedLinks && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 section-divider">
            <h2 className="heading-section text-xl mb-6">Explore more categories</h2>
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
  return CATEGORIES.map(c => ({ slug: c.slug }))
}
