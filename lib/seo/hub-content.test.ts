import { describe, expect, it } from 'vitest'
import { buildHubContent, HUB_INTRO_MAX_WORDS, HUB_INTRO_MIN_WORDS, type HubShow } from './hub-content'
import { segmentsToText, wordCount } from './text'

const CASE_TYPES = ['Cold Case', 'Missing Person', 'Investigative', 'Murder', 'Courtroom', 'Fraud']
const COUNTRIES_ = ['US', 'UK', 'AU', 'CA']
const PLATFORMS_ = ['Spotify', 'Apple Podcasts', 'Audible', 'Amazon Music']

function shows(n: number, overrides: Partial<HubShow> = {}): HubShow[] {
  return Array.from({ length: n }, (_, i) => ({
    title: `Show ${String.fromCharCode(65 + (i % 26))}${i}`,
    slug: `show-${i}`,
    binge_factor: 6 + ((i * 7) % 5),
    case_types: [CASE_TYPES[i % 6], CASE_TYPES[(i + 2) % 6]],
    country: COUNTRIES_[i % 4],
    platforms: [PLATFORMS_[i % 4], PLATFORMS_[(i + 1) % 4]],
    format_type: i % 3 === 0 ? 'Serialized' : 'Episodic',
    episode_length: i % 2 ? '30-45 min' : '45-60 min',
    ...overrides,
  }))
}

const introText = (c: ReturnType<typeof buildHubContent>) =>
  c!.intro.map(p => segmentsToText(p)).join(' ')

describe('buildHubContent', () => {
  const cases: Array<[string, Parameters<typeof buildHubContent>[0]]> = [
    ['large category', { kind: 'category', key: 'cold-cases', shows: shows(40), catalogueTotal: 700 }],
    ['mid category', { kind: 'category', key: 'courtroom', shows: shows(9) }],
    ['country', { kind: 'country', key: 'UK', shows: shows(25), catalogueTotal: 700 }],
    ['small country', { kind: 'country', key: 'MT', shows: shows(2).map(s => ({ ...s, country: 'MT' })), catalogueTotal: 700 }],
    ['platform', { kind: 'platform', key: 'Spotify', shows: shows(60) }],
    ['one-show hub', { kind: 'platform', key: 'NPR', shows: shows(1) }],
    ['unscored hub', { kind: 'country', key: 'KE', shows: shows(4, { binge_factor: null }).map(s => ({ ...s, country: 'KE' })) }],
  ]

  it.each(cases)('%s: intro is 120–250 words and 3–4 FAQs', (_name, input) => {
    const content = buildHubContent(input)!
    const words = wordCount(introText(content))
    expect(words).toBeGreaterThanOrEqual(HUB_INTRO_MIN_WORDS)
    expect(words).toBeLessThanOrEqual(HUB_INTRO_MAX_WORDS)
    expect(content.faqs.length).toBeGreaterThanOrEqual(3)
    expect(content.faqs.length).toBeLessThanOrEqual(4)
    for (const faq of content.faqs) expect(faq.a.length).toBeGreaterThan(30)
  })

  it('returns null for an empty hub', () => {
    expect(buildHubContent({ kind: 'category', key: 'cold-cases', shows: [] })).toBeNull()
  })

  it('links the top shows and only states data it was given', () => {
    const content = buildHubContent({ kind: 'category', key: 'cold-cases', shows: shows(12) })!
    const links = content.intro.flat().filter(s => typeof s !== 'string')
    expect(links.length).toBe(3)
    expect(introText(content)).not.toMatch(/undefined|NaN|null/)
  })

  it('does not reuse one sentence with the name swapped', () => {
    const a = introText(buildHubContent({ kind: 'category', key: 'cold-cases', shows: shows(30) }))
    const b = introText(buildHubContent({ kind: 'category', key: 'fraud-scams', shows: shows(14).reverse() }))
    const c = introText(buildHubContent({ kind: 'country', key: 'AU', shows: shows(18) }))
    const sentences = (t: string) => new Set(t.split(/(?<=\.)\s+/))
    const shared = (x: string, y: string) => Array.from(sentences(x)).filter(s => sentences(y).has(s)).length
    // Only the site-level ranking sentence and a coincidental data match
    // (the fixtures share one episode length) may repeat between hubs
    expect(shared(a, b)).toBeLessThanOrEqual(2)
    expect(shared(a, c)).toBeLessThanOrEqual(2)
    expect(a).not.toBe(b)
  })

  it('never drops the editor-score vs community-rating explanation', () => {
    const content = buildHubContent({ kind: 'platform', key: 'Audible', shows: shows(7) })!
    expect(introText(content)).toContain('community average only appears once a show has five listener ratings')
  })
})
