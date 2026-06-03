import type { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'
import { CATEGORIES, COUNTRIES, PLATFORMS } from '@/lib/types/database'
import { BEST_OF_PAGES } from '@/lib/best-of'

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://listentruecrime.com'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: podcasts } = await supabase
    .from('podcasts')
    .select('slug, updated_at')
    .eq('is_published', true)

  const podcastUrls: MetadataRoute.Sitemap = (podcasts ?? []).map(p => ({
    url: `${BASE}/podcasts/${p.slug}`,
    lastModified: p.updated_at ?? new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  const categoryUrls: MetadataRoute.Sitemap = CATEGORIES.map(c => ({
    url: `${BASE}/category/${c.slug}`,
    changeFrequency: 'weekly',
    priority: 0.6,
  }))

  const countryUrls: MetadataRoute.Sitemap = Object.keys(COUNTRIES).map(code => ({
    url: `${BASE}/country/${code}`,
    changeFrequency: 'monthly',
    priority: 0.5,
  }))

  const platformUrls: MetadataRoute.Sitemap = PLATFORMS.map(p => ({
    url: `${BASE}/platform/${encodeURIComponent(p)}`,
    changeFrequency: 'monthly',
    priority: 0.4,
  }))

  const bestOfUrls: MetadataRoute.Sitemap = BEST_OF_PAGES.map(p => ({
    url: `${BASE}/best/${p.slug}`,
    changeFrequency: 'weekly',
    priority: 0.7,
  }))

  return [
    { url: BASE, changeFrequency: 'daily', priority: 1.0 },
    { url: `${BASE}/browse`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE}/best-true-crime-podcasts`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE}/newsletter`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/about`, changeFrequency: 'monthly', priority: 0.4 },
    ...bestOfUrls,
    ...podcastUrls,
    ...categoryUrls,
    ...countryUrls,
    ...platformUrls,
  ]
}
