import type { MetadataRoute } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import { CATEGORIES, CATEGORY_CURATED_SLUGS, CATEGORY_TO_CASE_TYPES, COUNTRIES, PLATFORMS, PLATFORM_SLUGS } from '@/lib/types/database'
import { getAllPosts, getAllCategories, getAllTags, MIN_INDEXABLE_TAG_POSTS, slugifyCategory } from '@/lib/blog'
import { getAllCases } from '@/lib/cases'
import { getAllAuthors } from '@/lib/authors'
import { BASE } from '@/lib/seo/config'
import { BEST_PAGE_UPDATED } from '@/lib/best-page'
import { HOW_WE_REVIEW_UPDATED, ABOUT_UPDATED } from '@/lib/seo/page-dates'
import { hasCaseType } from '@/lib/podcast-facets'
import { shopEnabled, SHOP_CATEGORIES, SHOP_COLLECTIONS } from '@/lib/shop/config'
import { normalisePath } from '@/lib/redirects'
import { getIndexablePodcastsLike, getListingCounts, MIN_INDEXABLE_COUNTRY_PODCASTS, MIN_INDEXABLE_PLATFORM_PODCASTS } from '@/lib/seo/indexability'

// Regenerate hourly (and on admin saves) so unpublished, redirected and noindexed
// pages leave the sitemap without waiting for the next deploy.
export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createAdminClient()
  // lastmod is only given where there is a real date behind it: the newest update among
  // the records a hub page lists, a post's own date, or an editorial date constant.
  // Pages with no honest date omit lastModified rather than reporting "now" on every
  // regeneration, which teaches crawlers to ignore the field.
  const latest = (dates: (string | null | undefined)[]): Date | undefined => {
    const ts = dates.filter((d): d is string => !!d).map(d => new Date(d).getTime()).filter(n => !Number.isNaN(n))
    return ts.length ? new Date(Math.max(...ts)) : undefined
  }
  const listingCounts = await getListingCounts()
  const { data: podcasts } = await supabase
    .from('podcasts')
    .select('slug, updated_at, country, platforms, case_types, binge_factor')
    .eq('is_published', true)

  // Redirected and noindexed pages must not be in the sitemap. These columns/tables
  // arrive with migration 018, so they are read separately and tolerate not existing yet.
  const { data: redirectRows } = await supabase.from('redirects').select('from_path')
  const redirected = new Set((redirectRows ?? []).map(r => normalisePath(r.from_path)))
  const { data: noindexRows } = await supabase.from('podcasts').select('slug').eq('noindex', true)
  const noindexed = new Set((noindexRows ?? []).map(r => r.slug))
  const isListed = (path: string) => !redirected.has(path)
  const updatedBySlug = new Map((podcasts ?? []).map(p => [p.slug, p.updated_at as string | null]))
  const allPodcastsUpdated = latest((podcasts ?? []).map(p => p.updated_at))

  const podcastUrls: MetadataRoute.Sitemap = (podcasts ?? []).filter(p => isListed(`/podcasts/${p.slug}`) && !noindexed.has(p.slug)).map(p => ({
    url: `${BASE}/podcasts/${p.slug}`,
    lastModified: latest([p.updated_at]),
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  // /podcasts-like/* is noindex'd except for pages with demand signals — only
  // that subset is listed (see lib/seo/indexability.ts).
  const podcastsLikeUrls: MetadataRoute.Sitemap = (
    await getIndexablePodcastsLike(getAllPosts().map(p => p.slug))
  ).map(slug => ({
    url: `${BASE}/podcasts-like/${slug}`,
    lastModified: latest([updatedBySlug.get(slug)]),
    changeFrequency: 'weekly',
    priority: 0.6,
  }))

  // uk-crime / australian-crime canonicalise to their country pages (see app/category/[slug]/page.tsx).
  const categoryUrls: MetadataRoute.Sitemap = CATEGORIES.filter(c => c.slug !== 'uk-crime' && c.slug !== 'australian-crime').map(c => {
    const types = CATEGORY_TO_CASE_TYPES[c.slug] ?? []
    const curated = new Set(CATEGORY_CURATED_SLUGS[c.slug] ?? [])
    const members = (podcasts ?? []).filter(p =>
      curated.size ? curated.has(p.slug)
        : c.slug === 'binge-worthy' ? (p.binge_factor ?? 0) >= 8
        : types.length > 0 && hasCaseType(p, ...types))
    return { slug: c.slug, updated: latest(members.map(p => p.updated_at)) }
  }).map(c => ({
    url: `${BASE}/category/${c.slug}`,
    lastModified: c.updated,
    changeFrequency: 'weekly',
    priority: 0.7,
  }))

  const countryUrls: MetadataRoute.Sitemap = Object.keys(COUNTRIES).filter(code => (listingCounts.countries[code] ?? 0) >= MIN_INDEXABLE_COUNTRY_PODCASTS).map(code => ({
    url: `${BASE}/country/${code}`,
    lastModified: latest((podcasts ?? []).filter(p => p.country === code).map(p => p.updated_at)),
    changeFrequency: 'weekly',
    priority: 0.6,
  }))

  const platformUrls: MetadataRoute.Sitemap = PLATFORMS.filter(p => (listingCounts.platforms[p] ?? 0) >= MIN_INDEXABLE_PLATFORM_PODCASTS).map(p => ({
    url: `${BASE}/platform/${PLATFORM_SLUGS[p] ?? encodeURIComponent(p)}`,
    lastModified: latest((podcasts ?? []).filter(x => (x.platforms ?? []).includes(p)).map(x => x.updated_at)),
    changeFrequency: 'monthly',
    priority: 0.5,
  }))

  const cases = getAllCases()
  const caseUrls: MetadataRoute.Sitemap = cases.map(c => ({
    url: `${BASE}/cases/${c.slug}`,
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
    lastModified: latest(blogPosts.filter(p => slugifyCategory(p.category) === c.slug).map(p => p.updated ?? p.date)),
    changeFrequency: 'weekly',
    priority: 0.6,
  }))

  const blogTagUrls: MetadataRoute.Sitemap = blogTags.map(t => ({
    url: `${BASE}/blog/tag/${t.slug}`,
    lastModified: latest(blogPosts.filter(p => p.tags.some(x => slugifyCategory(x) === t.slug)).map(p => p.updated ?? p.date)),
    changeFrequency: 'weekly',
    priority: 0.5,
  }))

  const authors = getAllAuthors()
  const authorUrls: MetadataRoute.Sitemap = authors.map(a => ({
    url: `${BASE}/authors/${a.slug}`,
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
    lastModified: latest([n.updated_at]),
    changeFrequency: 'weekly',
    priority: 0.75,
  }))

  // Shop URLs are listed only while the shop is enabled (published products only).
  let shopUrls: MetadataRoute.Sitemap = []
  if (shopEnabled()) {
    const { data: shopProducts } = await supabase.from('shop_products').select('slug, updated_at').eq('is_published', true)
    shopUrls = [
      { url: `${BASE}/shop`, changeFrequency: 'weekly', priority: 0.8 },
      ...SHOP_CATEGORIES.map(c => ({ url: `${BASE}/shop/category/${c.slug}`, changeFrequency: 'weekly' as const, priority: 0.7 })),
      ...SHOP_COLLECTIONS.map(c => ({ url: `${BASE}/shop/collection/${c.slug}`, changeFrequency: 'weekly' as const, priority: 0.7 })),
      ...(shopProducts ?? []).map(p => ({ url: `${BASE}/shop/${p.slug}`, changeFrequency: 'weekly' as const, priority: 0.7, lastModified: latest([p.updated_at]) })),
      { url: `${BASE}/shop/shipping-policy`, changeFrequency: 'yearly', priority: 0.3 },
      { url: `${BASE}/shop/returns-and-refunds`, changeFrequency: 'yearly', priority: 0.3 },
    ]
  }

  return [
    ...shopUrls,
    { url: `${BASE}/cases`, changeFrequency: 'weekly', priority: 0.8 },
    ...caseUrls,
    { url: `${BASE}/badge`, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${BASE}/promote-your-podcast`, changeFrequency: 'monthly', priority: 0.5 },
    ...authorUrls,
    { url: BASE, changeFrequency: 'daily', priority: 1.0, lastModified: allPodcastsUpdated },
    { url: `${BASE}/browse`, changeFrequency: 'daily', priority: 0.9, lastModified: allPodcastsUpdated },
    { url: `${BASE}/best-true-crime-podcasts`, changeFrequency: 'weekly', priority: 0.95, lastModified: new Date(BEST_PAGE_UPDATED) },
    { url: `${BASE}/how-we-review`, changeFrequency: 'monthly', priority: 0.6, lastModified: new Date(HOW_WE_REVIEW_UPDATED) },
    { url: `${BASE}/editors-choice`, changeFrequency: 'weekly', priority: 0.7, lastModified: allPodcastsUpdated },
    { url: `${BASE}/blog`, changeFrequency: 'daily', priority: 0.85, lastModified: latest(blogPosts.map(p => p.updated ?? p.date)) },
    { url: `${BASE}/newsletter`, changeFrequency: 'daily', priority: 0.85, lastModified: latest((newsletters ?? []).map(n => n.updated_at)) },
    { url: `${BASE}/subscribe`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/about`, changeFrequency: 'monthly', priority: 0.4, lastModified: new Date(ABOUT_UPDATED) },
    { url: `${BASE}/contact`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE}/privacy`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE}/terms`, changeFrequency: 'yearly', priority: 0.3 },
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
