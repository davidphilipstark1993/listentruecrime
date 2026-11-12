import { describe, it, expect } from 'vitest'
import { llmsBlurb } from './llms'

describe('llmsBlurb', () => {
  it('strips HTML and collapses whitespace', () => {
    expect(llmsBlurb('<p>A scripted\n show about <b>fraud</b>.&nbsp;</p>')).toBe('A scripted show about fraud.')
  })
  it('skips newsletter-voice copy', () => {
    expect(llmsBlurb('This is the gentlest pick this week, a walk through Devon folklore.')).toBeNull()
  })
  it('returns null for empty input', () => {
    expect(llmsBlurb(null)).toBeNull()
    expect(llmsBlurb('<p> </p>')).toBeNull()
  })
  it('removes uncited download figures', () => {
    expect(llmsBlurb('With over 600 million downloads, the show sets the standard.')).toBe('The show sets the standard.')
  })
})
