import { joinNames } from '@/lib/best-of-meta'
import { stripHtml } from '@/lib/utils'

// Helpers for /new-true-crime-podcasts: the page that owns the head term
// "new true crime podcasts". Everything it says is generated from the
// podcasts table (created_at = the date we added the show), so the page
// updates itself whenever the daily discovery routine adds a show.

export const NEW_PAGE_PATH = '/new-true-crime-podcasts'
export const NEW_PAGE_LIMIT = 24

export interface NewPodcastLike {
  title: string
  slug: string
  created_at: string | null
  binge_factor: number | null
  host_name: string | null
  short_description: string | null
  description?: string | null
  noindex?: boolean | null
}

/** Only complete, indexable records appear: thin bulk imports (no score, no host, no description) are left out. */
export function isCompleteNewRecord(p: NewPodcastLike): boolean {
  return Boolean(p.binge_factor)
    && Boolean(p.host_name?.trim())
    && stripHtml(p.short_description ?? p.description ?? '').length > 0
    && !p.noindex
}

/** Newest first, complete records only. */
export function pickNewPodcasts<T extends NewPodcastLike>(rows: T[], limit = NEW_PAGE_LIMIT): T[] {
  return rows
    .filter(isCompleteNewRecord)
    .sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())
    .slice(0, limit)
}

/** "11 November 2026", in the site's own time zone. */
export function formatAddedDate(iso: string | null | undefined): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/London' })
}

/** "November 2026" for the newest addition, so the title shows how fresh the list is. */
export function monthLabel(iso: string | null | undefined): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'Europe/London' })
}

export function newPageTitle(newestIso: string | null | undefined): string {
  const month = monthLabel(newestIso)
  return month ? `New True Crime Podcasts (${month}): Latest Added` : 'New True Crime Podcasts: Latest Added'
}

export const NEW_PAGE_DESCRIPTION_FALLBACK =
  'New true crime podcasts added to our directory, newest first, each with a Binge Factor score, our verdict and where to start.'

/** Names the three newest shows when that fits in 160 characters; otherwise generic copy. */
export function newPageDescription(names: string[]): string {
  if (names.length < 3) return NEW_PAGE_DESCRIPTION_FALLBACK
  const d = `New true crime podcasts, newest first: ${joinNames(names.slice(0, 3))}. Each with a Binge Factor score, our verdict and where to start.`
  return d.length <= 160 ? d : NEW_PAGE_DESCRIPTION_FALLBACK
}

/**
 * Trims a meta description to `max` characters without cutting a word in half:
 * prefers the last full sentence that fits, then the last whole word plus "…".
 */
export function clampMeta(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean.length <= max) return clean
  const window = clean.slice(0, max)
  const sentenceEnd = Math.max(window.lastIndexOf('. '), window.lastIndexOf('! '), window.lastIndexOf('? '))
  if (sentenceEnd >= max * 0.6) return window.slice(0, sentenceEnd + 1)
  const cut = clean.slice(0, max - 1).replace(/[\s,;:—–-]+\S*$/, '').replace(/[\s,;:—–-]+$/, '')
  return `${cut}…`
}
