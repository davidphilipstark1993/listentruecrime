import type { RatingStats } from '@/lib/types/database'

/**
 * `podcasts?select=*,rating_stats:podcast_rating_stats(*)` returns
 * rating_stats as an ARRAY: PostgREST sees podcast_rating_stats.podcast_id
 * as a many-to-one reference to podcasts and can't tell the view has at
 * most one row per podcast. Every reader treated it as a single object, so
 * community ratings never showed anywhere. Accept either shape.
 */
export function ratingStatsOf<T extends Partial<RatingStats>>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

/**
 * A community average built from one or two votes is noise, not a rating —
 * below this many user ratings the site shows "Not enough ratings yet" and
 * emits no AggregateRating schema.
 */
export const MIN_COMMUNITY_RATINGS = 5

export const NOT_ENOUGH_RATINGS_LABEL = 'Not enough ratings yet'

/**
 * The community average, or null while there are fewer than
 * MIN_COMMUNITY_RATINGS user ratings. Every surface that shows a community
 * score, or builds AggregateRating, must go through this.
 */
export function communityRatingOf<T extends Partial<RatingStats>>(
  value: T | T[] | null | undefined
): { stats: T; average: number; count: number } | null {
  const stats = ratingStatsOf(value)
  if (!stats) return null
  const count = stats.rating_count ?? 0
  const average = stats.avg_overall
  if (average == null || count < MIN_COMMUNITY_RATINGS) return null
  return { stats, average, count }
}

/**
 * The editorial score: the reviewer's own 1–10 score. `binge_factor` is the
 * only numeric editorial score stored on a podcast today (it is also what
 * the Review schema has always used as its ratingValue).
 */
export function editorScoreOf(podcast: { binge_factor: number | null | undefined }): number | null {
  const score = podcast.binge_factor
  return score == null || Number.isNaN(Number(score)) ? null : Number(score)
}

/** "7", "7.5" — editorial scores are shown without a trailing ".0". */
export function formatScore(score: number): string {
  return Number.isInteger(score) ? String(score) : score.toFixed(1)
}
