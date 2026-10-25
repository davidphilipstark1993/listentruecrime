import { describe, it, expect } from 'vitest'
import { normalisePath, validateRedirect } from './redirects'

describe('normalisePath', () => {
  it('strips query, hash and trailing slash and adds a leading slash', () => {
    expect(normalisePath('podcasts/a/?x=1#y')).toBe('/podcasts/a')
    expect(normalisePath('/')).toBe('/')
  })
})

describe('validateRedirect', () => {
  const existing = { '/podcasts/a': '/podcasts/b' }
  it('accepts a clean redirect', () => {
    expect(validateRedirect('/podcasts/c', '/podcasts/d', existing)).toBeNull()
  })
  it('rejects self, homepage and protected paths', () => {
    expect(validateRedirect('/x', '/x/', existing)).toMatch(/same/)
    expect(validateRedirect('/', '/x', existing)).toMatch(/homepage/)
    expect(validateRedirect('/admin/podcasts', '/x', existing)).toMatch(/cannot/)
  })
  it('rejects chains and loops', () => {
    expect(validateRedirect('/podcasts/e', '/podcasts/a', existing)).toMatch(/itself redirected/)
    expect(validateRedirect('/podcasts/b', '/podcasts/z', existing)).toMatch(/already redirects/)
    expect(validateRedirect('/podcasts/b', '/podcasts/a', existing)).toMatch(/itself redirected/)
  })
})
