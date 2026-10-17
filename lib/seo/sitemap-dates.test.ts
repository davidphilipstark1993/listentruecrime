import { describe, expect, it } from 'vitest'
import { BEST_OF_PAGES } from '@/lib/best-of'
import {
  bestOfPodcasts, caseLastModified, categoryPodcasts, countryPodcasts, hubLastModified,
  latestDate, platformPodcasts, type SitemapPodcast,
} from './sitemap-dates'

const p = (o: Partial<SitemapPodcast>): SitemapPodcast => ({
  slug: 'x', updated_at: '2026-01-01T00:00:00Z', case_types: [], country: null, platforms: [], binge_factor: null, format_type: null, ...o,
})

const podcasts = [
  p({ slug: 'a', updated_at: '2026-03-01T00:00:00Z', case_types: ['Cold Case'], country: 'UK', platforms: ['Spotify'], binge_factor: 9, format_type: 'Episodic' }),
  p({ slug: 'b', updated_at: '2026-05-01T00:00:00Z', case_types: ['Fraud'], country: 'US', platforms: ['Audible'], binge_factor: 6, format_type: 'Serialized' }),
  p({ slug: 'c', updated_at: '2026-02-01T00:00:00Z', case_types: ['Cold Case'], country: 'US', platforms: ['Spotify', 'Audible'], binge_factor: 8 }),
]

describe('sitemap dates', () => {
  it('latestDate ignores empties and bad values', () => {
    expect(latestDate([null, undefined, 'nonsense', '2026-01-02'])?.toISOString().slice(0, 10)).toBe('2026-01-02')
    expect(latestDate([])).toBeUndefined()
  })

  it('selects the podcasts on each hub', () => {
    expect(categoryPodcasts('cold-cases', podcasts).map(x => x.slug)).toEqual(['a', 'c'])
    expect(categoryPodcasts('uk-crime', podcasts).map(x => x.slug)).toEqual(['a'])
    expect(categoryPodcasts('binge-worthy', podcasts).map(x => x.slug)).toEqual(['a', 'c'])
    expect(countryPodcasts('US', podcasts).map(x => x.slug)).toEqual(['b', 'c'])
    expect(platformPodcasts('Audible', podcasts).map(x => x.slug)).toEqual(['b', 'c'])
    const beginners = BEST_OF_PAGES.find(b => b.slug === 'beginners')!
    expect(bestOfPodcasts(beginners, podcasts).map(x => x.slug)).toEqual(['a'])
  })

  it('hub lastmod is the newest podcast on the hub, falling back to the catalogue', () => {
    expect(hubLastModified(countryPodcasts('US', podcasts), podcasts)?.toISOString().slice(0, 10)).toBe('2026-05-01')
    expect(hubLastModified([], podcasts)?.toISOString().slice(0, 10)).toBe('2026-05-01')
  })

  it('case lastmod prefers its own date, then its linked podcasts', () => {
    expect(caseLastModified({ updatedDate: '2026-06-01', podcasts: [] }, podcasts)?.toISOString().slice(0, 10)).toBe('2026-06-01')
    expect(caseLastModified({ podcasts: [{ slug: 'c' }] }, podcasts)?.toISOString().slice(0, 10)).toBe('2026-02-01')
  })
})
