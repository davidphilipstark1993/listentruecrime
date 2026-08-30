import type { ResearchedCandidate, ScoredCandidate } from './types'

/**
 * Computes an internal editorial ranking (0-10) from objective proxy
 * signals only — this is a heuristic, not a listen-through review, and it
 * is deliberately designed to NOT reward "big and complete" alone. Seven
 * independent dimensions each contribute a small slice; a candidate has to
 * do genuinely well across most of them to score highly, and missing
 * information is never scored as a positive — it costs points and is
 * called out as a con, the same as a confirmed weakness. Pros/cons are
 * generated only from measured evidence, never invented.
 */
export function scoreCandidate(candidate: ResearchedCandidate): ScoredCandidate {
  const pros: string[] = []
  const cons: string[] = []
  let points = 0

  // A. Publishing activity/recency (0-2)
  if (candidate.latestEpisodeDate) {
    const daysSince = (Date.now() - new Date(candidate.latestEpisodeDate).getTime()) / 86_400_000
    if (daysSince <= 30) {
      points += 2
      pros.push('Active — a new episode within the last month.')
    } else if (daysSince <= 90) {
      points += 1
      cons.push('No new episodes in the last month, though still publishing periodically.')
    } else {
      cons.push('No new episodes in the last three months — may be inactive.')
    }
  } else {
    cons.push('Publishing recency could not be verified.')
  }

  // B. Catalogue shape (0-1.5) — rewards a real production run without
  // treating "more episodes" as automatically better. A 15-300 episode
  // catalogue scores the same as a 1000-episode one; huge counts don't earn
  // extra points, since raw size measures age/output, not quality.
  if (candidate.episodeCount != null) {
    if (candidate.episodeCount >= 15) {
      points += 1.5
      pros.push(`Established catalogue — ${candidate.episodeCount} episodes published.`)
    } else if (candidate.episodeCount >= 5) {
      points += 0.75
      cons.push(`Still a small catalogue so far (${candidate.episodeCount} episodes) — limited track record.`)
    } else {
      cons.push(`Very small catalogue so far (${candidate.episodeCount} episodes) — too early to judge consistency.`)
    }
  } else {
    cons.push('Episode count could not be verified.')
  }

  // C. Verified factual completeness (0-1.5)
  if (candidate.hosts?.length) {
    points += 0.75
    pros.push(`Host verified from the podcast's own feed: ${candidate.hosts.map(h => h.name).join(', ')}.`)
  } else {
    cons.push('Host(s) could not be verified from available sources.')
  }
  if (candidate.description && candidate.description.replace(/<[^>]+>/g, '').trim().length > 120) {
    points += 0.75
  } else {
    cons.push('Description is thin or missing, limiting how well the show can be assessed.')
  }

  // D. Episode format suitability (0-1.5) — a genuine, measured signal from
  // the feed's own published durations, not a guess. Very short average
  // durations suggest a news-clip/reaction format, which is real information
  // about fit for a "listen to this show" recommendation, not an invented
  // opinion. Missing duration data gets partial credit, not full — it's
  // genuine uncertainty, not treated as a positive.
  if (candidate.averageEpisodeMinutes != null) {
    const mins = candidate.averageEpisodeMinutes
    if (mins >= 20 && mins <= 120) {
      points += 1.5
      pros.push(`Typical episode length (~${Math.round(mins)} min) suits in-depth narrative storytelling.`)
    } else if (mins >= 10 && mins < 20) {
      points += 0.75
      cons.push(`Episodes run short (~${Math.round(mins)} min on average) — likely lighter on depth than a full narrative episode.`)
    } else if (mins < 10) {
      cons.push(`Episodes are very short (~${Math.round(mins)} min on average) — reads as a news-clip/reaction format rather than in-depth storytelling.`)
    } else {
      points += 0.5
      cons.push(`Episodes run very long (~${Math.round(mins)} min on average) — worth checking whether that's justified by the material.`)
    }
  } else {
    points += 0.5
    cons.push('Average episode length could not be determined from the feed.')
  }

  // E. Description quality — non-promotional tone (0-1.5). Measures actual
  // detectable patterns in the podcast's own self-description (emoji
  // density, ALL-CAPS emphasis, exclamation marks, marketing phrases) —
  // evidence of tone, not an invented opinion about quality.
  if (candidate.description) {
    const promoScore = promotionalLanguageScore(candidate.description)
    if (promoScore === 0) {
      points += 1.5
    } else if (promoScore <= 2) {
      points += 0.75
      cons.push('Description leans promotional in places.')
    } else {
      cons.push('Description reads as heavily promotional/marketing-driven rather than descriptive, which may signal a content-mill format.')
    }
  }

  // F. Platform reach (0-1) — a minor supporting signal, not a primary driver.
  const platformCount = [candidate.appleUrl, candidate.websiteUrl, candidate.rssUrl].filter(Boolean).length
  if (platformCount >= 3) {
    points += 1
    pros.push('Available across Apple Podcasts, its own website, and RSS.')
  } else if (platformCount === 2) {
    points += 0.5
  } else {
    cons.push('Limited platform presence found.')
  }

  // G. Topical relevance to LTC (0-1) — rewards a specific, categorizable
  // true-crime angle (matches the site's own case-type taxonomy) over a
  // generic, unclassifiable "true crime" self-label.
  if (candidate.caseFocus.length) {
    points += 1
    pros.push(`Clear case focus: ${candidate.caseFocus.join(', ')}.`)
  } else {
    cons.push('Could not identify a specific case-type focus from available information.')
  }

  const score = Math.round(Math.min(points, 10) * 10) / 10

  const editorialVerdict =
    score >= 8
      ? 'Strong candidate — consistent, well-documented, and well-suited to a narrative recommendation.'
      : score >= 6
      ? 'Worth a closer look — solid on most dimensions but with real gaps.'
      : score >= 4
      ? 'Borderline — several unverified or weak signals; needs editorial judgment.'
      : 'Unlikely fit for now — too many gaps or format concerns.'

  return {
    ...candidate,
    score,
    pros,
    cons,
    editorialVerdict,
  }
}

