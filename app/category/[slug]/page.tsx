export const revalidate = 3600

import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { supabasePublic } from '@/lib/supabase/public'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { PodcastCard } from '@/components/podcasts/podcast-card'
import { CATEGORIES, CATEGORY_TO_CASE_TYPES } from '@/lib/types/database'
import { BASE, breadcrumbSchema } from '@/lib/seo'
import type { Podcast, RatingStats } from '@/lib/types/database'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const cat = CATEGORIES.find(c => c.slug === slug)
  if (!cat) return {}
  const title = `Best ${cat.label} True Crime Podcasts`
  const description = `Discover the best ${cat.label.toLowerCase()} true crime podcasts, ranked by community ratings. ${cat.description}`
  return {
    title,
    description,
    alternates: { canonical: `${BASE}/category/${slug}` },
    openGraph: {
      title: `${title} | ListenTrueCrime`,
      description,
      url: `${BASE}/category/${slug}`,
    },
  }
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params
  const cat = CATEGORIES.find(c => c.slug === slug)
  if (!cat) notFound()

  const caseTypes = CATEGORY_TO_CASE_TYPES[slug] ?? []

  let q = supabasePublic
    .from('podcasts')
    .select(`*, rating_stats:podcast_rating_stats(*)`)
    .eq('is_published', true)

  if (slug === 'uk-crime') {
    q = q.eq('country', 'UK')
  } else if (slug === 'australian-crime') {
    q = q.eq('country', 'AU')
  } else if (slug === 'binge-worthy') {
    q = q.gte('binge_factor', 8)
  } else if (caseTypes.length > 0) {
    q = q.overlaps('case_types', caseTypes)
  }

  const { data } = await q.order('binge_factor', { ascending: false }).limit(48)
  const podcasts = (data ?? []) as (Podcast & { rating_stats: RatingStats | null })[]

  const breadcrumbs = breadcrumbSchema([
    { name: 'Home', url: BASE },
    { name: 'Browse', url: `${BASE}/browse` },
    { name: cat.label, url: `${BASE}/category/${slug}` },
  ])

  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `Best ${cat.label} True Crime Podcasts`,
    description: cat.description,
    url: `${BASE}/category/${slug}`,
    numberOfItems: podcasts.length,
    publisher: { '@type': 'Organization', name: 'ListenTrueCrime', url: BASE },
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }} />

      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 min-h-screen">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-stone-subtle mb-8">
          <Link href="/" className="hover:text-stone transition-colors">Home</Link>
          <ChevronRight size={12} />
          <Link href="/browse" className="hover:text-stone transition-colors">Browse</Link>
          <ChevronRight size={12} />
          <span className="text-stone-muted">{cat.label}</span>
        </nav>

        <div className="mb-10">
          <div className="text-4xl mb-3">{cat.emoji}</div>
          <h1 className="heading-display text-3xl sm:text-4xl mb-2">Best {cat.label} Podcasts</h1>
          <p className="text-stone-muted text-sm max-w-xl mb-3">{cat.description}</p>
          <p className="text-stone-subtle text-xs">{podcasts.length} podcast{podcasts.length !== 1 ? 's' : ''} — ranked by binge factor</p>
        </div>

        {podcasts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {podcasts.map((p, i) => (
              <PodcastCard key={p.id} podcast={p} priority={i < 6} />
            ))}
          </div>
        ) : (
          <div className="text-center py-24">
            <p className="text-stone-muted text-lg mb-2">No podcasts yet in this category</p>
            <p className="text-stone-subtle text-sm">Check back soon — we're adding more every week.</p>
          </div>
        )}

        {/* Internal links to related categories */}
        <div className="mt-16 pt-8 border-t border-white/[0.06]">
          <h2 className="text-sm font-semibold text-stone-subtle uppercase tracking-wide mb-4">Explore other categories</h2>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.filter(c => c.slug !== slug).map(c => (
              <Link key={c.slug} href={`/category/${c.slug}`} className="tag hover:border-white/20 transition-colors text-xs">
                {c.emoji} {c.label}
              </Link>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}

export async function generateStaticParams() {
  return CATEGORIES.map(c => ({ slug: c.slug }))
}
