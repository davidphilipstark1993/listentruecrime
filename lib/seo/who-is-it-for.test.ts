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
  it.each([
    'UK true crime listeners who want a careful, family-centred documentary about a case that changed British law, rather than a graphic retelling of the crime.',
    'Canadian true crime fans; international listeners curious about crime north of the border; those who appreciate a lighter touch on dark material.',
    'Criminal justice reform advocates; true crime fans troubled by prosecutorial misconduct and the fallibility of the justice system.',
    'History and current affairs enthusiasts who want true crime-style storytelling applied to institutional corruption and political failures.',
  ])('leads with the live editor line: %s', line => {
    expect(getWhoIsItFor({ short_description: line, case_types: ['Courtroom'] })[0]).toBe(line.replace(/\.$/, ''))
  })
  it.each([
    'For fifteen years, a Manhattan phone line let anonymous callers confess anything — until the man on the other end became consumed by his own creation.',
    'Stories of people who have completely vanished, covering both crime disappearances and chosen disappearances.',
    'A multi-award-winning BBC investigation into ISIS recruitment, told through the people who were pulled in.',
  ])('does not use a synopsis as the audience line: %s', line => {
    expect(getWhoIsItFor({ short_description: line })).toEqual([])
  })
})
