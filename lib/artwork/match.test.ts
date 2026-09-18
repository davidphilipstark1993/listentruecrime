import { describe, it, expect } from 'vitest'
import { matchPodcast } from './match'
import type { ArtworkCandidateImage, ArtworkTargetPodcast } from './types'

function podcast(overrides: Partial<ArtworkTargetPodcast> = {}): ArtworkTargetPodcast {
  return {
    id: 'p1', title: 'Crime Files', host_name: 'Jane Doe', website_url: 'https://crimefiles.example.com',
    rss_url: null, image_url: null, podcast_index_feed_id: null, apple_collection_id: null,
    artwork_manual_override: false, artwork_status: 'missing', artwork_attempts: 0, ...overrides,
  }
}

function candidate(overrides: Partial<ArtworkCandidateImage> = {}): ArtworkCandidateImage {
  return {
    url: 'https://cdn.example.com/art.jpg', source: 'apple', candidateTitle: 'Crime Files', candidateAuthor: 'Jane Doe',
    candidatePublisher: null, candidateWebsite: 'https://crimefiles.example.com', candidateFeedUrl: null,
    podcastIndexFeedId: null, appleCollectionId: null, ...overrides,
  }
}

describe('matchPodcast — title handling', () => {
  it('scores an exact title+author+website match as medium-or-higher, auto-acceptable confidence', () => {
    const result = matchPodcast(candidate(), podcast())
    expect(['medium', 'high']).toContain(result.confidence)
    expect(result.match).toBe(true)
  })

  it('treats "The X Podcast" and "X" as equivalent (prefix/suffix stripping)', () => {
    const result = matchPodcast(candidate({ candidateTitle: 'The Crime Files Podcast' }), podcast({ title: 'Crime Files' }))
    expect(['medium', 'high']).toContain(result.confidence)
  })

  it('handles punctuation, apostrophes, and ampersands', () => {
    const result = matchPodcast(candidate({ candidateTitle: 'Crime & Punishment' }), podcast({ title: 'Crime and Punishment!' }))
    // Title itself matches fully; author/website don't correspond to this different show name, only re-checking the normalization behaves — score independently below.
    expect(result.score).toBeGreaterThanOrEqual(65)
  })

  it('does NOT treat "Crime Stories" and "Crime Stories Daily" as the same show', () => {
    const result = matchPodcast(
      candidate({ candidateTitle: 'Crime Stories', candidateAuthor: 'Jane Doe' }),
      podcast({ title: 'Crime Stories Daily' })
    )
    expect(result.match).toBe(false)
  })

  it('title + author alone (no website/publisher/identifier corroboration) is conservative — not high confidence', () => {
    // Real-world case: only title+author available (max 65/100 by design)
    // — a deliberately conservative cap so a title+author coincidence alone
    // never silently auto-assigns artwork without a third corroborating
    // signal (website, publisher, or a strong identifier).
    const result = matchPodcast(
      candidate({ candidateWebsite: null }),
      podcast({ website_url: null })
    )
    expect(result.confidence).not.toBe('high')
    expect(result.match).toBe(false)
  })

  it('does not match on author alone when titles are unrelated', () => {
    const result = matchPodcast(
      candidate({ candidateTitle: 'Totally Different Show', candidateAuthor: 'Jane Doe', candidateWebsite: null }),
      podcast({ title: 'Crime Files', host_name: 'Jane Doe', website_url: null })
    )
    expect(result.match).toBe(false)
  })

  it('does not auto-accept a duplicate-name show ("True Crime Weekly" vs "True Crime Weekly UK") without corroboration', () => {
    const result = matchPodcast(
      candidate({ candidateTitle: 'True Crime Weekly UK', candidateAuthor: null, candidateWebsite: null }),
      podcast({ title: 'True Crime Weekly', host_name: null, website_url: null })
    )
    expect(result.match).toBe(false)
  })
})

describe('matchPodcast — strong identifiers', () => {
  it('auto-accepts on an identical Podcast Index feed ID regardless of title', () => {
    const result = matchPodcast(
      candidate({ candidateTitle: 'Totally Unrelated Name', candidateWebsite: null, podcastIndexFeedId: 42 }),
      podcast({ title: 'Crime Files', website_url: null, podcast_index_feed_id: 42 })
    )
    expect(result.confidence).toBe('high')
    expect(result.score).toBe(100)
  })

  it('auto-accepts on an identical Apple collection ID', () => {
    const result = matchPodcast(
      candidate({ candidateWebsite: null, appleCollectionId: 999 }),
      podcast({ website_url: null, apple_collection_id: 999 })
    )
    expect(result.confidence).toBe('high')
  })

  it('auto-accepts on an identical RSS feed URL', () => {
    const result = matchPodcast(
      candidate({ candidateWebsite: null, candidateFeedUrl: 'https://feeds.example.com/show.xml' }),
      podcast({ website_url: null, rss_url: 'https://feeds.example.com/show.xml' })
    )
    expect(result.confidence).toBe('high')
  })
})

describe('matchPodcast — medium confidence requires corroboration', () => {
  it('reaches medium/high confidence when title, author, and website all support it together', () => {
    const result = matchPodcast(
      candidate({ candidateTitle: 'The Crime Files Show', candidateAuthor: 'Jane Doe', candidateWebsite: 'https://crimefiles.example.com' }),
      podcast({ title: 'Crime Files', host_name: 'Jane Doe', website_url: 'https://crimefiles.example.com' })
    )
    expect(['medium', 'high']).toContain(result.confidence)
    expect(result.match).toBe(true)
  })

  it('does not auto-accept a weak, uncorroborated title-similarity-only score', () => {
    const result = matchPodcast(
      candidate({ candidateTitle: 'Crime Filez', candidateAuthor: null, candidateWebsite: null }),
      podcast({ title: 'Crime Files', host_name: null, website_url: null })
    )
    expect(result.match).toBe(false)
  })
})
