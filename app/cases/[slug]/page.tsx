import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, MapPin, Calendar, Headphones, ExternalLink } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { getAllCaseSlugs, getCaseBySlug } from '@/lib/cases'
import { getAllTags } from '@/lib/blog'
import { buildBreadcrumbSchema } from '@/lib/seo/content'
import { getAuthor } from '@/lib/authors'
import { BASE } from '@/lib/seo/config'
import { COUNTRIES } from '@/lib/types/database'
import type { Podcast, RatingStats } from '@/lib/types/database'

interface Props {
  params: Promise<{ slug: string }>
}

type PodcastWithStats = Podcast & { rating_stats: RatingStats | null }

async function getPodcastsForCase(slugs: string[]): Promise<PodcastWithStats[]> {
  if (!slugs.length) return []
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('podcasts')
    .select('*, rating_stats:podcast_rating_stats(*)')
    .in('slug', slugs)
    .eq('is_published', true)
  return (data ?? []) as PodcastWithStats[]
}

export async function generateStaticParams() {
  return getAllCaseSlugs()
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const c = getCaseBySlug(slug)
  if (!c) return {}

  const title = `${c.name} — Podcasts and Overview`
  const description = c.summary[0].slice(0, 160)

  return {
    title,
    description,
    alternates: { canonical: `${BASE}/cases/${slug}` },
    openGraph: {
      title: `${c.name} | ListenTrueCrime`,
      description,
      url: `${BASE}/cases/${slug}`,
      type: 'article',
    },
  }
}

const STATUS_LABEL: Record<string, string> = {
  solved: 'Solved',
  cold: 'Cold Case',
  ongoing: 'Ongoing',
  partial: 'Partially Resolved',
}

const STATUS_COLOUR: Record<string, string> = {
  solved: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  cold: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  ongoing: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  partial: 'text-stone-muted bg-ink-700 border-white/10',
}

