import Parser from 'rss-parser'
import type { ArtworkCandidateImage, ArtworkTargetPodcast } from '../types'

// Podcast Index / Podcasting 2.0's <podcast:image> and the itunes namespace's
// <itunes:image href="..."/> aren't covered by rss-parser's built-in field
// set the way lib/discovery/rss.ts's plain description/author fields are,
// so they're requested explicitly here, mirroring that module's pattern
// for feed-level custom fields (bracket notation — colons aren't valid
// identifier characters).
interface FeedFields {
  'itunes:image'?: unknown
  'podcast:image'?: unknown
  'itunes:author'?: string
  image?: { url?: string }
}

const parser = new Parser<FeedFields>({
  customFields: { feed: ['itunes:image', 'podcast:image', 'itunes:author'] },
})

/** rss-parser (xml2js under the hood) represents an attribute-only tag like <itunes:image href="..."/> as { $: { href } } or, for some feeds, as a bare string. */
function extractHref(value: unknown, attr: 'href' | 'url' = 'href'): string | null {
  if (!value) return null
  if (typeof value === 'string') return value
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>
    const attrs = obj.$ as Record<string, unknown> | undefined
    if (attrs && typeof attrs[attr] === 'string') return attrs[attr] as string
    if (typeof obj[attr] === 'string') return obj[attr] as string
  }
  return null
}

/**
 * Parses a podcast's own RSS feed for its cover artwork, checking (in
 * order) the itunes:image tag, the Podcasting 2.0 podcast:image tag, and
 * the standard RSS channel <image> element. This is a first-party source —
 * artwork found here belongs to whichever feed URL it was fetched from, so
 * the match against the target podcast is scored primarily on the feed URL
 * itself rather than fuzzy title comparison (see resolve.ts).
 */
export async function resolveFromRss(podcast: ArtworkTargetPodcast): Promise<ArtworkCandidateImage[]> {
  if (!podcast.rss_url) return []

  try {
    const feed = await parser.parseURL(podcast.rss_url)

    const artworkUrl =
      extractHref(feed['itunes:image']) ??
      extractHref(feed['podcast:image']) ??
      feed.image?.url ??
      null

    if (!artworkUrl) return []

    return [{
      url: artworkUrl,
      source: 'rss',
      candidateTitle: feed.title ?? null,
      candidateAuthor: feed['itunes:author'] ?? null,
      candidatePublisher: null,
      candidateWebsite: feed.link ?? null,
      candidateFeedUrl: podcast.rss_url,
      podcastIndexFeedId: null,
      appleCollectionId: null,
    }]
  } catch (err) {
    console.error(`RSS artwork fetch failed for ${podcast.rss_url}:`, err instanceof Error ? err.message : err)
    return []
  }
}
