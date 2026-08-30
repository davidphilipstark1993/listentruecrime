import type { SupabaseClient } from '@supabase/supabase-js'
import type { CandidateFeed } from './types'

interface ExistingKeys {
  rssUrls: Set<string>
  normalizedNames: Set<string>
}

export async function loadExistingKeys(supabase: SupabaseClient): Promise<ExistingKeys> {
  const [discoveries, podcasts] = await Promise.all([
    supabase.from('podcast_discoveries').select('rss_url, normalized_name'),
    supabase.from('podcasts').select('title'),
  ])

  const rssUrls = new Set<string>()
  const normalizedNames = new Set<string>()

  for (const row of discoveries.data ?? []) {
    if (row.rss_url) rssUrls.add(row.rss_url)
    if (row.normalized_name) normalizedNames.add(row.normalized_name)
  }
  for (const row of podcasts.data ?? []) {
    if (row.title) normalizedNames.add(normalizeForCompare(row.title))
  }

  return { rssUrls, normalizedNames }
}

function normalizeForCompare(name: string): string {
  return name.toLowerCase().replace(/\bpodcast\b/g, '').replace(/[^a-z0-9]+/g, '').trim()
}

/**
 * Filters out candidates that are strong duplicates (matching RSS URL or
 * normalized name) of something already in podcast_discoveries or podcasts.
 * Anything else is kept — ambiguous cases are surfaced to the admin review
 * UI rather than silently dropped.
 */
export function filterNewCandidates(candidates: CandidateFeed[], existing: ExistingKeys): CandidateFeed[] {
  return candidates.filter(c => {
    if (c.rssUrl && existing.rssUrls.has(c.rssUrl)) return false
    if (existing.normalizedNames.has(c.normalizedName)) return false
    return true
  })
}
