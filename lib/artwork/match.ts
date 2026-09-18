import { normalizeTitleForMatch, titleSimilarity } from './normalize-title'
import type { ArtworkCandidateImage, ArtworkTargetPodcast, MatchResult } from './types'
import { CONFIDENCE_THRESHOLDS } from './types'

const TITLE_POINTS = 40
const AUTHOR_POINTS = 25
const PUBLISHER_POINTS = 15
const WEBSITE_POINTS = 10
const FEED_POINTS = 10

// Below this, a candidate isn't even worth surfacing for manual review —
// it's not the same show. Set to exactly TITLE_POINTS (not higher): many
// catalog rows have no host_name/website_url on file, so a genuine exact
// title match is often the ONLY signal available — it must still be able
// to surface for a human to approve, even though title alone can never
// auto-accept (see CONFIDENCE_THRESHOLDS).
export const MIN_SCORE_TO_SURFACE = TITLE_POINTS

function normalizeUrl(url: string): string {
  return url.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/+$/, '')
}

function domainOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

function tokens(str: string): string[] {
  return str.split(/\s+/).filter(Boolean)
}

/**
 * Scores title similarity conservatively: an exact match after
 * normalization scores full marks; a title that's a strict subset of the
 * other's words (e.g. "Crime Files" inside "The Crime Files Podcast")
 * scores well only when the overlap covers most of the shorter title —
 * "Crime Stories" is NOT treated as matching "Crime Stories Daily", since
 * "daily" is a real extra word, not stylistic noise.
 */
function scoreTitles(a: string, b: string): { points: number; reason: string | null } {
  const normA = normalizeTitleForMatch(a)
  const normB = normalizeTitleForMatch(b)
  if (!normA || !normB) return { points: 0, reason: null }

  if (normA === normB) return { points: TITLE_POINTS, reason: 'Podcast title matched' }

  const tokensA = tokens(normA)
  const tokensB = tokens(normB)
  const [shorter, longer] = tokensA.length <= tokensB.length ? [tokensA, tokensB] : [tokensB, tokensA]
  const isSubset = shorter.every(t => longer.includes(t))
  if (isSubset && shorter.length > 0) {
    const ratio = shorter.length / longer.length
    if (ratio >= 0.7) return { points: TITLE_POINTS, reason: 'Podcast title matched (equivalent short form)' }
    if (ratio >= 0.5) return { points: Math.round(TITLE_POINTS * 0.6), reason: 'Podcast title partially matched — extra words present' }
    return { points: 0, reason: null } // e.g. "Crime Stories" vs "Crime Stories Daily and More" — too much extra content
  }

  const sim = titleSimilarity(normA, normB)
  if (sim >= 0.92) return { points: TITLE_POINTS, reason: 'Podcast title matched (minor spelling/punctuation difference)' }
  if (sim >= 0.75) return { points: Math.round(TITLE_POINTS * 0.6), reason: `Podcast title closely similar (${Math.round(sim * 100)}%)` }
  if (sim >= 0.55) return { points: Math.round(TITLE_POINTS * 0.25), reason: `Podcast title loosely similar (${Math.round(sim * 100)}%)` }
  return { points: 0, reason: null }
}

function scoreName(a: string | null, b: string | null, maxPoints: number, label: string): { points: number; reason: string | null } {
  if (!a || !b) return { points: 0, reason: null }
  const normA = a.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '')
  const normB = b.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '')
  if (!normA || !normB) return { points: 0, reason: null }
  if (normA === normB) return { points: maxPoints, reason: `${label} matched` }
  if (normA.includes(normB) || normB.includes(normA)) return { points: Math.round(maxPoints * 0.7), reason: `${label} partially matched` }
  const sim = titleSimilarity(normA, normB)
  if (sim >= 0.85) return { points: maxPoints, reason: `${label} matched` }
  if (sim >= 0.6) return { points: Math.round(maxPoints * 0.5), reason: `${label} closely similar` }
  return { points: 0, reason: null }
}

