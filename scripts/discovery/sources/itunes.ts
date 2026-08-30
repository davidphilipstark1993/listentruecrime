interface ItunesResult {
  collectionId: number
  collectionName: string
  artworkUrl600: string | null
  trackCount: number | null
  feedUrl: string | null
  collectionViewUrl: string | null
  primaryGenreName: string | null
  releaseDate: string | null
}

export interface ItunesEnrichment {
  appleUrl: string | null
  artworkUrl: string | null
  episodeCountApprox: number | null
  genre: string | null
  releaseDate: string | null
  feedUrl: string | null
}

// Public endpoint, no API key required. Used only to enrich (artwork, genre,
// approximate episode count) — never as the primary source of factual claims.
export async function enrichFromItunes(podcastName: string): Promise<ItunesEnrichment | null> {
  try {
    const res = await fetch(
      `https://itunes.apple.com/search?media=podcast&limit=3&term=${encodeURIComponent(podcastName)}`
    )
    if (!res.ok) return null
    const data = (await res.json()) as { results: ItunesResult[] }
    const match = data.results?.find(
      r => r.collectionName?.toLowerCase().trim() === podcastName.toLowerCase().trim()
    ) ?? data.results?.[0]
    if (!match) return null

    return {
      appleUrl: match.collectionViewUrl ?? null,
      artworkUrl: match.artworkUrl600 ?? null,
      episodeCountApprox: match.trackCount ?? null,
      genre: match.primaryGenreName ?? null,
      releaseDate: match.releaseDate ?? null,
      feedUrl: match.feedUrl ?? null,
    }
  } catch (err) {
    console.error(`iTunes enrichment error for "${podcastName}":`, err)
    return null
  }
}
