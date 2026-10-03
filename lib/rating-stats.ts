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
