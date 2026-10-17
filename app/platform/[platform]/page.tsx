import { notFound, permanentRedirect } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { PodcastCard } from '@/components/podcasts/podcast-card'
import { NewsletterForm } from '@/components/newsletter/newsletter-form'
import { PLATFORMS, platformFromSlug, platformHref, platformSlug } from '@/lib/types/database'
import { PLATFORM_SEO, buildFAQSchema, buildBreadcrumbSchema, buildItemListSchema } from '@/lib/seo/content'
import { BASE } from '@/lib/seo/config'
import { HubIntro } from '@/components/seo/hub-intro'
import { FaqList } from '@/components/seo/faq-list'
import { buildHubContent, mergeFaqs, type HubShow } from '@/lib/seo/hub-content'
import type { Podcast, RatingStats } from '@/lib/types/database'

interface Props {
  params: Promise<{ platform: string }>
}

export const revalidate = 3600

// Resolves a route param — the lowercase slug ("bbc-sounds", "spotify") or a
// legacy mixed-case / space-encoded name ("BBC%20Sounds", "Spotify") — to the
// platform's display name. Legacy forms are 301'd to the slug by middleware.ts.
function resolvePlatform(param: string): string | null {
  return platformFromSlug(decodeURIComponent(param))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { platform } = await params
  const name = resolvePlatform(platform)
  if (!name) return {}

  const seo = PLATFORM_SEO[name]
  const h1 = seo?.h1 ?? `Best True Crime Podcasts on ${name}`
  const year = new Date().getFullYear()
  const description = seo?.metaDescription ?? `Best true crime podcasts available on ${name}, reviewed and rated by the community.`
  const canonical = `${BASE}${platformHref(name)}`

  return {
    title: `${h1} (${year})`,
    description,
    openGraph: {
      title: `${h1} (${year}) | ListenTrueCrime`,
      description,
      url: canonical,
    },
    alternates: { canonical },
  }
}

export default async function PlatformPage({ params }: Props) {
  const { platform } = await params
  const name = resolvePlatform(platform)

  if (!name) notFound()

  // Backstop for the middleware 301: any non-canonical form of the URL goes
  // to the lowercase slug.
  if (platform !== platformSlug(name)) {
    permanentRedirect(platformHref(name))
  }

  const seo = PLATFORM_SEO[name]
  const h1 = seo?.h1 ?? `Best True Crime Podcasts on ${name}`
  const year = new Date().getFullYear()

  const supabase = createAdminClient()
  const [{ data, count }, { data: hubRows }] = await Promise.all([
    supabase
      .from('podcasts')
      .select(`*, rating_stats:podcast_rating_stats(*)`, { count: 'exact' })
      .eq('is_published', true)
      .contains('platforms', [name])
      .order('binge_factor', { ascending: false })
      // Curated "Top" slice, not the full catalogue — /browse covers the rest.
      // `count: 'exact'` above still returns the true total for the copy below.
      .limit(24),
    // Lightweight full list feeding the generated intro/FAQ facts
    supabase.from('podcasts').select('title, slug, binge_factor, case_types, country, platforms, format_type, episode_length').eq('is_published', true).contains('platforms', [name]),
  ])

  const podcasts = (data ?? []) as (Podcast & { rating_stats: RatingStats | null })[]
  const totalCount = count ?? podcasts.length
  const hub = buildHubContent({ kind: 'platform', key: name, shows: (hubRows ?? []) as HubShow[] })

  const faqs = mergeFaqs(hub?.faqs ?? [], seo?.faqs ?? [])
  const faqSchema = faqs.length > 0 ? buildFAQSchema(faqs) : null
  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: 'Home', url: BASE },
    { name: 'Browse', url: `${BASE}/browse` },
    { name: h1, url: `${BASE}${platformHref(name)}` },
  ])
  const itemListSchema = podcasts.length > 0 ? buildItemListSchema(
    h1,
    seo?.intro[0] ?? `Best true crime podcasts on ${name}`,
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

            <div className="text-4xl mb-4">🎧</div>
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
              <p className="text-stone-muted text-sm">
                {totalCount} podcast{totalCount !== 1 ? 's' : ''} available on {name} — expert-reviewed and community-rated.
              </p>
            )}

            <p className="text-stone-subtle text-sm mt-4">
              {totalCount} podcast{totalCount !== 1 ? 's' : ''} available on {name}
            </p>
          </div>
        </section>

        {/* ── Podcast grid ── */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {podcasts.length > 0 ? (
            <>
              <div className="flex items-center justify-between mb-6">
                <h2 className="heading-section text-xl">Top True Crime Podcasts on {name}</h2>
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
              <p className="text-stone-muted text-lg mb-2">No podcasts on {name} yet</p>
              <Link href="/browse" className="btn-ghost mt-4 inline-flex">Browse all podcasts</Link>
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
                <h2 className="heading-section text-xl mb-1">Get the best picks weekly</h2>
                <p className="text-stone-muted text-sm">New reviews, hidden gems, and community favourites — delivered every week.</p>
              </div>
              <div className="sm:w-72">
                <NewsletterForm source={`platform_${name.toLowerCase().replace(/\s+/g, '_')}`} variant="minimal" />
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

        {/* ── Related platforms ── */}
        {seo?.relatedLinks && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 section-divider">
            <h2 className="heading-section text-xl mb-6">Other platforms</h2>
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
  return PLATFORMS.map(p => ({ platform: platformSlug(p) }))
}
