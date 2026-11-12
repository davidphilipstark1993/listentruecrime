// JSON-LD for a podcast page: the show (PodcastSeries) and our editorial Review.
// Pure builders, so the gates and the date rules can be unit-tested.
import { MIN_RATINGS_FOR_SCHEMA } from '@/lib/rating-stats'

interface SeriesSource {
  title: string
  description?: string | null
  image_url?: string | null
  case_types?: string[] | null
}

interface SeriesOptions {
  url: string
  countryName?: string | null
  listenAction?: unknown
  ratingCount?: number
  overallScore?: number | null
}

export function podcastSeriesSchema(podcast: SeriesSource, o: SeriesOptions) {
  const ratingCount = o.ratingCount ?? 0
  return {
    '@context': 'https://schema.org',
    '@type': 'PodcastSeries',
    name: podcast.title,
    description: podcast.description,
    image: podcast.image_url,
    url: o.url,
    inLanguage: 'en',
    // No datePublished/dateModified here: on a PodcastSeries they describe the show, and
    // the only dates on the record are when our listing was created and last edited. We
    // do not store a premiere date, so the properties are omitted rather than wrong.
    ...(podcast.case_types?.length && { genre: podcast.case_types }),
    ...(o.countryName && { countryOfOrigin: { '@type': 'Country', name: o.countryName } }),
    // ListenAction targets are the real, editor-entered listen URLs only
    ...(o.listenAction ? { potentialAction: o.listenAction } : {}),
    // Only emit aggregateRating once there is a meaningful number of community ratings
    ...(ratingCount >= MIN_RATINGS_FOR_SCHEMA && o.overallScore != null && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: o.overallScore,
        bestRating: 10,
        worstRating: 1,
        ratingCount,
      },
    }),
  }
}

interface ReviewSource {
  title: string
  rating?: number | null
  rating_is_provisional?: boolean | null
  quick_verdict?: string | null
  newsletter_worthy_summary?: string | null
  created_at?: string | null
  updated_at?: string | null
}

/** A Review needs a real, final editor rating: null when no rating is entered or it is provisional. */
export function podcastReviewSchema(podcast: ReviewSource, o: { url: string; author: { name: string; url: string } }) {
  if (podcast.rating == null || podcast.rating_is_provisional) return null
  return {
    '@context': 'https://schema.org',
    '@type': 'Review',
    itemReviewed: { '@type': 'PodcastSeries', name: podcast.title, url: o.url },
    author: { '@type': 'Person', name: o.author.name, url: o.author.url },
    reviewRating: {
      '@type': 'Rating',
      ratingValue: podcast.rating,
      bestRating: 10,
      worstRating: 0,
      name: 'Editorial rating',
      ...(podcast.quick_verdict && { description: podcast.quick_verdict }),
    },
    ...(podcast.newsletter_worthy_summary && { reviewBody: podcast.newsletter_worthy_summary }),
    // These are Review properties: when our review was first published and last edited.
    datePublished: podcast.created_at?.split('T')[0],
    dateModified: podcast.updated_at?.split('T')[0],
  }
}
