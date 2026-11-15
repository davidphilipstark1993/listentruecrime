import { describe, it, expect } from 'vitest'
import { podcastRatingSchema, type PodcastRatingInput } from './podcast-rating-schema'

const author = { name: 'David Stark', url: 'https://www.listentruecrime.com/authors/david-stark' }
const base: PodcastRatingInput = {
  rating: null, rating_is_provisional: null, newsletter_worthy_summary: null,
  created_at: '2026-06-01T00:00:00Z', updated_at: '2026-11-01T00:00:00Z', avg_overall: null, rating_count: 0,
}

describe('podcastRatingSchema', () => {
  it('emits nothing without real ratings', () => {
    expect(podcastRatingSchema(base, author)).toEqual({})
    expect(podcastRatingSchema({ ...base, avg_overall: 7, rating_count: 2 }, author)).toEqual({})
  })

  it('emits no review for a provisional editor rating', () => {
    expect(podcastRatingSchema({ ...base, rating: 8, rating_is_provisional: true }, author)).toEqual({})
  })

  it('rounds the aggregate to match the page and keeps the count', () => {
    const s = podcastRatingSchema({ ...base, avg_overall: 7.3333, rating_count: 3 }, author)
    expect(s.aggregateRating).toEqual({ '@type': 'AggregateRating', ratingValue: 7.3, bestRating: 10, worstRating: 1, ratingCount: 3 })
  })

  it('nests the editor review without itemReviewed, with the required fields', () => {
    const s = podcastRatingSchema({ ...base, rating: 8.5, rating_is_provisional: false, newsletter_worthy_summary: 'Gripping.' }, author)
    const r = s.review as Record<string, any>
    expect(r['@type']).toBe('Review')
    expect(r.itemReviewed).toBeUndefined()
    expect(r.author.name).toBe('David Stark')
    expect(r.reviewRating).toMatchObject({ ratingValue: 8.5, bestRating: 10, worstRating: 0 })
    expect(r.reviewBody).toBe('Gripping.')
    expect(r.datePublished).toBe('2026-06-01')
  })
})
