import crypto from 'node:crypto'
import { normalizeName } from '../normalize'
import { sanitizeEnv } from '@/lib/utils'
import type { CandidateFeed } from '../types'

interface PodcastIndexFeed {
  id: number
  title: string
  url: string // rss feed url
  link: string | null // website
  itunesId: number | null
  artwork: string | null
  image: string | null
}

// Podcast Index auth: SHA-1(apiKey + apiSecret + unixTime), sent as headers
// per https://podcastindex-org.github.io/docs-api/#overview--authentication
function authHeaders(apiKey: string, apiSecret: string) {
  const now = Math.floor(Date.now() / 1000).toString()
  const hash = crypto.createHash('sha1').update(apiKey + apiSecret + now).digest('hex')
  return {
    'X-Auth-Key': apiKey,
    'X-Auth-Date': now,
    Authorization: hash,
    'User-Agent': 'ListenTrueCrime-Discovery/1.0',
  }
}

// Deliberately spans multiple discovery angles rather than one generic
// query — a single broad "true crime" search only surfaces the handful of
// biggest, longest-running shows. Each angle here targets a different kind
// of candidate (recency, scale, geography, format) so the combined,
// interleaved result set has a genuine mix rather than being dominated by
// whichever angle happens to return the most results.
const SEARCH_TERMS = [
  'true crime',                        // general baseline
  'new true crime podcast',            // newer shows
  'independent true crime podcast',    // smaller/independent producers
  'true crime documentary',            // investigative/documentary format
  'UK true crime',                     // UK
  'British true crime',                // UK
  'Australian true crime',             // international
  'Canadian true crime',               // international
  'cold case podcast',                 // unsolved-case angle
  'unsolved disappearance',            // unsolved-case angle
  'wrongful conviction podcast',       // investigative
  'true crime interview',              // format variety, often smaller shows
]

/**
 * Searches Podcast Index across multiple angles and interleaves the
 * per-angle results (round-robin) before deduplicating, so a downstream
 * cap on total candidates doesn't get filled entirely by whichever term
 * happens to return the most results first.
 */
export async function searchPodcastIndex(terms: string[] = SEARCH_TERMS, maxPerTerm = 20): Promise<CandidateFeed[]> {
  const apiKey = process.env.PODCASTINDEX_API_KEY ? sanitizeEnv(process.env.PODCASTINDEX_API_KEY) : undefined
  const apiSecret = process.env.PODCASTINDEX_API_SECRET ? sanitizeEnv(process.env.PODCASTINDEX_API_SECRET) : undefined
  if (!apiKey || !apiSecret) {
    console.warn('PODCASTINDEX_API_KEY/PODCASTINDEX_API_SECRET not set — skipping Podcast Index search')
    return []
  }

  const resultsByTerm: CandidateFeed[][] = []

  for (const term of terms) {
    const termResults: CandidateFeed[] = []
    try {
      const res = await fetch(
        `https://api.podcastindex.org/api/1.0/search/byterm?q=${encodeURIComponent(term)}&max=${maxPerTerm}`,
        { headers: authHeaders(apiKey, apiSecret) }
      )
      if (!res.ok) {
        console.error(`Podcast Index search failed for "${term}": ${res.status}`)
        resultsByTerm.push(termResults)
        continue
      }
      const data = (await res.json()) as { feeds: PodcastIndexFeed[] }

      for (const feed of data.feeds ?? []) {
        if (!feed.url) continue
        termResults.push({
          podcastName: feed.title,
          normalizedName: normalizeName(feed.title),
          rssUrl: feed.url,
          websiteUrl: feed.link || null,
          appleUrl: feed.itunesId ? `https://podcasts.apple.com/podcast/id${feed.itunesId}` : null,
          artworkUrl: feed.artwork || feed.image || null,
          sourceNotes: [{ url: 'https://api.podcastindex.org/api/1.0/search/byterm', note: `Podcast Index search: "${term}"` }],
        })
      }
    } catch (err) {
      console.error(`Podcast Index search error for "${term}":`, err)
      // continue with remaining search terms
    }
    resultsByTerm.push(termResults)
  }

  // Round-robin merge across terms, deduplicating by RSS URL as we go.
  const seen = new Set<string>()
  const merged: CandidateFeed[] = []
  const maxLen = Math.max(0, ...resultsByTerm.map(r => r.length))
  for (let i = 0; i < maxLen; i++) {
    for (const termResults of resultsByTerm) {
      const candidate = termResults[i]
      if (!candidate || seen.has(candidate.rssUrl!)) continue
      seen.add(candidate.rssUrl!)
      merged.push(candidate)
    }
  }

  return merged
}
