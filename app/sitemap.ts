import type { MetadataRoute } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import { CATEGORIES, COUNTRIES, PLATFORMS, countryHref, platformHref } from '@/lib/types/database'
import { getAllPosts, getAllCategories, getAllTags, getPostsByCategory, getPostsByTag } from '@/lib/blog'
import { getAllCases } from '@/lib/cases'
import { getAllAuthors } from '@/lib/authors'
import { BASE } from '@/lib/seo/config'
import { BEST_OF_PAGES } from '@/lib/best-of'
import {
  bestOfPodcasts, caseLastModified, categoryPodcasts, countryPodcasts, hubLastModified,
  latestDate, platformPodcasts, type SitemapPodcast,
} from '@/lib/seo/sitemap-dates'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createAdminClient()
  // Freshness stamp for the handful of static pages with no data behind
  // them. Hubs, cases and blog taxonomies get a real lastmod derived from the
  // content on them (lib/seo/sitemap-dates.ts).
  const now = new Date()
  const { data: podcasts } = await supabase
    .from('podcasts')
    .select('slug, updated_at, case_types, country, platforms, binge_factor, format_type')
    .eq('is_published', true)
  const allPodcasts = (podcasts ?? []) as SitemapPodcast[]

  const podcastUrls: MetadataRoute.Sitemap = allPodcasts.map(p => ({
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
    lastModified: hubLastModified(categoryPodcasts(c.slug, allPodcasts), allPodcasts),
    changeFrequency: 'weekly',
    priority: 0.7,
  }))

  const countryUrls: MetadataRoute.Sitemap = Object.keys(COUNTRIES).map(code => ({
    url: `${BASE}${countryHref(code)}`,
    lastModified: hubLastModified(countryPodcasts(code, allPodcasts), allPodcasts),
    changeFrequency: 'weekly',
    priority: 0.6,
  }))

  const platformUrls: MetadataRoute.Sitemap = PLATFORMS.map(p => ({
    url: `${BASE}${platformHref(p)}`,
    lastModified: hubLastModified(platformPodcasts(p, allPodcasts), allPodcasts),
    changeFrequency: 'monthly',
    priority: 0.5,
  }))

  // /best/* lists. Pages that canonicalise to a category hub (canonicalOverride)
  // are left out — only the canonical URL belongs in the sitemap.
  const bestOfUrls: MetadataRoute.Sitemap = BEST_OF_PAGES.filter(b => !b.canonicalOverride).map(b => ({
    url: `${BASE}/best/${b.slug}`,
    lastModified: hubLastModified(bestOfPodcasts(b, allPodcasts), allPodcasts),
    changeFrequency: 'weekly',
    priority: 0.7,
  }))

  const cases = getAllCases()
  const caseUrls: MetadataRoute.Sitemap = cases.map(c => ({
    url: `${BASE}/cases/${c.slug}`,
    lastModified: caseLastModified(c, allPodcasts),
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
    lastModified: latestDate(getPostsByCategory(c.name).map(post => post.updated ?? post.date)),
    changeFrequency: 'weekly',
    priority: 0.6,
  }))

  const blogTagUrls: MetadataRoute.Sitemap = blogTags.map(t => ({
    url: `${BASE}/blog/tag/${t.slug}`,
    lastModified: latestDate(getPostsByTag(t.name).map(post => post.updated ?? post.date)),
    changeFrequency: 'weekly',
    priority: 0.5,
  }))

  const authors = getAllAuthors()
  const authorUrls: MetadataRoute.Sitemap = authors.map(a => ({
    url: `${BASE}/authors/${a.slug}`,
    lastModified: latestDate(blogPosts.filter(post => (post.author ?? 'david-stark') === a.slug).map(post => post.updated ?? post.date)),
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
    ...bestOfUrls,
    ...blogPostUrls,
    ...blogCategoryUrls,
    ...blogTagUrls,
    ...newsletterUrls,
  ]
}
