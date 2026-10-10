import { describe, it, expect } from 'vitest'
import { autoPreviewText, autoSubject, DEFAULT_SUBJECT, resolvePreviewText, resolveSubject } from './subject'

const five = ['Serial', 'Sweet Bobby', 'Pipeline', 'In the Dark', 'S-Town']

describe('autoSubject', () => {
  it('names the first two podcasts and counts the rest', () => {
    expect(autoSubject(five)).toBe('Serial, Sweet Bobby and 3 more true crime podcasts')
  })
  it('drops to one name when two would be too long', () => {
    const long = ['The Trial of Erin Patterson', 'Untold: The Daniel Morgan Murder', 'a', 'b', 'c']
    expect(autoSubject(long)).toBe('The Trial of Erin Patterson and 4 more true crime podcasts')
  })
  it('falls back to the default when names are missing or very long', () => {
    expect(autoSubject([])).toBe(DEFAULT_SUBJECT)
    expect(autoSubject(['Only one'])).toBe(DEFAULT_SUBJECT)
    expect(autoSubject(['x'.repeat(80), 'y', 'z'])).toBe(DEFAULT_SUBJECT)
  })
  it('ignores blank names and handles two or three podcasts mid-week', () => {
    expect(autoSubject(['  ', 'Serial', null, 'Sweet Bobby'])).toBe('Serial and Sweet Bobby')
    expect(autoSubject(['Serial', 'Sweet Bobby', 'Pipeline'])).toBe('Serial, Sweet Bobby and 1 more true crime podcast')
  })
})

describe('autoPreviewText', () => {
  it('lists every podcast when it fits', () => {
    expect(autoPreviewText(five)).toBe('This week: Serial, Sweet Bobby, Pipeline, In the Dark and S-Town.')
  })
  it('keeps whole names and counts the rest when too long', () => {
    const long = Array.from({ length: 5 }, (_, i) => `A Rather Long Podcast Name Number ${i + 1}`)
    const text = autoPreviewText(long)!
    expect(text.length).toBeLessThanOrEqual(150)
    expect(text).toMatch(/^This week: A Rather Long Podcast Name Number 1, .* and \d more\.$/)
  })
  it('is null with no podcasts', () => {
    expect(autoPreviewText([])).toBeNull()
  })
})

describe('resolve*', () => {
  it('prefers what the curator typed', () => {
    expect(resolveSubject('  My subject  ', five)).toBe('My subject')
    expect(resolvePreviewText('My preview', five)).toBe('My preview')
  })
  it('falls back to the generated version when blank', () => {
    expect(resolveSubject('   ', five)).toBe(autoSubject(five))
    expect(resolvePreviewText(null, five)).toBe(autoPreviewText(five))
  })
})
