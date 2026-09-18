import type { SupabaseClient } from '@supabase/supabase-js'
import { validateArtworkUrl } from './validate'
import { matchPodcast, MIN_SCORE_TO_SURFACE } from './match'
import { cacheArtwork } from './storage'
import { probeImage } from './image-probe'
import { resolveFromPodcastIndex } from './sources/podcast-index'
import { resolveFromApple } from './sources/apple'
import { resolveFromRss } from './sources/rss'
import { resolveFromWebsite } from './sources/website'
import { MAX_ARTWORK_ATTEMPTS } from './types'
import type {
  ArtworkCandidateImage, ArtworkResolutionResult, ArtworkSource, ArtworkTargetPodcast,
  ScoredCandidate, StoredArtworkCandidate,
} from './types'

const PODCAST_COLUMNS = 'id, title, host_name, website_url, rss_url, image_url, podcast_index_feed_id, apple_collection_id, artwork_manual_override, artwork_status, artwork_attempts'

// Priority order — first source to clear the auto-accept bar wins.
const SOURCES: { source: ArtworkSource; resolve: (p: ArtworkTargetPodcast) => Promise<ArtworkCandidateImage[]> }[] = [
  { source: 'podcast_index', resolve: resolveFromPodcastIndex },
  { source: 'apple', resolve: resolveFromApple },
  { source: 'rss', resolve: resolveFromRss },
  { source: 'website', resolve: resolveFromWebsite },
]

export interface ResolveOptions {
  /** Re-validates/re-searches even if artwork is already verified (admin "force re-check"). Never bypasses a manual override. */
  force?: boolean
}

function errorResult(podcastId: string, error: string): ArtworkResolutionResult {
  return { podcastId, status: 'failed', artworkUrl: null, source: null, confidence: null, score: null, reasons: [], candidates: [], error }
}

/** Validates only the top few matches per source (bandwidth-conscious) rather than every raw result. */
async function bestFromSource(candidates: ArtworkCandidateImage[], podcast: ArtworkTargetPodcast): Promise<ScoredCandidate[]> {
  const scored = await Promise.all(
    candidates
      .map(c => ({ c, match: matchPodcast(c, podcast) }))
      .filter(({ match }) => match.score >= MIN_SCORE_TO_SURFACE)
      .sort((a, b) => b.match.score - a.match.score)
      .slice(0, 3) // validate at most the top 3 per source
      .map(async ({ c, match }) => {
        const { result: validation } = await validateArtworkUrl(c.url)
        return { candidate: c, match, validation }
      })
  )
  return scored.filter((s): s is ScoredCandidate => s !== null)
}

async function persist(admin: SupabaseClient, podcastId: string, fields: Record<string, unknown>) {
  const { error } = await admin.from('podcasts').update(fields).eq('id', podcastId)
  if (error) console.error(`Failed to persist artwork result for podcast ${podcastId}:`, error.message)
}

function backoffRetryAt(attempts: number): string {
  const days = Math.min(2 ** attempts, 30) // 1, 2, 4, 8, 16, capped at 30 days
  return new Date(Date.now() + days * 86_400_000).toISOString()
}

/**
 * Resolves genuine artwork for one podcast, per the priority order:
 * existing verified artwork > Podcast Index > Apple > RSS > website >
 * manual review > placeholder (placeholder itself is a front-end fallback,
 * not written to the database — see components rendering image_url).
 *
 * Never touches artwork_manual_override rows. Never replaces existing,
 * validated-good artwork. One source failing never aborts the others.
 */
