// Honest <lastmod> values for sitemap entries that have no date of their own.
// A hub page changes when one of the podcasts on it changes, so its lastmod is
// the most recent updated_at among its podcasts — not "now" on every build.

import { CATEGORY_TO_CASE_TYPES } from '@/lib/types/database'
import type { BestOfPage } from '@/lib/best-of'

export interface SitemapPodcast {
  slug: string
  updated_at: string | null
  case_types: string[] | null
  country: string | null
  platforms: string[] | null
  binge_factor: number | null
  format_type: string | null
}

/** Latest of the given dates; undefined when there are none. */
export function latestDate(dates: Array<string | Date | null | undefined>): Date | undefined {
  let best: Date | undefined
  for (const d of dates) {
    if (!d) continue
    const date = d instanceof Date ? d : new Date(d)
    if (Number.isNaN(date.getTime())) continue
    if (!best || date > best) best = date
  }
  return best
}

export function categoryPodcasts(slug: string, podcasts: SitemapPodcast[]): SitemapPodcast[] {
  const caseTypes = CATEGORY_TO_CASE_TYPES[slug] ?? []
  if (slug === 'uk-crime') return podcasts.filter(p => p.country === 'UK')
  if (slug === 'australian-crime') return podcasts.filter(p => p.country === 'AU')
  if (slug === 'binge-worthy') return podcasts.filter(p => (p.binge_factor ?? 0) >= 8)
  if (caseTypes.length === 0) return podcasts
  return podcasts.filter(p => p.case_types?.some(t => caseTypes.includes(t)))
}

export function countryPodcasts(code: string, podcasts: SitemapPodcast[]): SitemapPodcast[] {
  return podcasts.filter(p => p.country === code)
}

export function platformPodcasts(name: string, podcasts: SitemapPodcast[]): SitemapPodcast[] {
  return podcasts.filter(p => p.platforms?.includes(name))
}

export function bestOfPodcasts(page: BestOfPage, podcasts: SitemapPodcast[]): SitemapPodcast[] {
  return podcasts.filter(p => {
    if (page.caseTypes && !p.case_types?.some(t => page.caseTypes!.includes(t))) return false
    if (page.country && p.country !== page.country) return false
    if (page.minBinge && (p.binge_factor ?? 0) < page.minBinge) return false
    if (page.format && p.format_type !== page.format) return false
    return true
  })
}

/** lastmod for a hub: its newest podcast, else the newest podcast anywhere. */
export function hubLastModified(hubPodcasts: SitemapPodcast[], allPodcasts: SitemapPodcast[]): Date | undefined {
  return latestDate(hubPodcasts.map(p => p.updated_at)) ?? latestDate(allPodcasts.map(p => p.updated_at))
}

/** lastmod for a case: its own date if set, else its newest linked podcast. */
export function caseLastModified(
  c: { updatedDate?: string; publishedDate?: string; podcasts: Array<{ slug: string }> },
  allPodcasts: SitemapPodcast[]
): Date | undefined {
  const own = latestDate([c.updatedDate ?? c.publishedDate])
  if (own) return own
  const linked = new Set(c.podcasts.map(p => p.slug))
  return hubLastModified(allPodcasts.filter(p => linked.has(p.slug)), allPodcasts)
}
