import { describe, it, expect } from 'vitest'
import { getWhoIsItFor } from './who-is-it-for'

const joined = (p: Parameters<typeof getWhoIsItFor>[0]) => getWhoIsItFor(p).join(' | ')

describe('getWhoIsItFor', () => {
  it('does not give a Courtroom-only show the wrongful-conviction line', () => {
    const out = joined({ case_types: ['Courtroom', 'Murder'] })
    expect(out).toContain('trials, evidence and legal procedure')
    expect(out).not.toMatch(/wrongful[- ]conviction/i)
  })
  it('keeps a wrongful-conviction line for shows tagged Wrongful Conviction', () => {
    const out = joined({ case_types: ['Courtroom', 'Wrongful Conviction'] })
    expect(out).toMatch(/wrongful-conviction/)
    expect(out).not.toContain('trials, evidence and legal procedure')
  })
  it('leads with an editor-written audience line', () => {
    const lines = getWhoIsItFor({
      short_description: 'True crime fans who want a short, finished 48 Hours investigation.',
      format_type: 'Serialized', case_types: ['Courtroom'],
    })
    expect(lines[0]).toBe('True crime fans who want a short, finished 48 Hours investigation')
    expect(lines).toHaveLength(3)
  })
  it('does not treat a synopsis as an audience line', () => {
    expect(getWhoIsItFor({ short_description: 'BBC journalist Jamie Bartlett tracks down Dr Ruja Ignatova.' })).toEqual([])
  })
  it('caps the list at four lines', () => {
    expect(getWhoIsItFor({
      format_type: 'Episodic', case_types: ['Cold Case', 'Missing Person', 'Investigative', 'Serial Killer'], country: 'UK',
    })).toHaveLength(4)
  })
})
