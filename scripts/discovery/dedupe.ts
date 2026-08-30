import type { SupabaseClient } from '@supabase/supabase-js'
import { findDuplicate, type ComparableRecord, type DuplicateMatch } from './duplicateCheck'
import type { CandidateFeed } from './types'

export async function loadExistingRecords(supabase: SupabaseClient): Promise<ComparableRecord[]> {
  const [discoveries, podcasts] = await Promise.all([
    supabase.from('podcast_discoveries').select('id, podcast_name, rss_url, apple_url, website_url'),
    supabase.from('podcasts').select('id, title, website_url'),
  ])

  const records: ComparableRecord[] = []

  for (const row of discoveries.data ?? []) {
    records.push({ id: row.id, name: row.podcast_name, rssUrl: row.rss_url, appleUrl: row.apple_url, websiteUrl: row.website_url })
  }
  for (const row of podcasts.data ?? []) {
    // podcasts table has no rss_url/apple_url columns — only name + website are comparable.
    records.push({ id: row.id, name: row.title, rssUrl: null, appleUrl: null, websiteUrl: row.website_url })
  }

  return records
}

export interface ClassifiedCandidate {
  candidate: CandidateFeed
  match: DuplicateMatch
}

export interface ClassifiedCandidates {
  newCandidates: CandidateFeed[]
  likelyDuplicates: ClassifiedCandidate[]
  possibleDuplicates: ClassifiedCandidate[]
}

/**
 * Classifies each candidate against every existing record (both prior
 * discoveries and published podcasts) using multi-signal duplicate
 * detection (identifiers, exact name, containment, fuzzy similarity).
 * High-confidence matches are never silently dropped — they're recorded
 * with a reason so there's an audit trail (see index.ts). Also compares
 * candidates against each other within the same run, so a search that
 * surfaces the same show twice under slightly different query terms
 * doesn't insert it twice.
 */
export function classifyCandidates(candidates: CandidateFeed[], existingRecords: ComparableRecord[]): ClassifiedCandidates {
  const result: ClassifiedCandidates = { newCandidates: [], likelyDuplicates: [], possibleDuplicates: [] }
  const seenInThisRun: ComparableRecord[] = []

  for (const candidate of candidates) {
    const match = findDuplicate(
      candidate.podcastName,
      candidate.rssUrl,
      candidate.appleUrl,
      candidate.websiteUrl,
      [...existingRecords, ...seenInThisRun]
    )

    if (match.confidence === 'high') {
      result.likelyDuplicates.push({ candidate, match })
    } else if (match.confidence === 'medium') {
      result.possibleDuplicates.push({ candidate, match })
      seenInThisRun.push(toComparable(candidate))
    } else {
      result.newCandidates.push(candidate)
      seenInThisRun.push(toComparable(candidate))
    }
  }

  return result
}

function toComparable(c: CandidateFeed): ComparableRecord {
  return { id: c.rssUrl ?? c.podcastName, name: c.podcastName, rssUrl: c.rssUrl, appleUrl: c.appleUrl, websiteUrl: c.websiteUrl }
}
