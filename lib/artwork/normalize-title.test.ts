import { describe, it, expect } from 'vitest'
import { normalizeTitleForMatch, titleSimilarity } from './normalize-title'

describe('normalizeTitleForMatch', () => {
  it('strips a leading "The" and trailing "Podcast"', () => {
    expect(normalizeTitleForMatch('The Crime Files Podcast')).toBe('crime files')
    expect(normalizeTitleForMatch('Crime Files')).toBe('crime files')
  })

  it('expands ampersands', () => {
    expect(normalizeTitleForMatch('Crime & Punishment')).toBe(normalizeTitleForMatch('Crime and Punishment'))
  })

  it('strips apostrophes without leaving a gap', () => {
    expect(normalizeTitleForMatch("Kill's Files")).toBe('kills files')
  })

  it('keeps distinguishing suffix words like "Daily"', () => {
    expect(normalizeTitleForMatch('Crime Stories')).not.toBe(normalizeTitleForMatch('Crime Stories Daily'))
  })

  it('collapses punctuation and extra whitespace', () => {
    expect(normalizeTitleForMatch('Crime:  Files!!')).toBe('crime files')
  })
})

describe('titleSimilarity', () => {
  it('returns 1 for identical strings', () => {
    expect(titleSimilarity('crime files', 'crime files')).toBe(1)
  })

  it('returns 0 for completely different strings', () => {
    expect(titleSimilarity('crime files', 'gardening tips')).toBeLessThan(0.3)
  })

  it('is high for minor spelling variants', () => {
    expect(titleSimilarity('crime files', 'crime filez')).toBeGreaterThan(0.8)
  })
})
