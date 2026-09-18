// ============================================================
// Podcast Artwork Recovery — shared types
// ============================================================

export type ArtworkSource = 'existing' | 'podcast_index' | 'apple' | 'rss' | 'website' | 'manual' | 'placeholder'

export type ArtworkStatus = 'verified' | 'found' | 'needs_review' | 'missing' | 'failed' | 'skipped'

export type ArtworkConfidence = 'high' | 'medium' | 'low'

/** Minimal shape of the podcast row artwork resolution needs to read/compare against. */
export interface ArtworkTargetPodcast {
  id: string
  title: string
  host_name: string | null
  website_url: string | null
  rss_url: string | null
  image_url: string | null
  podcast_index_feed_id: number | null
  apple_collection_id: number | null
  artwork_manual_override: boolean
  artwork_status: ArtworkStatus
  artwork_attempts: number
}

/** A candidate artwork image found from one source, not yet accepted. */
export interface ArtworkCandidateImage {
  url: string
  source: ArtworkSource
  /** Metadata about the podcast the candidate image was found attached to — used for matching. */
  candidateTitle: string | null
  candidateAuthor: string | null
  candidatePublisher: string | null
  candidateWebsite: string | null
  candidateFeedUrl: string | null
  podcastIndexFeedId: number | null
  appleCollectionId: number | null
}

export interface MatchResult {
  match: boolean
  confidence: ArtworkConfidence | null
  score: number
  reasons: string[]
}

/** Persisted shape of podcasts.artwork_candidate — a pending needs_review candidate. */
export interface StoredArtworkCandidate {
  url: string
  originalUrl: string
  source: ArtworkSource
  confidence: ArtworkConfidence
  score: number
  reasons: string[]
  candidateTitle: string | null
  candidateAuthor: string | null
  candidatePublisher: string | null
  foundAt: string
}

export interface ScoredCandidate {
  candidate: ArtworkCandidateImage
  match: MatchResult
  /** Image dimensions/format validation result for this candidate's URL. */
  validation: ImageValidationResult
}

export interface ImageValidationResult {
  valid: boolean
  reason: string | null
  contentType: string | null
  byteSize: number | null
  width: number | null
  height: number | null
  isSquare: boolean
}

export interface ArtworkResolutionResult {
  podcastId: string
  status: ArtworkStatus
  artworkUrl: string | null
  source: ArtworkSource | null
  confidence: ArtworkConfidence | null
  score: number | null
  reasons: string[]
  candidates: ScoredCandidate[]
  error: string | null
}

export const CONFIDENCE_THRESHOLDS = {
  high: 90,
  medium: 75,
} as const

export const DEFAULT_RECOVERY_CONCURRENCY = 5
export const MAX_ARTWORK_ATTEMPTS = 5
export const MAX_DOWNLOAD_BYTES = 8 * 1024 * 1024 // 8MB, matches storage bucket file_size_limit
export const FETCH_TIMEOUT_MS = 10_000
export const MIN_ACCEPTABLE_DIMENSION = 300
export const PREFERRED_DIMENSION = 600
