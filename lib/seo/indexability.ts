import { unstable_cache } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'

// Listing pages (platform / country) are only worth indexing when they list
// enough shows to be a useful page; with one or two podcasts they are thin
// near-copies of the podcast pages themselves. Below these thresholds a page
// stays reachable but is noindexed and left out of the sitemap — Search Console
// files these under "Crawled – currently not indexed".
export const MIN_INDEXABLE_PLATFORM_PODCASTS = 10
export const MIN_INDEXABLE_COUNTRY_PODCASTS = 5

type PodcastFacets = { country: string | null; platforms: string[] | null }

/** Published-podcast counts per country code and platform name, in one query. */
export async function getListingCounts(): Promise<{
  countries: Record<string, number>
  platforms: Record<string, number>
}> {
  const { data } = await createAdminClient()
    .from('podcasts')
    .select('country, platforms')
    .eq('is_published', true)
    .limit(5000)

  const countries: Record<string, number> = {}
  const platforms: Record<string, number> = {}
  for (const p of (data ?? []) as PodcastFacets[]) {
    if (p.country) countries[p.country] = (countries[p.country] ?? 0) + 1
    for (const name of p.platforms ?? []) platforms[name] = (platforms[name] ?? 0) + 1
  }
  return { countries, platforms }
}

// ---------------------------------------------------------------------------
// /podcasts-like/[slug]
//
// One templated page per podcast. Indexing all ~730 invites "Crawled – currently
// not indexed", but blanket noindex (Sep 2026) also dropped pages that were
// earning clicks (e.g. /podcasts-like/love-trapped). So index selectively:
//
//  - demand proxy: shows that at least MIN_INCOMING_RECS other podcasts name in
//    their hand-picked `if_you_liked_this` list are the shows people are looking
//    for alternatives to;
//  - plus an explicit allowlist for pages Search Console shows earning clicks;
//  - never where a hand-written /blog/podcasts-like-<show> post exists — that
//    post targets the same query and is the better page.
//
// Everything else stays noindex,follow and out of the sitemap.
// ---------------------------------------------------------------------------

export const MIN_INCOMING_RECS = 3

/** Pages with proven Search Console clicks that the demand proxy would miss. */
export const PODCASTS_LIKE_ALLOWLIST = new Set<string>(['love-trapped'])

type RecRow = { slug: string; if_you_liked_this: string[] | null }

export const getIndexablePodcastsLike = unstable_cache(
  async (blogSlugs: string[]): Promise<string[]> => {
    const { data } = await createAdminClient()
      .from('podcasts')
      .select('slug, if_you_liked_this')
      .eq('is_published', true)
      .limit(5000)

    const rows = (data ?? []) as RecRow[]
    const published = new Set(rows.map(r => r.slug))
    const incoming: Record<string, number> = {}
    for (const r of rows) {
      for (const target of Array.from(new Set(r.if_you_liked_this ?? []))) {
        if (target !== r.slug && published.has(target)) incoming[target] = (incoming[target] ?? 0) + 1
      }
    }

    // /blog/podcasts-like-casefile covers /podcasts-like/casefile-true-crime too.
    const blogTopics = blogSlugs.filter(s => s.startsWith('podcasts-like-')).map(s => s.slice('podcasts-like-'.length))
    const hasBlogPost = (slug: string) => blogTopics.some(t => slug === t || slug.startsWith(`${t}-`))

    return rows
      .map(r => r.slug)
      .filter(slug => (incoming[slug] ?? 0) >= MIN_INCOMING_RECS || PODCASTS_LIKE_ALLOWLIST.has(slug))
      .filter(slug => !hasBlogPost(slug))
  },
  ['podcasts-like-indexable'],
  { revalidate: 3600 },
)
