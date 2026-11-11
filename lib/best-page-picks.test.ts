import { describe, expect, it } from 'vitest'
import { BEST_PICKS, BEST_TYPE_SECTIONS, audienceLine, isMustListen, orderPicks } from './best-page-picks'

describe('best page picks', () => {
  it('keeps editorial order and skips missing slugs', () => {
    const pool = [{ slug: 'b' }, { slug: 'a' }, { slug: 'c' }]
    expect(orderPicks(pool, ['a', 'missing', 'c', 'b']).map(p => p.slug)).toEqual(['a', 'c', 'b'])
  })
  it('has no duplicate picks', () => {
    expect(new Set(BEST_PICKS).size).toBe(BEST_PICKS.length)
  })
  it('labels only audience-style descriptions as "Best for"', () => {
    expect(audienceLine('True crime fans who like cold cases.')).toBe('True crime fans who like cold cases.')
    expect(audienceLine('BBC journalist Jamie Bartlett tracks down Dr Ruja Ignatova.')).toBeNull()
  })
  it('matches case types case-insensitively', () => {
    const cold = BEST_TYPE_SECTIONS.find(s => s.id === 'cold-cases')!
    expect(cold.predicate({ slug: 'x', country: 'US', case_types: ['cold case'], quick_verdict: null })).toBe(true)
    expect(isMustListen({ quick_verdict: ' must listen ' })).toBe(true)
  })
})
