import type { Metadata } from 'next'
import { Suspense } from 'react'
import { BrowseClient } from './browse-client'
import { BASE } from '@/lib/seo'

export const metadata: Metadata = {
  title: 'Browse True Crime Podcasts',
  description: 'Search and filter 100+ true crime podcasts by case type, country, format, platform, and binge factor. Find your perfect podcast with community ratings.',
  alternates: { canonical: `${BASE}/browse` },
  openGraph: {
    title: 'Browse True Crime Podcasts | ListenTrueCrime',
    description: 'Search and filter 100+ true crime podcasts. Filter by murder, cold case, serial killer, fraud, and more.',
    url: `${BASE}/browse`,
  },
}

export default function BrowsePage() {
  return (
    <Suspense>
      <BrowseClient />
    </Suspense>
  )
}
