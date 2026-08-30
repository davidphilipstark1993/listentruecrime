export interface CandidateFeed {
  podcastName: string
  normalizedName: string
  rssUrl: string | null
  websiteUrl: string | null
  appleUrl: string | null
  artworkUrl: string | null
  sourceNotes: { url: string; note: string }[]
}

export interface ResearchedCandidate extends CandidateFeed {
  description: string | null
  hosts: { name: string; verified: boolean }[] | null
  episodeCount: number | null
  launchDate: string | null
  latestEpisodeDate: string | null
  format: string | null
  language: string | null
  country: string | null
  caseFocus: string[]
  /** Average minutes per episode across the 10 most recent items with a published duration — null if unavailable. */
  averageEpisodeMinutes: number | null
  researchNotes: string[]
  researchFailed: boolean
}

export interface ScoredCandidate extends ResearchedCandidate {
  score: number
  pros: string[]
  cons: string[]
  editorialVerdict: string
}
