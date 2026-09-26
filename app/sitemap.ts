import type { MetadataRoute } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import { CATEGORIES, COUNTRIES, PLATFORMS, PLATFORM_SLUGS } from '@/lib/types/database'
import { getAllPosts, getAllCategories, getAllTags } from '@/lib/blog'
import { getAllCases } from '@/lib/cases'
import { getAllAuthors } from '@/lib/authors'
import { BASE } from '@/lib/seo/config'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createAdminClient()
  // Shared freshness stamp for collections with no per-item updated_at of
  // their own (categories/countries/platforms are static lists; podcasts,
  // blog posts, cases, and newsletters each carry their own real date below).
  const now = new Date()
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

  // /podcasts-like/* is noindex'd (see app/podcasts-like/[slug]/page.tsx) —
  // thin, auto-generated mirrors of /podcasts/*, so they don't belong in the
  // sitemap either.

  const categoryUrls: MetadataRoute.Sitemap = CATEGORIES.map(c => ({
    url: `${BASE}/category/${c.slug}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.7,
  }))

  const countryUrls: MetadataRoute.Sitemap = Object.keys(COUNTRIES).map(code => ({
    url: `${BASE}/country/${code}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.6,
  }))

  const platformUrls: MetadataRoute.Sitemap = PLATFORMS.map(p => ({
    url: `${BASE}/platform/${PLATFORM_SLUGS[p] ?? encodeURIComponent(p)}`,
    lastModified: now,
    changeFrequency: 'monthly',
    priority: 0.5,
  }))

  const cases = getAllCases()
  const caseUrls: MetadataRoute.Sitemap = cases.map(c => ({
    url: `${BASE}/cases/${c.slug}`,
    lastModified: now,
    changeFrequency: 'monthly',
    priority: 0.7,
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
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.6,
  }))

  const blogTagUrls: MetadataRoute.Sitemap = blogTags.map(t => ({
    url: `${BASE}/blog/tag/${t.slug}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.5,
  }))

  const authors = getAllAuthors()
  const authorUrls: MetadataRoute.Sitemap = authors.map(a => ({
    url: `${BASE}/authors/${a.slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.5,
  }))

  const { data: newsletters } = await supabase
    .from('newsletters')
    .select('slug, updated_at')
    .in('status', ['sent', 'archived'])

  const newsletterUrls: MetadataRoute.Sitemap = (newsletters ?? []).map(n => ({
    url: `${BASE}/newsletter/${n.slug}`,
    lastModified: n.updated_at ?? new Date(),
    changeFrequency: 'weekly',
    priority: 0.75,
  }))

  return [
    { url: `${BASE}/cases`, changeFrequency: 'weekly', priority: 0.8, lastModified: new Date() },
    ...caseUrls,
    { url: `${BASE}/badge`, changeFrequency: 'monthly', priority: 0.4, lastModified: now },
    { url: `${BASE}/promote-your-podcast`, changeFrequency: 'monthly', priority: 0.5, lastModified: now },
    ...authorUrls,
    { url: BASE, changeFrequency: 'daily', priority: 1.0, lastModified: new Date() },
    { url: `${BASE}/browse`, changeFrequency: 'daily', priority: 0.9, lastModified: new Date() },
    { url: `${BASE}/best-true-crime-podcasts`, changeFrequency: 'weekly', priority: 0.95, lastModified: new Date() },
    { url: `${BASE}/how-we-review`, changeFrequency: 'monthly', priority: 0.6, lastModified: now },
    { url: `${BASE}/editors-choice`, changeFrequency: 'weekly', priority: 0.7, lastModified: now },
    { url: `${BASE}/blog`, changeFrequency: 'daily', priority: 0.85, lastModified: new Date() },
    { url: `${BASE}/newsletter`, changeFrequency: 'daily', priority: 0.85, lastModified: new Date() },
    { url: `${BASE}/subscribe`, changeFrequency: 'monthly', priority: 0.7, lastModified: now },
    { url: `${BASE}/about`, changeFrequency: 'monthly', priority: 0.4, lastModified: now },
    { url: `${BASE}/contact`, changeFrequency: 'yearly', priority: 0.3, lastModified: now },
    { url: `${BASE}/privacy`, changeFrequency: 'yearly', priority: 0.3, lastModified: now },
    { url: `${BASE}/terms`, changeFrequency: 'yearly', priority: 0.3, lastModified: now },
    ...podcastUrls,
    ...categoryUrls,
    ...countryUrls,
    ...platformUrls,
    ...blogPostUrls,
    ...blogCategoryUrls,
    ...blogTagUrls,
    ...newsletterUrls,
  ]
}