export async function resolvePodcastArtwork(
  admin: SupabaseClient,
  podcastId: string,
  options: ResolveOptions = {}
): Promise<ArtworkResolutionResult> {
  const { data: podcast, error: loadError } = await admin
    .from('podcasts')
    .select(PODCAST_COLUMNS)
    .eq('id', podcastId)
    .single()

  if (loadError || !podcast) return errorResult(podcastId, loadError?.message ?? 'Podcast not found')

  const target = podcast as unknown as ArtworkTargetPodcast

  if (target.artwork_manual_override) {
    return {
      podcastId, status: 'verified', artworkUrl: target.image_url, source: 'manual', confidence: 'high',
      score: null, reasons: ['Manual override in place — recovery skipped'], candidates: [], error: null,
    }
  }

  const attemptedBefore = target.artwork_attempts ?? 0
  if (!options.force && target.artwork_status === 'verified' && target.image_url) {
    return {
      podcastId, status: 'verified', artworkUrl: target.image_url, source: 'existing', confidence: 'high',
      score: null, reasons: ['Existing artwork already verified — left alone'], candidates: [], error: null,
    }
  }

  const now = new Date().toISOString()
  const hadExistingUrl = Boolean(target.image_url)

  // Check the existing image_url (if present) before searching anywhere
  // else — genuinely good existing artwork must never be replaced. A 200
  // response is not enough: validateArtworkUrl actually decodes the image.
  if (target.image_url) {
    const { result: existingValidation } = await validateArtworkUrl(target.image_url)
    if (existingValidation.valid) {
      await persist(admin, podcastId, {
        artwork_status: 'verified', artwork_source: target.artwork_status === 'missing' ? 'existing' : undefined,
        artwork_confidence: 'high', artwork_verified_at: now, artwork_checked_at: now,
        artwork_error: null, artwork_attempts: attemptedBefore + 1, artwork_last_attempt_at: now,
        artwork_next_retry_at: null,
      })
      return {
        podcastId, status: 'verified', artworkUrl: target.image_url, source: 'existing', confidence: 'high',
        score: null, reasons: ['Existing artwork validated as a genuine, usable image'], candidates: [], error: null,
      }
    }
    console.warn(`Podcast ${podcastId}: existing artwork failed validation (${existingValidation.reason}) — attempting recovery`)
  }

  if (attemptedBefore >= MAX_ARTWORK_ATTEMPTS && !options.force) {
    return errorResult(podcastId, `Max recovery attempts (${MAX_ARTWORK_ATTEMPTS}) reached — use force re-check to try again`)
  }

  const allCandidates: ScoredCandidate[] = []
  let accepted: ScoredCandidate | null = null
  let acceptedSource: ArtworkSource | null = null

  for (const { source, resolve } of SOURCES) {
    let raw: ArtworkCandidateImage[] = []
    try {
      raw = await resolve(target)
    } catch (err) {
      // One source failing must never stop the waterfall — log and move on.
      console.error(`Artwork source "${source}" failed for podcast ${podcastId}:`, err instanceof Error ? err.message : err)
      continue
    }
    if (!raw.length) continue

    const scored = await bestFromSource(raw, target)
    allCandidates.push(...scored)

    const winner = scored.find(s => s.match.match && s.validation.valid)
    if (winner) {
      accepted = winner
      acceptedSource = source
      break
    }
  }

  if (accepted && acceptedSource) {
    const { candidate, match } = accepted

    // Re-download for the actual bytes to cache — bestFromSource() only
    // validated, it didn't keep the buffer around.
    const { result: revalidation, buffer } = await validateArtworkUrl(candidate.url)
    const format = buffer ? probeImage(buffer).format : null

    if (!buffer || !format || !revalidation.valid) {
      // Vanishingly rare (URL changed between validation and now) — fall through to needs_review below.
    } else {
      const cached = await cacheArtwork(admin, podcastId, buffer, format, revalidation.contentType)
      if ('error' in cached) {
        await persist(admin, podcastId, {
          artwork_status: 'failed', artwork_error: `Storage upload failed: ${cached.error}`,
          artwork_checked_at: now, artwork_attempts: attemptedBefore + 1, artwork_last_attempt_at: now,
          artwork_next_retry_at: backoffRetryAt(attemptedBefore + 1),
        })
        return errorResult(podcastId, `Storage upload failed: ${cached.error}`)
      }

      await persist(admin, podcastId, {
        image_url: cached.url,
        artwork_original_url: candidate.url,
        artwork_source: acceptedSource,
        artwork_status: 'verified',
        artwork_confidence: match.confidence,
        artwork_score: match.score,
        artwork_match_reason: match.reasons.join('; '),
        artwork_error: null,
        artwork_verified_at: now,
        artwork_checked_at: now,
        artwork_attempts: attemptedBefore + 1,
        artwork_last_attempt_at: now,
        artwork_next_retry_at: null,
        artwork_candidate: null,
        podcast_index_feed_id: candidate.podcastIndexFeedId ?? undefined,
        apple_collection_id: candidate.appleCollectionId ?? undefined,
        rss_url: target.rss_url ?? candidate.candidateFeedUrl ?? undefined,
      })

      return {
        podcastId, status: 'verified', artworkUrl: cached.url, source: acceptedSource, confidence: match.confidence,
        score: match.score, reasons: match.reasons, candidates: allCandidates, error: null,
      }
    }
  }

  // No auto-acceptable candidate — surface the best reviewable one, if any.
  const reviewable = allCandidates
    .filter(c => c.validation.valid && c.match.score >= MIN_SCORE_TO_SURFACE)
    .sort((a, b) => b.match.score - a.match.score)[0]

  if (reviewable) {
    const storedCandidate: StoredArtworkCandidate = {
      url: reviewable.candidate.url,
      originalUrl: reviewable.candidate.url,
      source: reviewable.candidate.source,
      confidence: reviewable.match.confidence ?? 'low',
      score: reviewable.match.score,
      reasons: reviewable.match.reasons,
      candidateTitle: reviewable.candidate.candidateTitle,
      candidateAuthor: reviewable.candidate.candidateAuthor,
      candidatePublisher: reviewable.candidate.candidatePublisher,
      foundAt: now,
    }

    await persist(admin, podcastId, {
      artwork_status: 'needs_review', artwork_candidate: storedCandidate, artwork_checked_at: now,
      artwork_error: null, artwork_attempts: attemptedBefore + 1, artwork_last_attempt_at: now,
      artwork_next_retry_at: null,
    })

    return {
      podcastId, status: 'needs_review', artworkUrl: target.image_url, source: null, confidence: storedCandidate.confidence,
      score: storedCandidate.score, reasons: storedCandidate.reasons, candidates: allCandidates, error: null,
    }
  }

  const finalStatus = hadExistingUrl ? 'failed' : 'missing'
  await persist(admin, podcastId, {
    artwork_status: finalStatus,
    artwork_error: hadExistingUrl ? 'Existing artwork was invalid and no replacement candidate was found' : 'No artwork candidate found from any source',
    artwork_checked_at: now, artwork_attempts: attemptedBefore + 1, artwork_last_attempt_at: now,
    artwork_next_retry_at: backoffRetryAt(attemptedBefore + 1),
  })

  return {
    podcastId, status: finalStatus, artworkUrl: target.image_url, source: null, confidence: null,
    score: null, reasons: [], candidates: allCandidates,
    error: hadExistingUrl ? 'Existing artwork was invalid and no replacement candidate was found' : 'No artwork candidate found from any source',
  }
}
