import { assertSafeExternalUrl } from '../ssrf'
import { FETCH_TIMEOUT_MS } from '../types'
import type { ArtworkCandidateImage, ArtworkTargetPodcast } from '../types'

const MAX_HTML_BYTES = 2 * 1024 * 1024 // HTML page, not the image itself — well under the image byte cap

function resolveUrl(candidate: string, base: string): string | null {
  try {
    return new URL(candidate, base).toString()
  } catch {
    return null
  }
}

/** Extracts a meta tag's content by property/name, tolerant of attribute order. */
function extractMeta(html: string, key: 'og:image' | 'twitter:image'): string | null {
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${key}["']`, 'i'),
  ]
  for (const re of patterns) {
    const match = html.match(re)
    if (match?.[1]) return match[1]
  }
  return null
}

/** Extracts the first "image" field from an inline JSON-LD block, if present — a common site of a legitimate, deliberate artwork/logo declaration. */
function extractJsonLdImage(html: string): string | null {
  const blocks = Array.from(html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi))
  for (const block of blocks) {
    try {
      const parsed = JSON.parse(block[1].trim())
      const nodes = Array.isArray(parsed) ? parsed : [parsed]
      for (const node of nodes) {
        const image = node?.image
        if (typeof image === 'string') return image
        if (Array.isArray(image) && typeof image[0] === 'string') return image[0]
        if (typeof image?.url === 'string') return image.url
      }
    } catch {
      // malformed JSON-LD on a third-party page — ignore and keep looking
    }
  }
  return null
}

/**
 * Fetches the podcast's official website and looks for a deliberate
 * artwork/logo declaration — og:image, twitter:image, then JSON-LD image —
 * never a generic scrape of the first <img> tag on the page, which is far
 * too likely to be an unrelated header/hero photo rather than podcast art.
 * This is the lowest-confidence automated source: it always needs strong
 * corroboration (title/author match) to be accepted, never on its own.
 */
export async function resolveFromWebsite(podcast: ArtworkTargetPodcast): Promise<ArtworkCandidateImage[]> {
  if (!podcast.website_url) return []

  const safety = await assertSafeExternalUrl(podcast.website_url)
  if (!safety.safe) return []

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  let html: string
  try {
    const res = await fetch(podcast.website_url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'ListenTrueCrime-ArtworkRecovery/1.0' },
    })
    if (!res.ok || !res.body) return []

    const contentType = res.headers.get('content-type') ?? ''
    if (!contentType.includes('text/html')) return []

    const chunks: Uint8Array[] = []
    let total = 0
    for await (const chunk of res.body as unknown as AsyncIterable<Uint8Array>) {
      total += chunk.length
      if (total > MAX_HTML_BYTES) break
      chunks.push(chunk)
    }
    html = Buffer.concat(chunks).toString('utf-8')
  } catch (err) {
    console.error(`Website fetch failed for ${podcast.website_url}:`, err instanceof Error ? err.message : err)
    return []
  } finally {
    clearTimeout(timeout)
  }

  const raw = extractMeta(html, 'og:image') ?? extractMeta(html, 'twitter:image') ?? extractJsonLdImage(html)
  if (!raw) return []

  const artworkUrl = resolveUrl(raw, podcast.website_url)
  if (!artworkUrl) return []

  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)

  return [{
    url: artworkUrl,
    source: 'website',
    candidateTitle: titleMatch?.[1]?.trim() ?? null,
    candidateAuthor: null,
    candidatePublisher: null,
    candidateWebsite: podcast.website_url,
    candidateFeedUrl: null,
    podcastIndexFeedId: null,
    appleCollectionId: null,
  }]
}
