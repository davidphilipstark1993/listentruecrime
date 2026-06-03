import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { PodcastCard } from '@/components/podcasts/podcast-card'
import { COUNTRIES } from '@/lib/types/database'
import { countryFlag } from '@/lib/utils'
import { BASE, breadcrumbSchema } from '@/lib/seo'
import type { Podcast, RatingStats } from '@/lib/types/database'

interface Props {
  params: Promise<{ country: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { country } = await params
  const name = COUNTRIES[country]
  if (!name) return {}
  const title = `Best ${name} True Crime Podcasts`
  const description = `The best true crime podcasts from ${name}, ranked by community ratings. Real cases, expert reviews, and listener ratings.`
  return {
    title,
    description,
    alternates: { canonical: `${BASE}/country/${country}` },
    openGraph: {
      title: `${title} | ListenTrueCrime`,
      description,
      url: `${BASE}/country/${country}`,
    },
  }
}

export default async function CountryPage({ params }: Props) {
  const { country } = await params
  const name = COUNTRIES[country]
  if (!name) notFound()

  const supabase = await createClient()
  const { data } = await supabase
    .from('podcasts')
    .select(`*, rating_stats:podcast_rating_stats(*)`)
    .eq('is_published', true)
    .eq('country', country)
    .order('binge_factor', { ascending: false })
    .limit(48)

  const podcasts = (data ?? []) as (Podcast & { rating_stats: RatingStats | null })[]

  const breadcrumbs = breadcrumbSchema([
    { name: 'Home', url: BASE },
    { name: 'Browse', url: `${BASE}/browse` },
    { name: `${name} Podcasts`, url: `${BASE}/country/${country}` },
  ])

  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `Best ${name} True Crime Podcasts`,
    description: `The best true crime podcasts from ${name}, ranked by community ratings.`,
    url: `${BASE}/country/${country}`,
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
          <span className="text-stone-muted">{name} Podcasts</span>
        </nav>

        <div className="mb-10">
          <div className="text-4xl mb-3">{countryFlag(country)}</div>
          <h1 className="heading-display text-3xl sm:text-4xl mb-2">Best {name} True Crime Podcasts</h1>
          <p className="text-stone-muted text-sm mb-3">
            The best true crime podcasts from {name}, ranked by community binge factor and expert review.
          </p>
          <p className="text-stone-subtle text-xs">{podcasts.length} podcast{podcasts.length !== 1 ? 's' : ''} from {name}</p>
        </div>

        {podcasts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {podcasts.map((p, i) => (
              <PodcastCard key={p.id} podcast={p} priority={i < 6} />
            ))}
          </div>
        ) : (
          <div className="text-center py-24">
            <p className="text-stone-muted text-lg mb-2">No podcasts from {name} yet</p>
            <p className="text-stone-subtle text-sm">We're growing our database every week.</p>
          </div>
        )}

        <div className="mt-16 pt-8 border-t border-white/[0.06]">
          <h2 className="text-sm font-semibold text-stone-subtle uppercase tracking-wide mb-4">Browse by country</h2>
          <div className="flex flex-wrap gap-2">
            {Object.entries(COUNTRIES).filter(([code]) => code !== country).map(([code, countryName]) => (
              <Link key={code} href={`/country/${code}`} className="tag hover:border-white/20 transition-colors text-xs">
                {countryFlag(code)} {countryName}
              </Link>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
