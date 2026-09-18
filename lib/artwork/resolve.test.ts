import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { ArtworkCandidateImage } from './types'

const podcastIndexMock = vi.fn<() => Promise<ArtworkCandidateImage[]>>()
const appleMock = vi.fn<() => Promise<ArtworkCandidateImage[]>>()
const rssMock = vi.fn<() => Promise<ArtworkCandidateImage[]>>()
const websiteMock = vi.fn<() => Promise<ArtworkCandidateImage[]>>()

vi.mock('./sources/podcast-index', () => ({ resolveFromPodcastIndex: () => podcastIndexMock() }))
vi.mock('./sources/apple', () => ({ resolveFromApple: () => appleMock() }))
vi.mock('./sources/rss', () => ({ resolveFromRss: () => rssMock() }))
vi.mock('./sources/website', () => ({ resolveFromWebsite: () => websiteMock() }))

// validateArtworkUrl is keyed by URL in these tests: any URL not explicitly
// registered as valid comes back invalid, so unmocked sources are inert.
const validUrls = new Map<string, { width: number; height: number }>()
vi.mock('./validate', () => ({
  validateArtworkUrl: vi.fn(async (url: string) => {
    const dims = validUrls.get(url)
    if (!dims) return { result: { valid: false, reason: 'not a registered test image', contentType: null, byteSize: null, width: null, height: null, isSquare: false }, buffer: null }
    return {
      result: { valid: true, reason: null, contentType: 'image/png', byteSize: 1000, width: dims.width, height: dims.height, isSquare: dims.width === dims.height },
      buffer: Buffer.from('fake'),
    }
  }),
}))

vi.mock('./image-probe', () => ({ probeImage: () => ({ format: 'png', width: 600, height: 600 }) }))
vi.mock('./storage', () => ({ cacheArtwork: vi.fn(async () => ({ url: 'https://project.supabase.co/storage/v1/object/public/podcast-artwork/p1.png?v=1' })) }))

import { resolvePodcastArtwork } from './resolve'

// Title + author + website all matching gives enough corroboration (per
// lib/artwork/match.ts's conservative weights) to clear the auto-accept
// bar — these priority-order tests care about which source wins, not
// about confidence-threshold calibration (see match.test.ts for that).
function candidate(overrides: Partial<ArtworkCandidateImage> = {}): ArtworkCandidateImage {
  return {
    url: 'https://cdn.example.com/default.jpg', source: 'apple', candidateTitle: 'Crime Files', candidateAuthor: 'Jane Doe',
    candidatePublisher: null, candidateWebsite: 'https://crimefiles.example.com', candidateFeedUrl: null,
    podcastIndexFeedId: null, appleCollectionId: null, ...overrides,
  }
}

interface FakeRow {
  id: string
  title: string
  host_name: string | null
  website_url: string | null
  rss_url: string | null
  image_url: string | null
  podcast_index_feed_id: number | null
  apple_collection_id: number | null
  artwork_manual_override: boolean
  artwork_status: string
  artwork_attempts: number
}

function fakeAdmin(row: FakeRow) {
  const updates: Record<string, unknown>[] = []
  const client = {
    from() {
      return {
        select() { return this },
        eq() { return this },
        single: async () => ({ data: row, error: null }),
        update: (fields: Record<string, unknown>) => {
          updates.push(fields)
          Object.assign(row, fields)
          return { eq: async () => ({ error: null }) }
        },
      }
    },
  }
  // A hand-rolled fake covering only the chain resolve.ts actually calls —
  // deliberately not the full SupabaseClient surface.
  return { client: client as unknown as SupabaseClient, updates }
}

function baseRow(overrides: Partial<FakeRow> = {}): FakeRow {
  return {
    id: 'p1', title: 'Crime Files', host_name: 'Jane Doe', website_url: 'https://crimefiles.example.com', rss_url: null, image_url: null,
    podcast_index_feed_id: null, apple_collection_id: null, artwork_manual_override: false,
    artwork_status: 'missing', artwork_attempts: 0, ...overrides,
  }
}

beforeEach(() => {
  podcastIndexMock.mockReset().mockResolvedValue([])
  appleMock.mockReset().mockResolvedValue([])
  rssMock.mockReset().mockResolvedValue([])
  websiteMock.mockReset().mockResolvedValue([])
  validUrls.clear()
})

