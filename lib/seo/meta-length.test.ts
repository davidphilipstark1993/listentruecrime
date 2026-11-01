import { describe, expect, it } from 'vitest'
import { trimMeta } from './meta-length'

describe('trimMeta', () => {
  it('leaves short text alone and passes through empties', () => {
    expect(trimMeta('Short and sweet.')).toBe('Short and sweet.')
    expect(trimMeta(null)).toBeUndefined()
  })
  it('trims long text at a word boundary within the limit', () => {
    const long = 'word '.repeat(60)
    const out = trimMeta(long)
    expect(out.length).toBeLessThanOrEqual(155)
    expect(out.endsWith('…')).toBe(true)
    expect(out).not.toMatch(/\s…$/)
  })
})
