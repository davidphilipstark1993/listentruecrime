import type { Metadata } from 'next'
import { Suspense } from 'react'
import { BrowseClient } from './browse-client'
import { BASE } from '@/lib/seo'
import { getPodcastCount, roundedPodcastCount } from '@/lib/podcast-count'

export async function generateMetadata(): Promise<Metadata> {
  const count = roundedPodcastCount(await getPodcastCount())
  return {
    title: 'Browse True Crime Podcasts',
    description: `Search and filter ${count} true crime podcasts by case type, country, format, platform, and binge factor. Find your perfect podcast with community ratings.`,
    alternates: { canonical: `${BASE}/browse` },
    openGraph: {
      title: 'Browse True Crime Podcasts | ListenTrueCrime',
      description: `Search and filter ${count} true crime podcasts. Filter by murder, cold case, serial killer, fraud, and more.`,
      url: `${BASE}/browse`,
    },
  }
}

export default function BrowsePage() {
  return (
    <Suspense>
      <BrowseClient />
    </Suspense>
  )
}