export default async function CasePage({ params }: Props) {
  const { slug } = await params
  const c = getCaseBySlug(slug)
  if (!c) notFound()

  const podcastSlugs = c.podcasts.map(p => p.slug)
  const podcastData = await getPodcastsForCase(podcastSlugs)

  // Merge case ordering/notes with DB data
  const podcasts = c.podcasts
    .map(cp => {
      const db = podcastData.find(p => p.slug === cp.slug)
      return db ? { ...db, caseNote: cp.note, bestStart: cp.bestStart } : null
    })
    .filter(Boolean) as (PodcastWithStats & { caseNote?: string; bestStart?: boolean })[]

  const seriesTag = getAllTags().find(t =>
    c.aliases.some(a => a.toLowerCase() === t.name.toLowerCase())
  )

  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: 'Home', url: BASE },
    { name: 'Cases', url: `${BASE}/cases` },
    { name: c.name, url: `${BASE}/cases/${slug}` },
  ])

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `${c.name} — Overview and Podcast Guide`,
    description: c.summary[0],
    url: `${BASE}/cases/${slug}`,
    author: {
      '@type': 'Person',
      name: getAuthor('david-stark').name,
      url: `${BASE}/authors/david-stark`,
    },
    publisher: { '@type': 'Organization', name: 'ListenTrueCrime', url: BASE },
  }

  const faqSchema = c.faqs.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: c.faqs.map(faq => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: { '@type': 'Answer', text: faq.a },
    })),
  } : null

  const itemListSchema = podcasts.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Podcasts covering ${c.name}`,
    numberOfItems: podcasts.length,
    itemListElement: podcasts.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${BASE}/podcasts/${p.slug}`,
      name: p.title,
    })),
  } : null

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      {faqSchema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />}
      {itemListSchema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }} />}

      <Header />
      <main className="min-h-screen bg-ink-950 pt-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-stone-subtle mb-8">
            <Link href="/" className="hover:text-stone transition-colors">Home</Link>
            <span>/</span>
            <Link href="/cases" className="hover:text-stone transition-colors">Cases</Link>
            <span>/</span>
            <span className="text-stone-muted truncate max-w-[200px]">{c.name}</span>
          </nav>

          {/* Header */}
          <header className="mb-10">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${STATUS_COLOUR[c.status]}`}>
                {STATUS_LABEL[c.status]}
              </span>
              <span className="flex items-center gap-1 text-xs text-stone-subtle">
                <Calendar size={12} /> {c.year}
              </span>
              <span className="flex items-center gap-1 text-xs text-stone-subtle">
                <MapPin size={12} /> {c.location}
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-stone mb-4 leading-tight">
              {c.name}
            </h1>
          </header>

          <div className="grid lg:grid-cols-[1fr_300px] gap-10">
            {/* Main content */}
            <div className="space-y-8">
              {/* Summary */}
              <section>
                <div className="prose prose-invert prose-sm max-w-none
                  prose-p:text-stone-muted prose-p:leading-relaxed prose-p:my-3">
                  {c.summary.map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>
              </section>

              {/* Podcasts covering this case */}
              {podcasts.length > 0 && (
                <section>
                  <h2 className="font-serif text-xl text-stone mb-5">
                    Podcasts covering this case
                  </h2>
                  <div className="space-y-4">
                    {podcasts.map(p => (
                      <div key={p.slug} className={`card p-5 ${p.bestStart ? 'border-crimson/25 bg-crimson/5' : ''}`}>
                        {p.bestStart && (
                          <div className="text-2xs font-semibold uppercase tracking-widest text-crimson mb-3">
                            Best place to start
                          </div>
                        )}
                        <div className="flex gap-4">
                          <div className="w-14 h-14 rounded-lg overflow-hidden bg-ink-700 shrink-0">
                            {p.image_url ? (
                              <Image src={p.image_url} alt={p.title} width={56} height={56} className="object-cover w-full h-full" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Headphones size={20} className="text-ink-500" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <Link
                                  href={`/podcasts/${p.slug}`}
                                  className="font-serif text-base font-semibold text-stone hover:text-crimson transition-colors"
                                >
                                  {p.title}
                                </Link>
                                {p.binge_factor && (
                                  <span className="ml-2 text-xs text-stone-subtle">
                                    {p.binge_factor}/10
                                  </span>
                                )}
                              </div>
                              {p.quick_verdict && (
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${
                                  p.quick_verdict === 'Must listen'
                                    ? 'bg-crimson/15 text-crimson border border-crimson/20'
                                    : 'bg-ink-700 text-stone-muted'
                                }`}>
                                  {p.quick_verdict}
                                </span>
                              )}
                            </div>
                            {p.caseNote && (
                              <p className="text-stone-subtle text-xs mt-1">{p.caseNote}</p>
                            )}
                            {p.short_description && (
                              <p className="text-stone-muted text-sm mt-2 leading-relaxed line-clamp-2">
                                {p.short_description}
                              </p>
                            )}
                            <Link
                              href={`/podcasts/${p.slug}`}
                              className="inline-flex items-center gap-1 text-xs text-crimson hover:underline mt-2"
                            >
                              Read our review <ArrowRight size={11} />
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* FAQs */}
              {c.faqs.length > 0 && (
                <section>
                  <h2 className="font-serif text-xl text-stone mb-5">
                    Frequently asked questions
                  </h2>
                  <div className="space-y-3">
                    {c.faqs.map((faq, i) => (
                      <details key={i} className="card p-5 group">
                        <summary className="flex items-center justify-between cursor-pointer list-none gap-4">
                          <span className="text-stone font-medium text-sm">{faq.q}</span>
                          <ArrowRight size={14} className="text-stone-subtle shrink-0 group-open:rotate-90 transition-transform" />
                        </summary>
                        <p className="text-stone-muted text-sm leading-relaxed mt-3 pt-3 border-t border-white/[0.06]">
                          {faq.a}
                        </p>
                      </details>
                    ))}
                  </div>
                </section>
              )}
            </div>

            {/* Sidebar */}
            <aside className="space-y-5">
              <div className="card p-5">
                <h3 className="font-serif text-sm text-stone mb-4 uppercase tracking-wide">Case details</h3>
                <dl className="space-y-3">
                  {[
                    { label: 'Year', value: String(c.year) },
                    { label: 'Location', value: c.location },
                    { label: 'Country', value: COUNTRIES[c.country] ?? c.country },
                    { label: 'Status', value: STATUS_LABEL[c.status] },
                    { label: 'Podcasts', value: `${podcasts.length} reviewed` },
                  ].map(item => (
                    <div key={item.label} className="flex justify-between gap-3">
                      <dt className="text-stone-subtle text-xs">{item.label}</dt>
                      <dd className="text-stone text-xs text-right">{item.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              {podcasts.length > 0 && (
                <div className="card p-5">
                  <h3 className="font-serif text-sm text-stone mb-3 uppercase tracking-wide">Quick links</h3>
                  <ul className="space-y-2">
                    {podcasts.map(p => (
                      <li key={p.slug}>
                        <Link
                          href={`/podcasts/${p.slug}`}
                          className="flex items-center gap-2 text-stone-muted hover:text-stone text-xs transition-colors"
                        >
                          <ArrowRight size={11} className="text-crimson shrink-0" />
                          {p.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {seriesTag && (
                <div className="card p-5 border-crimson/25 bg-crimson/5">
                  <h3 className="font-serif text-sm text-stone mb-3 uppercase tracking-wide">Blog series</h3>
                  <p className="text-stone-muted text-xs mb-3 leading-relaxed">
                    {seriesTag.count} in-depth articles on this case, from the original investigation to the latest developments.
                  </p>
                  <Link
                    href={`/blog/tag/${seriesTag.slug}`}
                    className="inline-flex items-center gap-1 text-xs text-crimson hover:underline font-medium"
                  >
                    Read the full series <ArrowRight size={11} />
                  </Link>
                </div>
              )}

              <div className="card p-5">
                <h3 className="font-serif text-sm text-stone mb-3 uppercase tracking-wide">Browse more</h3>
                <ul className="space-y-2">
                  <li>
                    <Link href="/cases" className="flex items-center gap-2 text-stone-muted hover:text-stone text-xs transition-colors">
                      <ArrowRight size={11} className="text-crimson shrink-0" />
                      All true crime cases
                    </Link>
                  </li>
                  <li>
                    <Link href="/browse" className="flex items-center gap-2 text-stone-muted hover:text-stone text-xs transition-colors">
                      <ArrowRight size={11} className="text-crimson shrink-0" />
                      Browse all podcasts
                    </Link>
                  </li>
                  <li>
                    <Link href="/best-true-crime-podcasts" className="flex items-center gap-2 text-stone-muted hover:text-stone text-xs transition-colors">
                      <ArrowRight size={11} className="text-crimson shrink-0" />
                      Best true crime podcasts
                    </Link>
                  </li>
                </ul>
              </div>
            </aside>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
