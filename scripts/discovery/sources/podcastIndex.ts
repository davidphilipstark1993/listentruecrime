import crypto from 'node:crypto'
import { normalizeName } from '../normalize'
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

const SEARCH_TERMS = ['true crime', 'murder mystery', 'cold case', 'unsolved murder', 'serial killer']

export async function searchPodcastIndex(): Promise<CandidateFeed[]> {
  const apiKey = process.env.PODCASTINDEX_API_KEY
  const apiSecret = process.env.PODCASTINDEX_API_SECRET
  if (!apiKey || !apiSecret) {
    console.warn('PODCASTINDEX_API_KEY/PODCASTINDEX_API_SECRET not set — skipping Podcast Index search')
    return []
  }

  const seen = new Map<string, CandidateFeed>()

  for (const term of SEARCH_TERMS) {
    try {
      const res = await fetch(
        `https://api.podcastindex.org/api/1.0/search/byterm?q=${encodeURIComponent(term)}&max=40`,
        { headers: authHeaders(apiKey, apiSecret) }
      )
      if (!res.ok) {
        console.error(`Podcast Index search failed for "${term}": ${res.status}`)
        continue
      }
      const data = (await res.json()) as { feeds: PodcastIndexFeed[] }

      for (const feed of data.feeds ?? []) {
        if (!feed.url || seen.has(feed.url)) continue
        seen.set(feed.url, {
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
  }

  return Array.from(seen.values())
}
