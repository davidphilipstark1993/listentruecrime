import { describe, it, expect } from 'vitest'
import { bestOfMeta, fillBestOfTokens, joinNames, rankPodcasts } from './best-of-meta'
import { BEST_OF_PAGES } from './best-of'
import { CURRENT_YEAR } from './seo/config'

const names = ['Serial', 'West Cork', 'Bear Brook', 'Other']

describe('best-of meta', () => {
  it('joins names', () => {
    expect(joinNames(['A', 'B', 'C'])).toBe('A, B and C')
    expect(joinNames(['A', 'B'])).toBe('A and B')
  })

  it('fills tokens from the live list', () => {
    expect(fillBestOfTokens('Top: {top3} of {count}', names)).toBe('Top: Serial, West Cork and Bear Brook of 4')
  })

  it('titles carry the current year and the count, never a stale year', () => {
    for (const page of BEST_OF_PAGES) {
      const m = bestOfMeta(page, names.concat(Array(20).fill('x')))
      expect(m.title).toContain(`(${CURRENT_YEAR})`)
      expect(m.title).not.toContain('2025')
      expect(m.title.length).toBeLessThanOrEqual(60)
      expect(m.description.length).toBeLessThanOrEqual(160)
    }
  })

  it('names three shows from the list in the description', () => {
    const page = BEST_OF_PAGES.find(p => p.slug === 'murder-mystery')!
    expect(bestOfMeta(page, names).description).toContain('Serial, West Cork and Bear Brook')
  })

  it('falls back to the static copy when the list is empty', () => {
    const page = BEST_OF_PAGES.find(p => p.slug === 'murder-mystery')!
    const m = bestOfMeta(page, [])
    expect(m.description).toBe(page.description)
    expect(m.title).toBe(`Best Murder Mystery Podcasts (${CURRENT_YEAR})`)
  })
})

describe('rankPodcasts', () => {
  it('breaks binge ties by Must listen, then title', () => {
    const mk = (title: string, binge: number, v: string | null) => ({ title, binge_factor: binge, quick_verdict: v })
    const out = rankPodcasts([mk('B', 10, null), mk('Serial', 10, 'Must listen'), mk('A', 10, null), mk('Z', 9, 'Must listen')])
    expect(out.map(p => p.title)).toEqual(['Serial', 'A', 'B', 'Z'])
  })
})

describe('/best canonical owners', () => {
  const override = (slug: string) => BEST_OF_PAGES.find(p => p.slug === slug)?.canonicalOverride

  it('sends the UK and Australian lists straight to their country pages', () => {
    expect(override('uk-true-crime')).toMatch(/\/country\/UK$/)
    expect(override('australian-true-crime')).toMatch(/\/country\/AU$/)
  })
  it('leaves the cold-case list on its category', () => {
    expect(override('cold-case')).toMatch(/\/category\/cold-cases$/)
  })
  it('never points at a category that itself canonicalises elsewhere', () => {
    for (const page of BEST_OF_PAGES) {
      expect(page.canonicalOverride ?? '').not.toMatch(/\/category\/(uk-crime|australian-crime)$/)
    }
  })
})
