import { describe, it, expect } from 'vitest'
import { PODCASTS_LIKE_META } from './podcasts-like-meta'

describe('PODCASTS_LIKE_META', () => {
  for (const [slug, m] of Object.entries(PODCASTS_LIKE_META)) {
    it(`${slug} fits title and description lengths`, () => {
      expect(m.title.length).toBeLessThan(60)
      expect(m.description.length).toBeGreaterThanOrEqual(140)
      expect(m.description.length).toBeLessThanOrEqual(155)
    })
  }
})
