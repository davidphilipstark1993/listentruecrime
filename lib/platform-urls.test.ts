import { describe, it, expect } from 'vitest'
import { cleanPlatformUrls, listenLinks } from './platform-urls'

describe('listenLinks', () => {
  it('returns only ticked platforms that have a valid http(s) URL, in ticked order', () => {
    const urls = { Spotify: 'https://open.spotify.com/show/x', 'Apple Podcasts': 'not a url', NPR: 'https://npr.org/x', RSS: 'javascript:alert(1)' }
    expect(listenLinks(['NPR', 'Apple Podcasts', 'Spotify', 'RSS', 'Overcast'], urls))
      .toEqual([{ name: 'NPR', url: 'https://npr.org/x' }, { name: 'Spotify', url: 'https://open.spotify.com/show/x' }])
  })
  it('is empty when nothing is entered or the column is missing', () => {
    expect(listenLinks(['Spotify'], {})).toEqual([])
    expect(listenLinks(null, null)).toEqual([])
    expect(listenLinks(['Spotify'], undefined)).toEqual([])
  })
  it('ignores malformed jsonb', () => {
    expect(cleanPlatformUrls(['https://a.com'])).toEqual({})
    expect(cleanPlatformUrls('x')).toEqual({})
  })
})
