export const revalidate = 3600

import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { supabasePublic } from '@/lib/supabase/public'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { PodcastCard } from '@/components/podcasts/podcast-card'
import { PLATFORMS } from '@/lib/types/database'
import { BASE, breadcrumbSchema } from '@/lib/seo'
import type { Podcast, RatingStats } from '@/lib/types/database'

interface Props {
  params: Promise<{ platform: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { platform } = await params
  const name = decodeURIComponent(platform)
  const title = `Best True Crime Podcasts on ${name}`
  const description = `The best true crime podcasts available on ${name}, reviewed and rated by our community. Find what to listen to next.`
  return {
    title,
    description,
    alternates: { canonical: `${BASE}/platform/${platform}` },
    openGraph: {
      title: `${title} | ListenTrueCrime`,
      description,
      url: `${BASE}/platform/${platform}`,
    },
  }
}

export default async function PlatformPage({ params }: Props) {
  const { platform } = await params
  const name = decodeURIComponent(platform)

  if (!PLATFORMS.includes(name)) notFound()

  const { data } = await supabasePublic
    .from('podcasts')
    .select(`*, rating_stats:podcast_rating_stats(*)`)
    .eq('is_published', true)
    .contains('platforms', [name])
    .order('binge_factor', { ascending: false })
    .limit(48)

  const podcasts = (data ?? []) as (Podcast & { rating_stats: RatingStats | null })[]

  const breadcrumbs = breadcrumbSchema([
    { name: 'Home', url: BASE },
    { name: 'Browse', url: `${BASE}/browse` },
    { name: `${name} Podcasts`, url: `${BASE}/platform/${platform}` },
  ])

  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `Best True Crime Podcasts on ${name}`,
    description: `True crime podcasts available on ${name}, ranked by community ratings.`,
    url: `${BASE}/platform/${platform}`,
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
          <span className="text-stone-muted">{name}</span>
        </nav>

        <div className="mb-10">
          <h1 className="heading-display text-3xl sm:text-4xl mb-2">Best True Crime Podcasts on {name}</h1>
          <p className="text-stone-muted text-sm mb-3">
            Community-rated true crime podcasts available on {name}, ranked by binge factor.
          </p>
          <p className="text-stone-subtle text-xs">{podcasts.length} podcast{podcasts.length !== 1 ? 's' : ''} available on {name}</p>
        </div>

        {podcasts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {podcasts.map((p, i) => (
              <PodcastCard key={p.id} podcast={p} priority={i < 6} />
            ))}
          </div>
        ) : (
          <div className="text-center py-24">
            <p className="text-stone-muted text-lg mb-2">No podcasts on {name} yet</p>
            <Link href="/browse" className="btn-ghost mt-4 inline-flex">Browse all podcasts</Link>
          </div>
        )}

        <div className="mt-16 pt-8 border-t border-white/[0.06]">
          <h2 className="text-sm font-semibold text-stone-subtle uppercase tracking-wide mb-4">Browse by platform</h2>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.filter(p => p !== name).map(p => (
              <Link key={p} href={`/platform/${encodeURIComponent(p)}`} className="tag hover:border-white/20 transition-colors text-xs">
                {p}
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
  return PLATFORMS.map(p => ({ platform: encodeURIComponent(p) }))
}
