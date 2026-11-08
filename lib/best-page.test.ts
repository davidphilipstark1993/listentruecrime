import { describe, it, expect } from 'vitest'
import { buildSections, pickTopPicks, buildBestFaqs, computeFacts, compareBest, joinNames, BEST_SECTIONS, describeEntry, hasUnverifiableClaim, type BestPodcast } from './best-page'
import { hasCaseType, isSerialised, whoIsItFor, audienceFitVerdict, formatLabel } from './podcast-facets'

const mk = (slug: string, o: Partial<BestPodcast> = {}): BestPodcast => ({
  id: slug, slug, title: slug.toUpperCase(), short_description: null, newsletter_worthy_summary: null, image_url: null,
  country: 'US', country_name: null, case_types: ['Murder'], format_type: 'Episodic', host_style: null, factual_style: null, binge_factor: 8,
  episode_length: null, episode_count: null, best_episode_to_start: null, platforms: ['Spotify'],
  platform_urls: { Spotify: 'https://open.spotify.com/show/x' }, quick_verdict: 'Must listen', is_featured: false,
  updated_at: '2026-01-01T00:00:00Z', ...o,
})

describe('podcast-facets', () => {
  it('matches case types regardless of case', () => {
    expect(hasCaseType({ case_types: ['Cold case'] }, 'Cold Case')).toBe(true)
    expect(hasCaseType({ case_types: ['serial KILLER'] }, 'Serial Killer')).toBe(true)
    expect(hasCaseType({ case_types: null }, 'Cold Case')).toBe(false)
  })
  it('treats Serialized and Serialised as one format', () => {
    expect(isSerialised({ format_type: 'Serialized' })).toBe(true)
    expect(isSerialised({ format_type: 'Serialised' })).toBe(true)
    expect(isSerialised({ format_type: 'Episodic' })).toBe(false)
    expect(formatLabel({ case_types: null, format_type: 'Serialized' })).toBe('Serialised')
  })
  it('only returns an audience-fit line for non-generic verdicts', () => {
    expect(audienceFitVerdict({ quick_verdict: 'Must listen' })).toBeNull()
    expect(audienceFitVerdict({ quick_verdict: 'Good if UK true crime interests you' })).toBe('Good if UK true crime interests you')
    expect(audienceFitVerdict({ quick_verdict: '' })).toBeNull()
  })
  it('derives who-it-is-for only from entered fields', () => {
    expect(whoIsItFor({ case_types: null, format_type: null, host_style: null, factual_style: null, country: null })).toEqual([])
    expect(whoIsItFor({ case_types: ['Cold case'], format_type: 'Serialised', host_style: null, factual_style: null, country: 'UK' }).length).toBe(3)
  })
})

