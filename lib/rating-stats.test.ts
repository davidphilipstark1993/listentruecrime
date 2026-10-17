import { describe, expect, it } from 'vitest'
import { communityRatingOf, editorScoreOf, formatScore, MIN_COMMUNITY_RATINGS, ratingStatsOf } from './rating-stats'

describe('ratingStatsOf', () => {
  it('unwraps the array PostgREST returns for the view embed', () => {
    expect(ratingStatsOf([{ rating_count: 2 }])).toEqual({ rating_count: 2 })
    expect(ratingStatsOf([])).toBeNull()
    expect(ratingStatsOf(null)).toBeNull()
  })
})

describe('communityRatingOf', () => {
  it('hides a single rating', () => {
    expect(communityRatingOf({ avg_overall: 9, rating_count: 1 })).toBeNull()
  })

  it('hides one rating below the threshold', () => {
    expect(communityRatingOf({ avg_overall: 8.2, rating_count: MIN_COMMUNITY_RATINGS - 1 })).toBeNull()
  })

  it('shows the average at exactly the threshold', () => {
    const result = communityRatingOf([{ avg_overall: 8.2, rating_count: MIN_COMMUNITY_RATINGS }])
    expect(result?.average).toBe(8.2)
    expect(result?.count).toBe(MIN_COMMUNITY_RATINGS)
  })

  it('hides a missing average even when the count is high', () => {
    expect(communityRatingOf({ avg_overall: null, rating_count: 40 })).toBeNull()
  })

  it('returns null when there are no stats at all', () => {
    expect(communityRatingOf(null)).toBeNull()
    expect(communityRatingOf(undefined)).toBeNull()
  })
})

describe('editorScoreOf', () => {
  it('reads binge_factor, the stored editorial score', () => {
    expect(editorScoreOf({ binge_factor: 9 })).toBe(9)
  })

  it('is null when unscored', () => {
    expect(editorScoreOf({ binge_factor: null })).toBeNull()
    expect(editorScoreOf({ binge_factor: undefined })).toBeNull()
  })
})

describe('formatScore', () => {
  it('drops a trailing .0', () => {
    expect(formatScore(9)).toBe('9')
    expect(formatScore(8.5)).toBe('8.5')
  })
})
