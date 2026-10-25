import { describe, it, expect } from 'vitest'
import { buildPodcastMeta, generatedDescription } from './podcast-meta'

const base = {
  title: 'Example', short_description: null, description: null, host_name: null, producer: null,
  format_type: null, seo_title: null, meta_description: null, og_title: null, og_description: null,
  canonical_url: null, noindex: false,
}

describe('buildPodcastMeta', () => {
  it('generates neutral text from empty fields', () => {
    const m = buildPodcastMeta(base, 'example', 'https://x.test')
    expect(m.description).toBe('Example is a true crime podcast.')
    expect(m.canonical).toBe('https://x.test/podcasts/example')
    expect(m.robots).toBeUndefined()
  })
  it('uses host, producer and format only', () => {
    expect(generatedDescription({ ...base, host_name: 'A B', producer: 'Co', format_type: 'Serialized' }))
      .toBe('Example is a serialised true crime podcast, hosted by A B and produced by Co.')
  })
  it('lets editor fields win', () => {
    const m = buildPodcastMeta({ ...base, seo_title: 'T', meta_description: 'D', og_title: 'OT', canonical_url: 'https://y.test/z', noindex: true }, 'example', 'https://x.test')
    expect(m.title).toEqual({ absolute: 'T' })
    expect(m.description).toBe('D')
    expect(m.ogTitle).toBe('OT')
    expect(m.ogDescription).toBe('D')
    expect(m.canonical).toBe('https://y.test/z')
    expect(m.robots).toEqual({ index: false, follow: true })
  })
})
