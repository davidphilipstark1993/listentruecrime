import { parseFeed } from './rss'
import { enrichFromItunes } from './sources/itunes'
import type { CandidateFeed, ResearchedCandidate } from './types'

const TRUE_CRIME_CASE_TERMS: { term: string; label: string }[] = [
  { term: 'cold case', label: 'Cold Case' },
  { term: 'missing', label: 'Missing Person' },
  { term: 'serial killer', label: 'Serial Killer' },
  { term: 'fraud', label: 'Fraud' },
  { term: 'scam', label: 'Scam' },
  { term: 'wrongful conviction', label: 'Wrongful Conviction' },
  { term: 'murder', label: 'Murder' },
  { term: 'unsolved', label: 'Cold Case' },
]

/**
 * Researches a single candidate: fetches its own RSS feed (first-party
 * ground truth) and enriches with iTunes metadata. Never fails the whole
 * run — a candidate whose feed can't be fetched is returned with
 * researchFailed=true and a note, so the pipeline continues.
 */
export async function researchCandidate(candidate: CandidateFeed): Promise<ResearchedCandidate> {
  const notes: string[] = []

  const feed = candidate.rssUrl ? await parseFeed(candidate.rssUrl) : null
  const itunes = await enrichFromItunes(candidate.podcastName)

  if (candidate.rssUrl && !feed) {
    notes.push('RSS feed could not be fetched or parsed.')
  }

  const hostName = feed?.hostName ?? null
  if (!hostName) {
    notes.push('Host(s) could not be verified from the available sources.')
  }

  const description = feed?.description ?? null
  const episodeCount = feed?.itemCount ?? itunes?.episodeCountApprox ?? null
  if (!feed?.itemCount && itunes?.episodeCountApprox) {
    notes.push('Episode count is an Apple Podcasts approximation, not counted from the RSS feed directly.')
  }

  const caseFocus = description
    ? TRUE_CRIME_CASE_TERMS.filter(t => description.toLowerCase().includes(t.term)).map(t => t.label)
    : []
  if (!caseFocus.length) {
    notes.push('Case focus could not be determined from the available description.')
  }

  return {
    ...candidate,
    appleUrl: candidate.appleUrl ?? itunes?.appleUrl ?? null,
    artworkUrl: candidate.artworkUrl ?? itunes?.artworkUrl ?? null,
    description,
    hosts: hostName ? [{ name: hostName, verified: true }] : null,
    episodeCount,
    launchDate: feed?.earliestItemDate ?? null,
    latestEpisodeDate: feed?.latestItemDate ?? null,
    format: null, // deliberately not inferred — no reliable signal from feed metadata alone
    language: feed?.language ?? null,
    country: null, // not reliably derivable from RSS/iTunes without guessing
    caseFocus: Array.from(new Set(caseFocus)),
    researchNotes: notes,
    researchFailed: candidate.rssUrl != null && feed === null,
  }
}
