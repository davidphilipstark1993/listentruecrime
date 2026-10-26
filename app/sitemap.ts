import type { MetadataRoute } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import { CATEGORIES, COUNTRIES, PLATFORMS, PLATFORM_SLUGS } from '@/lib/types/database'
import { getAllPosts, getAllCategories, getAllTags, MIN_INDEXABLE_TAG_POSTS } from '@/lib/blog'
import { getAllCases } from '@/lib/cases'
import { getAllAuthors } from '@/lib/authors'
import { BASE } from '@/lib/seo/config'
import { shopEnabled, SHOP_CATEGORIES } from '@/lib/shop/config'
import { normalisePath } from '@/lib/redirects'
import { getIndexablePodcastsLike, getListingCounts, MIN_INDEXABLE_COUNTRY_PODCASTS, MIN_INDEXABLE_PLATFORM_PODCASTS } from '@/lib/seo/indexability'

// Regenerate hourly (and on admin saves) so unpublished, redirected and noindexed
// pages leave the sitemap without waiting for the next deploy.
export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createAdminClient()
  // Shared freshness stamp for collections with no per-item updated_at of
  // their own (categories/countries/platforms are static lists; podcasts,
  // blog posts, cases, and newsletters each carry their own real date below).
  const now = new Date()
  const listingCounts = await getListingCounts()
  const { data: podcasts } = await supabase
    .from('podcasts')
    .select('slug, updated_at')
    .eq('is_published', true)

  // Redirected and noindexed pages must not be in the sitemap. These columns/tables
  // arrive with migration 018, so they are read separately and tolerate not existing yet.
  const { data: redirectRows } = await supabase.from('redirects').select('from_path')
  const redirected = new Set((redirectRows ?? []).map(r => normalisePath(r.from_path)))
  const { data: noindexRows } = await supabase.from('podcasts').select('slug').eq('noindex', true)
  const noindexed = new Set((noindexRows ?? []).map(r => r.slug))
  const isListed = (path: string) => !redirected.has(path)

  const podcastUrls: MetadataRoute.Sitemap = (podcasts ?? []).filter(p => isListed(`/podcasts/${p.slug}`) && !noindexed.has(p.slug)).map(p => ({
    url: `${BASE}/podcasts/${p.slug}`,
    lastModified: p.updated_at ?? new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  // /podcasts-like/* is noindex'd except for pages with demand signals — only
  // that subset is listed (see lib/seo/indexability.ts).
  const podcastsLikeUrls: MetadataRoute.Sitemap = (
    await getIndexablePodcastsLike(getAllPosts().map(p => p.slug))
  ).map(slug => ({
    url: `${BASE}/podcasts-like/${slug}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.6,
  }))

  // uk-crime / australian-crime canonicalise to their country pages (see app/category/[slug]/page.tsx).
  const categoryUrls: MetadataRoute.Sitemap = CATEGORIES.filter(c => c.slug !== 'uk-crime' && c.slug !== 'australian-crime').map(c => ({
    url: `${BASE}/category/${c.slug}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.7,
  }))

  const countryUrls: MetadataRoute.Sitemap = Object.keys(COUNTRIES).filter(code => (listingCounts.countries[code] ?? 0) >= MIN_INDEXABLE_COUNTRY_PODCASTS).map(code => ({
    url: `${BASE}/country/${code}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.6,
  }))

  const platformUrls: MetadataRoute.Sitemap = PLATFORMS.filter(p => (listingCounts.platforms[p] ?? 0) >= MIN_INDEXABLE_PLATFORM_PODCASTS).map(p => ({
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
  const blogTags = getAllTags().filter(t => t.count >= MIN_INDEXABLE_TAG_POSTS)

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

  const { data: noindexIssueRows } = await supabase.from('newsletters').select('slug').eq('noindex', true)
  const noindexedIssues = new Set((noindexIssueRows ?? []).map(r => r.slug))

  const newsletterUrls: MetadataRoute.Sitemap = (newsletters ?? []).filter(n => !noindexedIssues.has(n.slug)).map(n => ({
    url: `${BASE}/newsletter/${n.slug}`,
    lastModified: n.updated_at ?? new Date(),
    changeFrequency: 'weekly',
    priority: 0.75,
  }))

  // Shop URLs are listed only while the shop is enabled (published products only).
  let shopUrls: MetadataRoute.Sitemap = []
  if (shopEnabled()) {
    const { data: shopProducts } = await supabase.from('shop_products').select('slug, updated_at').eq('is_published', true)
    shopUrls = [
      { url: `${BASE}/shop`, changeFrequency: 'weekly', priority: 0.8, lastModified: now },
      ...SHOP_CATEGORIES.map(c => ({ url: `${BASE}/shop/category/${c.slug}`, changeFrequency: 'weekly' as const, priority: 0.7, lastModified: now })),
      ...(shopProducts ?? []).map(p => ({ url: `${BASE}/shop/${p.slug}`, changeFrequency: 'weekly' as const, priority: 0.7, lastModified: p.updated_at ?? now })),
      { url: `${BASE}/shop/shipping-policy`, changeFrequency: 'yearly', priority: 0.3, lastModified: now },
      { url: `${BASE}/shop/returns-and-refunds`, changeFrequency: 'yearly', priority: 0.3, lastModified: now },
    ]
  }

  return [
    ...shopUrls,
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
    ...podcastsLikeUrls,
    ...categoryUrls,
    ...countryUrls,
    ...platformUrls,
    ...blogPostUrls,
    ...blogCategoryUrls,
    ...blogTagUrls,
    ...newsletterUrls,
  ]
}
