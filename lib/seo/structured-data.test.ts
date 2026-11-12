import { describe, it, expect } from 'vitest'
import { SOCIAL_PROFILES } from './social-profiles'
import { listenActionSchema } from './listen-action'
import { organizationSchema } from '../seo'
import { podcastSeriesSchema, podcastReviewSchema } from './podcast-schema'

describe('Organization.sameAs', () => {
  it('lists only valid, unique https profile URLs', () => {
    expect(SOCIAL_PROFILES.length).toBeGreaterThan(0)
    for (const u of SOCIAL_PROFILES) expect(new URL(u).protocol).toBe('https:')
    expect(new Set(SOCIAL_PROFILES).size).toBe(SOCIAL_PROFILES.length)
    expect(SOCIAL_PROFILES).toContain('https://www.instagram.com/listentruecrime')
  })
  it('is on the shared Organization schema', () => {
    expect(organizationSchema.sameAs).toEqual([...SOCIAL_PROFILES])
  })
})

describe('listenActionSchema', () => {
  it('returns null with no listen URLs, so nothing is invented', () => {
    expect(listenActionSchema([])).toBeNull()
  })
  it('puts Apple Podcasts and Spotify first and keeps real URLs only', () => {
    const a = listenActionSchema([
      { name: 'YouTube', url: 'https://youtube.com/x' },
      { name: 'Spotify', url: 'https://open.spotify.com/show/1' },
      { name: 'Apple Podcasts', url: 'https://podcasts.apple.com/us/podcast/x/id1' },
    ])!
    expect(a['@type']).toBe('ListenAction')
    expect(a.target.map(t => t.name)).toEqual(['Apple Podcasts', 'Spotify', 'YouTube'])
    for (const t of a.target) {
      expect(t['@type']).toBe('EntryPoint')
      expect(t.url).toBe(t.urlTemplate)
      expect(new URL(t.url).protocol).toBe('https:')
    }
  })
  it('drops duplicate URLs', () => {
    const a = listenActionSchema([
      { name: 'Apple Podcasts', url: 'https://podcasts.apple.com/a' },
      { name: 'Apple', url: 'https://podcasts.apple.com/a' },
    ])!
    expect(a.target).toHaveLength(1)
  })
  it('survives JSON round-trip', () => {
    const a = listenActionSchema([{ name: 'Apple Podcasts', url: 'https://podcasts.apple.com/a' }])
    expect(JSON.parse(JSON.stringify(a))).toEqual(a)
  })
})

// A listing like Serial's: the show premiered years before the row was created.
const serialRow = {
  title: 'Serial',
  description: 'Investigative journalism podcast devoting an entire season to one true story.',
  image_url: 'https://x.test/serial.jpg',
  case_types: ['Investigative', 'Courtroom'],
  created_at: '2026-05-31T09:12:44.000Z',
  updated_at: '2026-10-25T18:03:10.000Z',
  rating: null as number | null,
  rating_is_provisional: false,
  quick_verdict: 'Must listen',
  newsletter_worthy_summary: null,
}
const url = 'https://x.test/podcasts/serial'
const author = { name: 'David Stark', url: 'https://x.test/authors/david-stark' }

describe('podcastSeriesSchema', () => {
  it('does not present listing dates as the show’s dates', () => {
    const s = podcastSeriesSchema(serialRow, { url, countryName: 'United States' })
    expect(s['@type']).toBe('PodcastSeries')
    expect(s).not.toHaveProperty('datePublished')
    expect(s).not.toHaveProperty('dateModified')
    expect(JSON.stringify(s)).not.toMatch(/2026-05-31|2026-10-25/)
    expect(s.genre).toEqual(['Investigative', 'Courtroom'])
    expect(s.countryOfOrigin).toEqual({ '@type': 'Country', name: 'United States' })
  })
  it('keeps the aggregateRating gate', () => {
    expect(podcastSeriesSchema(serialRow, { url, ratingCount: 2, overallScore: 9 })).not.toHaveProperty('aggregateRating')
    expect(podcastSeriesSchema(serialRow, { url, ratingCount: 3, overallScore: null })).not.toHaveProperty('aggregateRating')
    expect(podcastSeriesSchema(serialRow, { url, ratingCount: 3, overallScore: 9 }).aggregateRating)
      .toEqual({ '@type': 'AggregateRating', ratingValue: 9, bestRating: 10, worstRating: 1, ratingCount: 3 })
  })
  it('adds a listen action only when one is passed', () => {
    expect(podcastSeriesSchema(serialRow, { url, listenAction: null })).not.toHaveProperty('potentialAction')
    expect(podcastSeriesSchema(serialRow, { url, listenAction: { '@type': 'ListenAction' } }).potentialAction).toEqual({ '@type': 'ListenAction' })
  })
})

describe('podcastReviewSchema', () => {
  it('is omitted without a final editor rating', () => {
    expect(podcastReviewSchema(serialRow, { url, author })).toBeNull()
    expect(podcastReviewSchema({ ...serialRow, rating: 9, rating_is_provisional: true }, { url, author })).toBeNull()
  })
  it('carries the listing dates as Review dates only', () => {
    const r = podcastReviewSchema({ ...serialRow, rating: 9 }, { url, author })!
    expect(r['@type']).toBe('Review')
    expect(r.datePublished).toBe('2026-05-31')
    expect(r.dateModified).toBe('2026-10-25')
    // The reviewed show itself still carries no dates.
    expect(r.itemReviewed).toEqual({ '@type': 'PodcastSeries', name: 'Serial', url })
    expect(r.reviewRating.ratingValue).toBe(9)
  })
})
