import { MIN_RATINGS_FOR_SCHEMA } from '@/lib/rating-stats'

// Rating markup for /podcasts/[slug], checked against Google's review snippet
// guidelines (Nov 2026):
// - PodcastSeries is a subtype of CreativeWorkSeries, which Google accepts.
// - The editor's Review is nested in the PodcastSeries as `review`, so Google
//   sees one item with one review, not two unlinked entities. Nested reviews
//   omit itemReviewed.
// - Values match what the page shows (one decimal place) and only appear when
//   that rating is visible on the page.
// - Nothing is emitted from binge_factor: it measures how bingeable a show is,
//   not a review score. Until 25 Oct 2026 it was marked up as the review rating,
//   which is where the old star snippets came from.

export interface PodcastRatingInput {
  rating: number | null
  rating_is_provisional: boolean | null
  newsletter_worthy_summary: string | null
  created_at: string | null
  updated_at: string | null
  avg_overall: number | null
  rating_count: number
}

const oneDp = (n: number) => Math.round(n * 10) / 10

export function podcastRatingSchema(p: PodcastRatingInput, author: { name: string; url: string }) {
  const out: Record<string, unknown> = {}

  if (p.avg_overall != null && p.rating_count >= MIN_RATINGS_FOR_SCHEMA) {
    out.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: oneDp(p.avg_overall),
      bestRating: 10,
      worstRating: 1,
      ratingCount: p.rating_count,
    }
  }

  if (p.rating != null && !p.rating_is_provisional) {
    out.review = {
      '@type': 'Review',
      author: { '@type': 'Person', name: author.name, url: author.url },
      reviewRating: {
        '@type': 'Rating',
        ratingValue: oneDp(Number(p.rating)),
        bestRating: 10,
        worstRating: 0,
      },
      ...(p.newsletter_worthy_summary && { reviewBody: p.newsletter_worthy_summary }),
      ...(p.created_at && { datePublished: p.created_at.split('T')[0] }),
      ...(p.updated_at && { dateModified: p.updated_at.split('T')[0] }),
    }
  }

  return out
}
