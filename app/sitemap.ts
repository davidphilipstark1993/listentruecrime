import type { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'
import { CATEGORIES, COUNTRIES, PLATFORMS } from '@/lib/types/database'
import { getAllPosts, getAllCategories, getAllTags } from '@/lib/blog'
import { BASE } from '@/lib/seo/config'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient()
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

  const podcastsLikeUrls: MetadataRoute.Sitemap = (podcasts ?? []).map(p => ({
    url: `${BASE}/podcasts-like/${p.slug}`,
    lastModified: p.updated_at ?? new Date(),
    changeFrequency: 'weekly',
    priority: 0.7,
  }))

  const categoryUrls: MetadataRoute.Sitemap = CATEGORIES.map(c => ({
    url: `${BASE}/category/${c.slug}`,
    changeFrequency: 'weekly',
    priority: 0.7,
  }))

  const countryUrls: MetadataRoute.Sitemap = Object.keys(COUNTRIES).map(code => ({
    url: `${BASE}/country/${code}`,
    changeFrequency: 'weekly',
    priority: 0.6,
  }))

  const platformUrls: MetadataRoute.Sitemap = PLATFORMS.map(p => ({
    url: `${BASE}/platform/${encodeURIComponent(p)}`,
    changeFrequency: 'monthly',
    priority: 0.5,
  }))

  const blogPosts = getAllPosts()
  const blogCategories = getAllCategories()
  const blogTags = getAllTags()

  const blogPostUrls: MetadataRoute.Sitemap = blogPosts.map(p => ({
    url: `${BASE}/blog/${p.slug}`,
    lastModified: new Date(p.updated ?? p.date),
    changeFrequency: 'weekly',
    priority: 0.75,
  }))

  const blogCategoryUrls: MetadataRoute.Sitemap = blogCategories.map(c => ({
    url: `${BASE}/blog/category/${c.slug}`,
    changeFrequency: 'weekly',
    priority: 0.6,
  }))

  const blogTagUrls: MetadataRoute.Sitemap = blogTags.map(t => ({
    url: `${BASE}/blog/tag/${t.slug}`,
    changeFrequency: 'weekly',
    priority: 0.5,
  }))

  return [
    { url: BASE, changeFrequency: 'daily', priority: 1.0, lastModified: new Date() },
    { url: `${BASE}/browse`, changeFrequency: 'daily', priority: 0.9, lastModified: new Date() },
    { url: `${BASE}/best-true-crime-podcasts`, changeFrequency: 'weekly', priority: 0.95, lastModified: new Date() },
    { url: `${BASE}/blog`, changeFrequency: 'daily', priority: 0.85, lastModified: new Date() },
    { url: `${BASE}/about`, changeFrequency: 'monthly', priority: 0.4 },
    ...podcastUrls,
    ...podcastsLikeUrls,
    ...categoryUrls,
    ...countryUrls,
    ...platformUrls,
    ...blogPostUrls,
    ...blogCategoryUrls,
    ...blogTagUrls,
  ]
}