describe('best page selection', () => {
  it('orders by Binge Factor, then featured, then title, with unscored last', () => {
    const list = [mk('b', { binge_factor: 9 }), mk('a', { binge_factor: 9 }), mk('f', { binge_factor: 9, is_featured: true }), mk('z', { binge_factor: null }), mk('h', { binge_factor: 10 })]
    expect(list.sort(compareBest).map(p => p.slug)).toEqual(['h', 'f', 'a', 'b', 'z'])
  })
  it('top picks require Must listen and Binge Factor 9 or more', () => {
    const all = [mk('a', { binge_factor: 9 }), mk('b', { binge_factor: 8 }), mk('c', { binge_factor: 10, quick_verdict: 'Worth a listen' }), mk('d', { binge_factor: 10 })]
    const { picks, total } = pickTopPicks(all, 10)
    expect(picks.map(p => p.slug)).toEqual(['d', 'a'])
    expect(total).toBe(2)
  })
  it('seeds from curated slugs first and skips unpublished ones', () => {
    const all = ['a', 'b', 'c', 'd', 'e', 'f'].map((s, i) => mk(s, { country: 'UK', binge_factor: 9 - (i % 3) }))
    const sections = buildSections(all, { 'best-british-true-crime-podcasts': ['e', 'ghost', 'a'] }, 4)
    const uk = sections.find(s => s.id === 'uk')!
    expect(uk.podcasts.slice(0, 2).map(p => p.slug)).toEqual(['e', 'a'])
    expect(uk.podcasts).toHaveLength(4)
    expect(new Set(uk.podcasts.map(p => p.slug)).size).toBe(4)
  })
  it('drops sections with fewer than three entries', () => {
    const sections = buildSections([mk('a', { country: 'UK' }), mk('b', { country: 'UK' })], {})
    expect(sections.find(s => s.id === 'uk')).toBeUndefined()
  })
  it('matches Serialised and Serialized in the limited-series section', () => {
    const all = [mk('a', { format_type: 'Serialized' }), mk('b', { format_type: 'Serialised' }), mk('c', { format_type: 'serialized' })]
    const s = buildSections(all, {}).find(x => x.id === 'limited-series')!
    expect(s.podcasts).toHaveLength(3)
  })
  it('every section definition has a unique id', () => {
    const ids = BEST_SECTIONS.map(s => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('best page copy', () => {
  const all = Array.from({ length: 12 }, (_, i) => mk(`p${i}`, { country: 'UK', binge_factor: 9, case_types: ['Cold Case', 'Serial Killer', 'Investigative'], best_episode_to_start: 'Episode 1' }))
  const { picks } = pickTopPicks(all)
  const sections = buildSections(all, {})
  const facts = computeFacts(all, 0)
  const faqs = buildBestFaqs(picks, sections, facts, '8 November 2026')

  it('never claims popularity, downloads or listener numbers', () => {
    const text = faqs.map(f => f.a).join(' ').toLowerCase()
    for (const banned of ['million', 'downloads', 'most popular', 'award', 'chart']) expect(text).not.toContain(banned)
  })
  it('describes community ratings truthfully when none reach the threshold', () => {
    expect(faqs.find(f => f.q.startsWith('Do community ratings'))!.a).toMatch(/^Not yet/)
  })
  it('states the real counts and date', () => {
    const last = faqs[faqs.length - 1].a
    expect(last).toContain('12 true crime podcasts')
    expect(last).toContain('8 November 2026')
  })
  it('has no empty questions or answers', () => {
    for (const f of faqs) { expect(f.q.length).toBeGreaterThan(10); expect(f.a.trim().length).toBeGreaterThan(40) }
  })
  it('joins names naturally', () => {
    expect(joinNames(['A'])).toBe('A')
    expect(joinNames(['A', 'B'])).toBe('A and B')
    expect(joinNames(['A', 'B', 'C'])).toBe('A, B and C')
  })
})

describe('entry text', () => {
  it('flags award, ranking and audience-size claims', () => {
    for (const s of ['Three-time Peabody Award winner', 'One of the BBC\'s most-downloaded series ever', 'Shortlisted at the 2026 True Crime Awards', 'the gold standard for audio', 'Listened to by millions', '2026\'s biggest UK story'])
      expect(hasUnverifiableClaim(s)).toBe(true)
    for (const s of ['Follows a murder trial day by day', 'A BBC journalist tracks down a missing founder', null, ''])
      expect(hasUnverifiableClaim(s as string | null)).toBe(false)
  })
  it('never repeats a claim-bearing summary', () => {
    const e = describeEntry(mk('x', { newsletter_worthy_summary: 'A Pulitzer and Peabody double winner', short_description: 'A reporter revisits an old case.' }))
    expect(e.summary).toBe('A reporter revisits an old case.')
  })
  it('routes audience-style short descriptions to who-it-is-for', () => {
    const e = describeEntry(mk('x', { newsletter_worthy_summary: 'Follows one trial day by day.', short_description: 'Listeners who want journalism-grade investigation.' }))
    expect(e.summary).toBe('Follows one trial day by day.')
    expect(e.who).toBe('Listeners who want journalism-grade investigation.')
  })
  it('prefers the editor audience-fit verdict and returns empty strings when nothing can be said', () => {
    expect(describeEntry(mk('x', { quick_verdict: 'Good if UK true crime interests you' })).who).toBe('Good if UK true crime interests you')
    const bare = describeEntry(mk('x', { case_types: null, format_type: null, country: null }))
    expect(bare).toEqual({ summary: '', who: '' })
  })
  it('skips the repeated format lines when deriving who-it-is-for', () => {
    const e = describeEntry(mk('x', { format_type: 'Serialised', case_types: ['Murder'], country: 'US' }))
    expect(e.who).toBe('')
  })
})
