import crypto from 'node:crypto'
import { sanitizeEnv } from '@/lib/utils'
import type { ArtworkCandidateImage, ArtworkTargetPodcast } from '../types'

// Reuses the exact auth scheme already implemented for the discovery
// pipeline (scripts/discovery/sources/podcastIndex.ts) — see
// https://podcastindex-org.github.io/docs-api/#overview--authentication.
// Deliberately re-implemented here rather than imported: that module lives
// under scripts/ (a standalone-script context) and only exposes a
// term-search helper, not the byfeedid/byfeedurl lookups artwork recovery
// needs. This is the one Podcast Index credential check in the codebase
// that both call sites read from the same PODCASTINDEX_API_KEY/SECRET env vars.
function authHeaders(apiKey: string, apiSecret: string) {
  const now = Math.floor(Date.now() / 1000).toString()
  const hash = crypto.createHash('sha1').update(apiKey + apiSecret + now).digest('hex')
  return {
    'X-Auth-Key': apiKey,
    'X-Auth-Date': now,
    Authorization: hash,
    'User-Agent': 'ListenTrueCrime-ArtworkRecovery/1.0',
  }
}

interface PodcastIndexFeed {
  id: number
  title: string
  url: string
  link: string | null
  author: string | null
  ownerName: string | null
  itunesId: number | null
  artwork: string | null
  image: string | null
}

function getCredentials(): { apiKey: string; apiSecret: string } | null {
  const apiKey = process.env.PODCASTINDEX_API_KEY ? sanitizeEnv(process.env.PODCASTINDEX_API_KEY) : undefined
  const apiSecret = process.env.PODCASTINDEX_API_SECRET ? sanitizeEnv(process.env.PODCASTINDEX_API_SECRET) : undefined
  if (!apiKey || !apiSecret) return null
  return { apiKey, apiSecret }
}

function toCandidate(feed: PodcastIndexFeed): ArtworkCandidateImage | null {
  const artworkUrl = feed.artwork || feed.image || null
  if (!artworkUrl) return null
  return {
    url: artworkUrl,
    source: 'podcast_index',
    candidateTitle: feed.title ?? null,
    candidateAuthor: feed.author || feed.ownerName || null,
    candidatePublisher: feed.ownerName ?? null,
    candidateWebsite: feed.link ?? null,
    candidateFeedUrl: feed.url ?? null,
    podcastIndexFeedId: feed.id ?? null,
    appleCollectionId: feed.itunesId ?? null,
  }
}

async function pi<T>(path: string, apiKey: string, apiSecret: string): Promise<T | null> {
  try {
    const res = await fetch(`https://api.podcastindex.org/api/1.0${path}`, { headers: authHeaders(apiKey, apiSecret) })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

/**
 * Resolves Podcast Index candidates for a podcast, preferring the
 * strongest identifier available: cached feed ID, then the podcast's own
 * RSS feed URL, and only falling back to a title/author search when
 * neither is known yet (typically the first-ever recovery run for an
 * older podcast that predates the artwork system).
 */
export async function resolveFromPodcastIndex(podcast: ArtworkTargetPodcast): Promise<ArtworkCandidateImage[]> {
  const creds = getCredentials()
  if (!creds) return []
  const { apiKey, apiSecret } = creds

  if (podcast.podcast_index_feed_id != null) {
    const data = await pi<{ feed: PodcastIndexFeed | null }>(`/podcasts/byfeedid?id=${podcast.podcast_index_feed_id}`, apiKey, apiSecret)
    const candidate = data?.feed ? toCandidate(data.feed) : null
    if (candidate) return [candidate]
  }

  if (podcast.rss_url) {
    const data = await pi<{ feed: PodcastIndexFeed | null }>(`/podcasts/byfeedurl?url=${encodeURIComponent(podcast.rss_url)}`, apiKey, apiSecret)
    const candidate = data?.feed ? toCandidate(data.feed) : null
    if (candidate) return [candidate]
  }

  const term = podcast.host_name ? `${podcast.title} ${podcast.host_name}` : podcast.title
  const data = await pi<{ feeds: PodcastIndexFeed[] }>(`/search/byterm?q=${encodeURIComponent(term)}&max=5`, apiKey, apiSecret)
  return (data?.feeds ?? []).map(toCandidate).filter((c): c is ArtworkCandidateImage => c !== null)
}
