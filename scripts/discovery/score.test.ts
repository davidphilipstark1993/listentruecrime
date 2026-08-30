import { describe, it, expect } from 'vitest'
import { scoreCandidate, promotionalLanguageScore } from './score'
import type { ResearchedCandidate } from './types'

const recentDate = new Date(Date.now() - 5 * 86_400_000).toISOString().slice(0, 10)
const staleDate = new Date(Date.now() - 200 * 86_400_000).toISOString().slice(0, 10)

function baseCandidate(overrides: Partial<ResearchedCandidate> = {}): ResearchedCandidate {
  return {
    podcastName: 'Test Podcast',
    normalizedName: 'testpodcast',
    rssUrl: 'https://example.com/feed.xml',
    websiteUrl: 'https://example.com',
    appleUrl: 'https://podcasts.apple.com/id123',
    artworkUrl: 'https://example.com/art.jpg',
    sourceNotes: [],
    description: 'A long, plainly written description of a true crime podcast that covers cold cases in careful detail across many episodes, with no marketing language at all in this sentence.',
    hosts: [{ name: 'Jane Host', verified: true }],
    episodeCount: 60,
    launchDate: '2020-01-01',
    latestEpisodeDate: recentDate,
    format: null,
    language: 'en',
    country: null,
    caseFocus: ['Cold Case'],
    averageEpisodeMinutes: 45,
    researchNotes: [],
    researchFailed: false,
    ...overrides,
  }
}

describe('scoreCandidate — discrimination', () => {
  it('does not automatically max out for a large, "complete" mainstream show missing duration data', () => {
    // Mirrors the real test-run finding: big shows with full metadata but
    // no published itunes:duration should NOT flatline at 10/10.
    const candidate = baseCandidate({ episodeCount: 1000, averageEpisodeMinutes: null })
    const scored = scoreCandidate(candidate)
    expect(scored.score).toBeLessThan(10)
  })

  it('scores a short news-clip-format show lower than a long-form narrative show, all else equal', () => {
    const narrative = scoreCandidate(baseCandidate({ averageEpisodeMinutes: 50 }))
    const newsClip = scoreCandidate(baseCandidate({ averageEpisodeMinutes: 6 }))
    expect(newsClip.score).toBeLessThan(narrative.score)
    expect(newsClip.cons.some(c => c.toLowerCase().includes('news-clip') || c.toLowerCase().includes('short'))).toBe(true)
  })

  it('scores a heavily promotional description lower than a plain one, all else equal', () => {
    const plain = scoreCandidate(baseCandidate())
    const promo = scoreCandidate(baseCandidate({
      description: '🔎🎧 SHOCKING true crime stories!!! NEW EPISODES DAILY! Subscribe now and hit follow — click here to listen now!!! 🔥',
    }))
    expect(promo.score).toBeLessThan(plain.score)
  })

  it('never scores missing information as a positive', () => {
    const sparse = scoreCandidate(baseCandidate({
      hosts: null,
      description: null,
      episodeCount: null,
      latestEpisodeDate: null,
      averageEpisodeMinutes: null,
      caseFocus: [],
      appleUrl: null,
      websiteUrl: null,
    }))
    // A candidate with almost nothing verified should score low, not be
    // rewarded for the gaps, and every gap should show up as a real con.
    expect(sparse.score).toBeLessThan(3)
    expect(sparse.cons.length).toBeGreaterThanOrEqual(5)
    expect(sparse.pros.length).toBe(0)
  })

  it('a genuinely strong, well-documented candidate still scores highly', () => {
    const strong = scoreCandidate(baseCandidate())
    expect(strong.score).toBeGreaterThanOrEqual(7)
  })

  it('generates cons only from measured evidence, not invented criticism', () => {
    const strong = scoreCandidate(baseCandidate())
    // With everything verified and in the sweet spots, there should be few
    // or no cons — the system must not manufacture criticism to pad the list.
    expect(strong.cons.length).toBeLessThanOrEqual(1)
  })

  it('a stale (inactive) podcast is marked down and flagged', () => {
    const stale = scoreCandidate(baseCandidate({ latestEpisodeDate: staleDate }))
    const active = scoreCandidate(baseCandidate())
    expect(stale.score).toBeLessThan(active.score)
    expect(stale.cons.some(c => c.toLowerCase().includes('inactive') || c.toLowerCase().includes('no new episodes'))).toBe(true)
  })

  it('does not reward raw episode count beyond the established-catalogue threshold', () => {
    const fifteen = scoreCandidate(baseCandidate({ episodeCount: 15 }))
    const thousand = scoreCandidate(baseCandidate({ episodeCount: 1000 }))
    expect(thousand.score).toBe(fifteen.score)
  })
})

describe('promotionalLanguageScore', () => {
  it('returns 0 for plain descriptive text', () => {
    expect(promotionalLanguageScore('A documentary series examining unsolved disappearances across the UK.')).toBe(0)
  })

  it('returns a positive score for emoji-heavy, marketing-driven text', () => {
    expect(promotionalLanguageScore('🎧 SHOCKING new episodes daily!! Subscribe now!! 🔥')).toBeGreaterThan(2)
  })
})