describe('resolvePodcastArtwork — priority order', () => {
  it('selects Podcast Index when it succeeds, without trying other sources', async () => {
    validUrls.set('https://pi.example.com/art.jpg', { width: 600, height: 600 })
    podcastIndexMock.mockResolvedValue([candidate({ url: 'https://pi.example.com/art.jpg', source: 'podcast_index' })])
    appleMock.mockResolvedValue([candidate({ url: 'https://apple.example.com/art.jpg', source: 'apple' })])

    const { client } = fakeAdmin(baseRow())
    const result = await resolvePodcastArtwork(client, 'p1')

    expect(result.status).toBe('verified')
    expect(result.source).toBe('podcast_index')
    expect(appleMock).not.toHaveBeenCalled()
  })

  it('falls back to Apple when Podcast Index fails', async () => {
    validUrls.set('https://apple.example.com/art.jpg', { width: 600, height: 600 })
    podcastIndexMock.mockRejectedValue(new Error('PI down'))
    appleMock.mockResolvedValue([candidate({ url: 'https://apple.example.com/art.jpg', source: 'apple' })])

    const { client } = fakeAdmin(baseRow())
    const result = await resolvePodcastArtwork(client, 'p1')

    expect(result.status).toBe('verified')
    expect(result.source).toBe('apple')
  })

  it('falls back to RSS when Podcast Index and Apple both fail', async () => {
    validUrls.set('https://rss.example.com/art.jpg', { width: 600, height: 600 })
    podcastIndexMock.mockResolvedValue([])
    appleMock.mockResolvedValue([])
    rssMock.mockResolvedValue([candidate({ url: 'https://rss.example.com/art.jpg', source: 'rss', candidateFeedUrl: 'https://feed.example.com/rss.xml' })])

    const { client } = fakeAdmin(baseRow({ rss_url: 'https://feed.example.com/rss.xml' }))
    const result = await resolvePodcastArtwork(client, 'p1')

    expect(result.status).toBe('verified')
    expect(result.source).toBe('rss')
  })

  it('marks the podcast missing when every source fails and there was no prior artwork', async () => {
    const { client } = fakeAdmin(baseRow())
    const result = await resolvePodcastArtwork(client, 'p1')

    expect(result.status).toBe('missing')
    expect(result.artworkUrl).toBeNull()
  })

  it('sends a weak, uncorroborated candidate to review instead of auto-accepting', async () => {
    validUrls.set('https://apple.example.com/weak.jpg', { width: 600, height: 600 })
    // Title matches exactly (40 pts) with only a partial author overlap
    // (~17.5 pts) and no website match — clears the "worth surfacing" floor
    // but not the medium/high auto-accept bar (see match.test.ts).
    appleMock.mockResolvedValue([candidate({
      url: 'https://apple.example.com/weak.jpg', source: 'apple', candidateTitle: 'Crime Files',
      candidateAuthor: 'Doe', candidateWebsite: null,
    })])

    const { client } = fakeAdmin(baseRow({ website_url: null }))
    const result = await resolvePodcastArtwork(client, 'p1')

    expect(result.status).toBe('needs_review')
  })
})

describe('resolvePodcastArtwork — protecting existing/manual artwork', () => {
  it('never touches a podcast with artwork_manual_override set', async () => {
    const { client, updates } = fakeAdmin(baseRow({
      image_url: 'https://existing.example.com/art.jpg', artwork_manual_override: true, artwork_status: 'verified',
    }))
    const result = await resolvePodcastArtwork(client, 'p1')

    expect(result.source).toBe('manual')
    expect(updates).toHaveLength(0)
    expect(podcastIndexMock).not.toHaveBeenCalled()
  })

  it('leaves already-verified existing artwork alone without re-checking sources', async () => {
    const { client } = fakeAdmin(baseRow({ image_url: 'https://existing.example.com/art.jpg', artwork_status: 'verified' }))
    const result = await resolvePodcastArtwork(client, 'p1')

    expect(result.status).toBe('verified')
    expect(result.artworkUrl).toBe('https://existing.example.com/art.jpg')
    expect(podcastIndexMock).not.toHaveBeenCalled()
  })

  it('validates existing non-verified artwork and keeps it if it is genuinely a good image, without searching other sources', async () => {
    validUrls.set('https://existing.example.com/art.jpg', { width: 600, height: 600 })
    const { client } = fakeAdmin(baseRow({ image_url: 'https://existing.example.com/art.jpg', artwork_status: 'missing' }))
    const result = await resolvePodcastArtwork(client, 'p1')

    expect(result.status).toBe('verified')
    expect(result.artworkUrl).toBe('https://existing.example.com/art.jpg')
    expect(podcastIndexMock).not.toHaveBeenCalled()
  })

  it('attempts recovery when existing artwork is broken (fails validation)', async () => {
    validUrls.set('https://pi.example.com/replacement.jpg', { width: 600, height: 600 })
    podcastIndexMock.mockResolvedValue([candidate({ url: 'https://pi.example.com/replacement.jpg', source: 'podcast_index' })])

    const { client } = fakeAdmin(baseRow({ image_url: 'https://broken.example.com/404.jpg', artwork_status: 'missing' }))
    const result = await resolvePodcastArtwork(client, 'p1')

    expect(podcastIndexMock).toHaveBeenCalled()
    expect(result.status).toBe('verified')
    expect(result.source).toBe('podcast_index')
  })
})
