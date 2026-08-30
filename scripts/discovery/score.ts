import type { ResearchedCandidate, ScoredCandidate } from './types'

/**
 * Computes an internal editorial ranking (0-10) from objective proxy
 * signals only — this is a heuristic, not a listen-through review. Nothing
 * here simulates taste or invents an opinion; pros/cons are short factual
 * strings drawn directly from the fields that drove the score. The score
 * requires strong signal on most dimensions (not just one) to clear 8, so
 * results aren't front-loaded near the top.
 */
export function scoreCandidate(candidate: ResearchedCandidate): ScoredCandidate {
  const pros: string[] = []
  const cons: string[] = []
  let points = 0
  const MAX_POINTS = 10

  // Publishing consistency (0-3): recency of the latest episode
  if (candidate.latestEpisodeDate) {
    const daysSince = (Date.now() - new Date(candidate.latestEpisodeDate).getTime()) / 86_400_000
    if (daysSince <= 30) {
      points += 3
      pros.push('Active — a new episode within the last month.')
    } else if (daysSince <= 90) {
      points += 1.5
      pros.push('Publishing, though not in the last month.')
    } else {
      cons.push('No new episodes in the last three months.')
    }
  } else {
    cons.push('Publishing recency could not be verified.')
  }

  // Catalogue depth (0-2)
  if (candidate.episodeCount != null) {
    if (candidate.episodeCount >= 50) {
      points += 2
      pros.push(`Established catalogue — ${candidate.episodeCount}+ episodes.`)
    } else if (candidate.episodeCount >= 10) {
      points += 1
      pros.push(`${candidate.episodeCount} episodes published so far.`)
    } else {
      cons.push('Small catalogue so far — fewer than 10 episodes.')
    }
  } else {
    cons.push('Episode count could not be verified.')
  }

  // Metadata completeness (0-2.5): real host name + description quality
  if (candidate.hosts?.length) {
    points += 1.5
    pros.push(`Host verified from the podcast's own feed: ${candidate.hosts.map(h => h.name).join(', ')}.`)
  } else {
    cons.push('Host(s) could not be verified from available sources.')
  }
  if (candidate.description && candidate.description.length > 120) {
    points += 1
  } else {
    cons.push('Description is thin or missing.')
  }

  // Platform reach (0-2.5)
  const platformCount = [candidate.appleUrl, candidate.websiteUrl, candidate.rssUrl].filter(Boolean).length
  if (platformCount >= 3) {
    points += 2.5
    pros.push('Available across Apple Podcasts, its own website, and RSS.')
  } else if (platformCount === 2) {
    points += 1.25
  } else {
    cons.push('Limited platform presence found.')
  }

  const score = Math.round(Math.min(points, MAX_POINTS) * 10) / 10

  const editorialVerdict =
    score >= 8
      ? 'Strong candidate — consistent publishing, verified details, and broad availability.'
      : score >= 6
      ? 'Worth a closer look — solid on most dimensions but with gaps.'
      : score >= 4
      ? 'Borderline — several unverified or weak signals.'
      : 'Unlikely fit for now — too many gaps in available data.'

  return {
    ...candidate,
    score,
    pros,
    cons,
    editorialVerdict,
  }
}