function scoreWebsite(a: string | null, b: string | null): { points: number; reason: string | null } {
  if (!a || !b) return { points: 0, reason: null }
  const normA = normalizeUrl(a)
  const normB = normalizeUrl(b)
  if (normA === normB) return { points: WEBSITE_POINTS, reason: 'Official website matched' }
  const domainA = domainOf(a)
  const domainB = domainOf(b)
  if (domainA && domainB && domainA === domainB) return { points: Math.round(WEBSITE_POINTS * 0.7), reason: 'Website domain matched' }
  return { points: 0, reason: null }
}

/**
 * Checks strong, decisive identifiers (matching Podcast Index feed ID,
 * Apple collection ID, or an identical RSS feed URL) — any one of these is
 * conclusive on its own and short-circuits to a high-confidence match,
 * regardless of how the titles compare.
 */
function findStrongIdentifierMatch(candidate: ArtworkCandidateImage, podcast: ArtworkTargetPodcast): MatchResult | null {
  if (candidate.podcastIndexFeedId != null && podcast.podcast_index_feed_id != null &&
      candidate.podcastIndexFeedId === podcast.podcast_index_feed_id) {
    return { match: true, confidence: 'high', score: 100, reasons: ['Podcast Index feed ID matched'] }
  }
  if (candidate.appleCollectionId != null && podcast.apple_collection_id != null &&
      candidate.appleCollectionId === podcast.apple_collection_id) {
    return { match: true, confidence: 'high', score: 100, reasons: ['Apple Podcasts collection ID matched'] }
  }
  if (candidate.candidateFeedUrl && podcast.rss_url &&
      normalizeUrl(candidate.candidateFeedUrl) === normalizeUrl(podcast.rss_url)) {
    return { match: true, confidence: 'high', score: 100, reasons: ['RSS feed URL matched exactly'] }
  }
  return null
}

/**
 * Compares a candidate's associated podcast metadata against the target
 * podcast being resolved, and returns a confidence-scored match verdict.
 * Deliberately conservative — see CONFIDENCE_THRESHOLDS and the module
 * doc comments on scoreTitles for the "Crime Stories" vs "Crime Stories
 * Daily" style false-positive this guards against.
 */
export function matchPodcast(candidate: ArtworkCandidateImage, podcast: ArtworkTargetPodcast): MatchResult {
  const strong = findStrongIdentifierMatch(candidate, podcast)
  if (strong) return strong

  const reasons: string[] = []
  let score = 0

  const title = scoreTitles(candidate.candidateTitle ?? '', podcast.title)
  score += title.points
  if (title.reason) reasons.push(title.reason)

  const author = scoreName(candidate.candidateAuthor, podcast.host_name, AUTHOR_POINTS, 'Author')
  score += author.points
  if (author.reason) reasons.push(author.reason)

  const publisher = scoreName(candidate.candidatePublisher, podcast.host_name, PUBLISHER_POINTS, 'Publisher')
  score += publisher.points
  if (publisher.reason && !author.reason) reasons.push(publisher.reason)

  const website = scoreWebsite(candidate.candidateWebsite, podcast.website_url)
  score += website.points
  if (website.reason) reasons.push(website.reason)

  score = Math.min(100, Math.round(score * 10) / 10)

  if (score < MIN_SCORE_TO_SURFACE) {
    return { match: false, confidence: null, score, reasons: reasons.length ? reasons : ['No meaningful similarity found'] }
  }

  const corroboratingCategories = [title.points, author.points, publisher.points, website.points].filter(p => p > 0).length

  let confidence: MatchResult['confidence'] = 'low'
  if (score >= CONFIDENCE_THRESHOLDS.high) {
    confidence = 'high'
  } else if (score >= CONFIDENCE_THRESHOLDS.medium && corroboratingCategories >= 2) {
    confidence = 'medium'
  } else if (score >= CONFIDENCE_THRESHOLDS.medium) {
    // High score but from a single signal only (e.g. title alone) — not
    // enough corroboration to auto-accept even in the medium band.
    confidence = 'low'
    reasons.push('Score reached medium threshold from a single signal only — held for review')
  }

  return { match: confidence !== 'low' && confidence !== null, confidence, score, reasons }
}

/** FEED_POINTS is folded into findStrongIdentifierMatch's short-circuit; exported for documentation/tests only. */
export const SCORING_WEIGHTS = { title: TITLE_POINTS, author: AUTHOR_POINTS, publisher: PUBLISHER_POINTS, website: WEBSITE_POINTS, feed: FEED_POINTS }
