import { describe, it, expect } from 'vitest'
import { findDuplicate, diceCoefficient, type ComparableRecord } from './duplicateCheck'

function existing(name: string, overrides: Partial<ComparableRecord> = {}): ComparableRecord[] {
  return [{ id: 'existing-1', name, rssUrl: null, appleUrl: null, websiteUrl: null, ...overrides }]
}

describe('findDuplicate — name-based matching', () => {
  it('flags exact duplicates as high confidence', () => {
    const match = findDuplicate('Casefile', null, null, null, existing('Casefile'))
    expect(match.confidence).toBe('high')
  })

  it('flags exact duplicates regardless of case/whitespace as high confidence', () => {
    const match = findDuplicate('casefile   true crime podcast', null, null, null, existing('Casefile True Crime Podcast'))
    expect(match.confidence).toBe('high')
  })

  it('catches a shortened existing name inside a fuller candidate title (the reported bug)', () => {
    const match = findDuplicate('Unresolved: A True Crime & Mystery Podcast', null, null, null, existing('Unresolved'))
    expect(match.confidence).not.toBe('none')
    expect(match.matchedName).toBe('Unresolved')
  })

  it('catches the reverse direction: full existing title vs shortened candidate name', () => {
    const match = findDuplicate('Casefile', null, null, null, existing('Casefile True Crime Podcast'))
    expect(match.confidence).not.toBe('none')
  })

  it('treats punctuation-only differences as high confidence', () => {
    const match = findDuplicate('Root Of Evil!', null, null, null, existing('Root of Evil'))
    expect(match.confidence).toBe('high')
  })

  it('flags a subtitle difference as at least a possible duplicate, not silently ignored', () => {
    const match = findDuplicate('Serial: Bowe Bergdahl', null, null, null, existing('Serial'))
    expect(match.confidence).not.toBe('none')
  })

  it('does NOT flag genuinely different podcasts that merely share generic true-crime words', () => {
    const match = findDuplicate('True Crime and Cocktails', null, null, null, existing('True Crime Bullsh*'))
    expect(match.confidence).toBe('none')
  })

  it('never auto-rejects genuinely different podcasts even with coincidental substring overlap', () => {
    // "Cold Case Files" literally contains the substring "casefile" — a
    // human glancing at these two names would reasonably want to double
    // check, so "medium" (flagged for review) is fine; "high" (auto-reject)
    // would wrongly discard a real, different podcast.
    const match = findDuplicate('Cold Case Files', null, null, null, existing('Casefile'))
    expect(match.confidence).not.toBe('high')
  })

  it('does NOT flag short generic word overlap as a containment match (guards the 6-char minimum)', () => {
    // "Cold" (existing, 4 chars) should not trigger containment on its own.
    const match = findDuplicate('Cold Case Chronicles', null, null, null, existing('Cold'))
    expect(match.confidence).not.toBe('high')
  })
})

describe('findDuplicate — identifier-based matching (decisive regardless of name)', () => {
  it('flags identical RSS feed URLs as high confidence even with different names', () => {
    const match = findDuplicate(
      'A Completely Different Title',
      'https://feeds.example.com/show.xml',
      null,
      null,
      existing('Some Other Name', { rssUrl: 'https://feeds.example.com/show.xml' })
    )
    expect(match.confidence).toBe('high')
  })

  it('flags identical Apple Podcasts IDs as high confidence', () => {
    const match = findDuplicate(
      'Different Name Entirely',
      null,
      'https://podcasts.apple.com/podcast/id123456789',
      null,
      existing('Original Name', { appleUrl: 'https://podcasts.apple.com/id123456789?extra=param' })
    )
    expect(match.confidence).toBe('high')
  })

  it('flags identical official websites (normalized) as high confidence', () => {
    const match = findDuplicate(
      'New Title',
      null,
      null,
      'https://www.example-show.com/',
      existing('Old Title', { websiteUrl: 'http://example-show.com' })
    )
    expect(match.confidence).toBe('high')
  })
})

describe('diceCoefficient', () => {
  it('returns 1 for identical strings', () => {
    expect(diceCoefficient('hello', 'hello')).toBe(1)
  })
  it('returns 0 for completely disjoint strings', () => {
    expect(diceCoefficient('abcd', 'wxyz')).toBe(0)
  })
})
