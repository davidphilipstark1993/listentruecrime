import { describe, expect, it } from 'vitest'
import { canonicalHubPath } from './hub-paths'

describe('canonicalHubPath', () => {
  it.each([
    ['/country/US', '/country/us'],
    ['/country/UK', '/country/uk'],
    ['/country/Au', '/country/au'],
    ['/platform/Spotify', '/platform/spotify'],
    ['/platform/Audible', '/platform/audible'],
    ['/platform/iHeart', '/platform/iheart'],
    ['/platform/Apple%20Podcasts', '/platform/apple-podcasts'],
    ['/platform/Apple-Podcasts', '/platform/apple-podcasts'],
    ['/platform/BBC%20Sounds', '/platform/bbc-sounds'],
  ])('redirects %s to %s', (from, to) => {
    expect(canonicalHubPath(from)).toBe(to)
  })

  it.each([
    '/country/us',
    '/platform/spotify',
    '/platform/apple-podcasts',
    '/platform/bbc-sounds',
  ])('leaves canonical %s alone (no redirect loop)', path => {
    expect(canonicalHubPath(path)).toBeNull()
  })

  it.each(['/country/xx', '/platform/not-a-platform', '/category/Cold-Cases', '/country', '/country/us/extra', '/'])(
    'ignores %s',
    path => {
      expect(canonicalHubPath(path)).toBeNull()
    }
  )
})
