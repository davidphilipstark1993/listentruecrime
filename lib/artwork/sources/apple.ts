import type { ArtworkCandidateImage, ArtworkTargetPodcast } from '../types'

interface ItunesResult {
  collectionId: number
  collectionName: string
  artistName: string | null
  artworkUrl600: string | null
  feedUrl: string | null
  collectionViewUrl: string | null
}

function toCandidate(r: ItunesResult): ArtworkCandidateImage | null {
  if (!r.artworkUrl600) return null
  // Apple serves square artwork at requested resolutions by rewriting the
  // filename segment — request the largest commonly available size instead
  // of trusting whatever size artworkUrl600 happens to be.
  const url = r.artworkUrl600.replace(/\/\d+x\d+bb\.(jpg|png)$/, '/1200x1200bb.$1')
  return {
    url,
    source: 'apple',
    candidateTitle: r.collectionName ?? null,
    candidateAuthor: r.artistName ?? null,
    candidatePublisher: r.artistName ?? null,
    candidateWebsite: null,
    candidateFeedUrl: r.feedUrl ?? null,
    podcastIndexFeedId: null,
    appleCollectionId: r.collectionId ?? null,
  }
}

async function search(term: string): Promise<ItunesResult[]> {
  try {
    const res = await fetch(`https://itunes.apple.com/search?media=podcast&limit=5&term=${encodeURIComponent(term)}`, {
      headers: { 'User-Agent': 'ListenTrueCrime-ArtworkRecovery/1.0' },
    })
    if (!res.ok) return []
    const data = (await res.json()) as { results: ItunesResult[] }
    return data.results ?? []
  } catch {
    return []
  }
}

/**
 * Searches Apple Podcasts across three progressively narrower angles —
 * title+author, title alone, title+publisher — per the codebase's existing
 * iTunes enrichment pattern (scripts/discovery/sources/itunes.ts), but
 * returns every result as an unaccepted candidate instead of picking the
 * first/best-guess match: matchPodcast() in the caller does the actual
 * accept/reject decision, conservatively, against all of them.
 */
export async function resolveFromApple(podcast: ArtworkTargetPodcast): Promise<ArtworkCandidateImage[]> {
  const collected = new Map<number, ArtworkCandidateImage>()

  const addAll = (results: ItunesResult[]) => {
    for (const r of results) {
      const candidate = toCandidate(r)
      if (candidate && candidate.appleCollectionId != null && !collected.has(candidate.appleCollectionId)) {
        collected.set(candidate.appleCollectionId, candidate)
      }
    }
  }

  if (podcast.apple_collection_id != null) {
    const byId = await search(String(podcast.apple_collection_id))
    addAll(byId.filter(r => r.collectionId === podcast.apple_collection_id))
    if (collected.size) return Array.from(collected.values())
  }

  if (podcast.host_name) addAll(await search(`${podcast.title} ${podcast.host_name}`))
  addAll(await search(podcast.title))

  return Array.from(collected.values()).slice(0, 8)
}
