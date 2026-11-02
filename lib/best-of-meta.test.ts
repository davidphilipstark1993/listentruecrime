import { describe, it, expect } from 'vitest'
import { bestOfMeta, fillBestOfTokens, joinNames } from './best-of-meta'
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