const PROMO_PHRASES = [
  'subscribe now', 'new episodes daily', 'new episode every', 'follow us', "don't miss",
  'click here', 'listen now', 'available now', 'rate and review', 'hit subscribe',
  'download now', 'tune in now',
]

/**
 * Counts real, detectable promotional-language markers in a description:
 * emoji, ALL-CAPS emphasis words, exclamation marks, and stock marketing
 * phrases. Returns a rough count, not a normalized 0-1 score — thresholds
 * in scoreCandidate() interpret the raw count.
 */
export function promotionalLanguageScore(description: string): number {
  const text = description.replace(/<[^>]+>/g, ' ')
  let score = 0

  // Iterate by Unicode code point (not regex \u{...} escapes, which need a
  // newer language target than this project compiles against) to count
  // emoji in the common pictograph/symbol/dingbat ranges.
  let emojiCount = 0
  for (const ch of Array.from(text)) {
    const cp = ch.codePointAt(0) ?? 0
    if ((cp >= 0x1f300 && cp <= 0x1faff) || (cp >= 0x2600 && cp <= 0x27bf)) emojiCount++
  }
  if (emojiCount) score += Math.min(emojiCount, 3)

  const capsWords = text.match(/\b[A-Z]{4,}\b/g)
  if (capsWords) score += Math.min(capsWords.length, 2)

  const exclamations = text.match(/!/g)
  if (exclamations && exclamations.length >= 2) score += 1

  const lower = text.toLowerCase()
  for (const phrase of PROMO_PHRASES) {
    if (lower.includes(phrase)) score += 1
  }

  return score
}
