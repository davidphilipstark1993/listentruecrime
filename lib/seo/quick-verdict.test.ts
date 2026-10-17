import { describe, expect, it } from 'vitest'
import { buildQuickVerdict } from './quick-verdict'

const base = {
  newsletter_worthy_summary: 'A meticulous reinvestigation of a thirty-year-old disappearance. It rewards patient listeners.',
  short_description: 'Short blurb.',
  binge_factor: 9,
  episode_count: '42',
  episode_length: '45-60 min',
}

describe('buildQuickVerdict', () => {
  it('builds three sentences from existing fields', () => {
    const text = buildQuickVerdict(base, ['Anyone fascinated by missing persons investigations', 'Fans of original investigative journalism'])!
    expect(text).toBe(
      'A meticulous reinvestigation of a thirty-year-old disappearance. ' +
      'Best for anyone fascinated by missing persons investigations and fans of original investigative journalism. ' +
      'Editor score 9/10, 42 episodes of 45-60 min.'
    )
  })

  it('falls back to the short description and skips unknown facts', () => {
    const text = buildQuickVerdict(
      { ...base, newsletter_worthy_summary: null, binge_factor: null, episode_count: null },
      []
    )
    expect(text).toBe('Short blurb.')
  })

  it('keeps free-text episode status as written rather than inventing a count', () => {
    const text = buildQuickVerdict({ ...base, episode_count: 'Ongoing', episode_length: null, binge_factor: null }, [])!
    expect(text).toContain('Episodes: Ongoing')
    expect(text).not.toMatch(/\d+ episodes/)
  })

  it('returns null when there is nothing to say', () => {
    expect(buildQuickVerdict({ newsletter_worthy_summary: null, short_description: null, binge_factor: null, episode_count: null, episode_length: null }, [])).toBeNull()
  })
})
