import { describe, it, expect } from 'vitest'
import { SOCIAL_PROFILES } from './social-profiles'
import { listenActionSchema } from './listen-action'
import { organizationSchema } from '../seo'

describe('Organization.sameAs', () => {
  it('lists only valid, unique https profile URLs', () => {
    expect(SOCIAL_PROFILES.length).toBeGreaterThan(0)
    for (const u of SOCIAL_PROFILES) expect(new URL(u).protocol).toBe('https:')
    expect(new Set(SOCIAL_PROFILES).size).toBe(SOCIAL_PROFILES.length)
    expect(SOCIAL_PROFILES).toContain('https://www.instagram.com/listentruecrime')
  })
  it('is on the shared Organization schema', () => {
    expect(organizationSchema.sameAs).toEqual([...SOCIAL_PROFILES])
  })
})

describe('listenActionSchema', () => {
  it('returns null with no listen URLs, so nothing is invented', () => {
    expect(listenActionSchema([])).toBeNull()
  })
  it('puts Apple Podcasts and Spotify first and keeps real URLs only', () => {
    const a = listenActionSchema([
      { name: 'YouTube', url: 'https://youtube.com/x' },
      { name: 'Spotify', url: 'https://open.spotify.com/show/1' },
      { name: 'Apple Podcasts', url: 'https://podcasts.apple.com/us/podcast/x/id1' },
    ])!
    expect(a['@type']).toBe('ListenAction')
    expect(a.target.map(t => t.name)).toEqual(['Apple Podcasts', 'Spotify', 'YouTube'])
    for (const t of a.target) {
      expect(t['@type']).toBe('EntryPoint')
      expect(t.url).toBe(t.urlTemplate)
      expect(new URL(t.url).protocol).toBe('https:')
    }
  })
  it('drops duplicate URLs', () => {
    const a = listenActionSchema([
      { name: 'Apple Podcasts', url: 'https://podcasts.apple.com/a' },
      { name: 'Apple', url: 'https://podcasts.apple.com/a' },
    ])!
    expect(a.target).toHaveLength(1)
  })
  it('survives JSON round-trip', () => {
    const a = listenActionSchema([{ name: 'Apple Podcasts', url: 'https://podcasts.apple.com/a' }])
    expect(JSON.parse(JSON.stringify(a))).toEqual(a)
  })
})
