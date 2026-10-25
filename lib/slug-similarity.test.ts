import { describe, it, expect } from 'vitest'
import { findSimilarSlugs } from './slug-similarity'

const existing = ['counterclock', 'bear-brook', 'serial', 'serial-killers', 'uk-true-crime-podcast', 'casefile-true-crime']

describe('findSimilarSlugs', () => {
  it('flags a hyphenation variant', () => {
    expect(findSimilarSlugs('counter-clock', existing)).toEqual(['counterclock'])
  })
  it('flags a whole-word prefix extension', () => {
    expect(findSimilarSlugs('bear-brook-nhpr', existing)).toEqual(['bear-brook'])
  })
  it('flags a near-typo on long slugs', () => {
    expect(findSimilarSlugs('uk-true-crime-podcasts', existing)).toEqual(['uk-true-crime-podcast'])
  })
  it('does not flag short, genuinely different slugs', () => {
    expect(findSimilarSlugs('serial', ['serials-x'])).toEqual([])
    expect(findSimilarSlugs('cold-case', existing)).toEqual([])
  })
  it('ignores an exact match (the podcast being edited)', () => {
    expect(findSimilarSlugs('bear-brook', existing)).toEqual([])
  })
})
