import { describe, expect, it } from 'vitest'
import { buildTrackedUrl, slugifyCampaign } from './utm'
import { adStatus, inWindow } from './schedule'
import { dedupeKey, isBot, cleanPagePath, CLICK_WINDOW_MS, IMPRESSION_WINDOW_MS } from './track'
import { validateAdImage } from './upload'
import { adSchema, adPatchSchema } from './schema'
import { isNetworkUrl } from './config'
import { fillDays } from './stats'

const utm = { source: 'listentruecrime', medium: 'cross_promo', campaign: 'soft-play', content: 'article' }

describe('buildTrackedUrl', () => {
  it('adds all four UTM params', () => {
    const u = new URL(buildTrackedUrl('https://softplaynearme.co.uk/', utm))
    expect(u.searchParams.get('utm_source')).toBe('listentruecrime')
    expect(u.searchParams.get('utm_medium')).toBe('cross_promo')
    expect(u.searchParams.get('utm_campaign')).toBe('soft-play')
    expect(u.searchParams.get('utm_content')).toBe('article')
  })
  it('preserves existing query params and the fragment', () => {
    const out = buildTrackedUrl('https://aifounderfiles.com/guide?ref=abc&x=a%20b#top', utm)
    expect(out).toContain('ref=abc&x=a%20b&utm_source=')
    expect(out.endsWith('#top')).toBe(true)
  })
  it('never duplicates or overwrites existing utm params', () => {
    const out = new URL(buildTrackedUrl('https://x.com/?utm_source=newsletter&utm_campaign=spring', utm))
    expect(out.searchParams.getAll('utm_source')).toEqual(['newsletter'])
    expect(out.searchParams.getAll('utm_campaign')).toEqual(['spring'])
    expect(out.searchParams.get('utm_medium')).toBe('cross_promo')
  })
  it('is idempotent', () => {
    const once = buildTrackedUrl('https://x.com/p?a=1', utm)
    expect(buildTrackedUrl(once, utm)).toBe(once)
  })
  it('leaves non-http(s) and invalid URLs alone', () => {
    expect(buildTrackedUrl('javascript:alert(1)', utm)).toBe('javascript:alert(1)')
    expect(buildTrackedUrl('not a url', utm)).toBe('not a url')
  })
  it('slugifies campaign names', () => {
    expect(slugifyCampaign('Find a Soft Play — Near You!')).toBe('find-a-soft-play-near-you')
    expect(slugifyCampaign('!!!')).toBe('cross-promo')
  })
})

describe('adStatus / inWindow', () => {
  const now = new Date('2026-11-10T12:00:00Z')
  const base = { is_active: true, archived_at: null, starts_at: null, ends_at: null }
  it('live when active with no schedule', () => expect(adStatus(base, now)).toBe('live'))
  it('inactive is never live', () => expect(adStatus({ ...base, is_active: false }, now)).toBe('inactive'))
  it('archived beats everything', () => expect(adStatus({ ...base, archived_at: '2026-01-01T00:00:00Z' }, now)).toBe('archived'))
  it('scheduled before start', () => expect(adStatus({ ...base, starts_at: '2026-11-11T00:00:00Z' }, now)).toBe('scheduled'))
  it('expired at/after end', () => {
    expect(adStatus({ ...base, ends_at: '2026-11-10T12:00:00Z' }, now)).toBe('expired')
    expect(adStatus({ ...base, ends_at: '2026-11-10T11:59:59Z' }, now)).toBe('expired')
    expect(adStatus({ ...base, ends_at: '2026-11-10T12:00:01Z' }, now)).toBe('live')
  })
  it('window check for the browser', () => {
    expect(inWindow('2026-11-10T13:00:00Z', null, now.getTime())).toBe(false)
    expect(inWindow(null, '2026-11-10T11:00:00Z', now.getTime())).toBe(false)
    expect(inWindow('2026-11-10T11:00:00Z', '2026-11-10T13:00:00Z', now.getTime())).toBe(true)
  })
})

describe('tracking dedupe', () => {
  const b = { ad_id: '11111111-1111-4111-8111-111111111111', event: 'click' as const, placement: 'article', page_path: '/blog/x', session_id: 'sess-abcdef12' }
  const t = 1_800_000_000_000
  it('same click inside the window shares a key', () => {
    expect(dedupeKey(b, t)).toBe(dedupeKey(b, t + 1000))
  })
  it('click after the window gets a new key', () => {
    expect(dedupeKey(b, t)).not.toBe(dedupeKey(b, t + CLICK_WINDOW_MS))
  })
  it('different visitors never collide', () => {
    expect(dedupeKey(b, t)).not.toBe(dedupeKey({ ...b, session_id: 'other-session-1' }, t))
  })
  it('impressions dedupe per page and ignore query strings', () => {
    const i = { ...b, event: 'impression' as const }
    expect(dedupeKey(i, t)).toBe(dedupeKey({ ...i, page_path: '/blog/x?utm=1' }, t + 60_000))
    expect(dedupeKey(i, t)).not.toBe(dedupeKey({ ...i, page_path: '/blog/y' }, t))
    expect(dedupeKey(i, t)).not.toBe(dedupeKey(i, t + IMPRESSION_WINDOW_MS))
  })
  it('does not contain the session id', () => expect(dedupeKey(b, t)).not.toContain('sess'))
  it('detects bots', () => {
    expect(isBot('Mozilla/5.0 (compatible; Googlebot/2.1)')).toBe(true)
    expect(isBot(null)).toBe(true)
    expect(isBot('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile Safari')).toBe(false)
  })
  it('cleans paths', () => expect(cleanPagePath('/a/b?x=1#y')).toBe('/a/b'))
})

function png(w: number, h: number, size = 100): Buffer {
  const b = Buffer.alloc(Math.max(size, 33))
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(b)
  b.writeUInt32BE(w, 16)
  b.writeUInt32BE(h, 20)
  return b
}
describe('validateAdImage', () => {
  it('accepts a 1600x900 png', () => expect(validateAdImage(png(1600, 900))).toMatchObject({ ok: true, ext: 'png', width: 1600, height: 900 }))
  it('rejects svg / non-images', () => {
    expect(validateAdImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'))).toMatchObject({ ok: false })
    expect(validateAdImage(Buffer.from('MZ not an image at all, just text'.repeat(5)))).toMatchObject({ ok: false })
  })
  it('rejects gif', () => {
    const g = Buffer.alloc(40); g.write('GIF89a'); g.writeUInt16LE(1600, 6); g.writeUInt16LE(900, 8)
    expect(validateAdImage(g)).toMatchObject({ ok: false })
  })
  it('rejects too small and too big', () => {
    expect(validateAdImage(png(300, 100))).toMatchObject({ ok: false })
    expect(validateAdImage(png(9000, 4000))).toMatchObject({ ok: false })
    expect(validateAdImage(png(1600, 900, 5 * 1024 * 1024))).toMatchObject({ ok: false })
  })
  it('rejects empty', () => expect(validateAdImage(Buffer.alloc(0))).toMatchObject({ ok: false }))
})

describe('adSchema', () => {
  const ok = {
    title: 'Find soft play', destination_url: 'https://softplaynearme.co.uk', button_text: 'Discover More',
    image_path: '3f2b8c1e-4d5a-4b6c-8d7e-9f0a1b2c3d4e.jpg', image_width: 1600, image_height: 900,
    placements: ['article', 'article'],
  }
  it('accepts a valid advert, dedupes placements, applies defaults', () => {
    const r = adSchema.parse(ok)
    expect(r.placements).toEqual(['article'])
    expect(r.is_active).toBe(false)
    expect(r.sort_order).toBe(10)
  })
  it('rejects javascript:/http/relative destinations', () => {
    for (const u of ['javascript:alert(1)', 'http://x.com', '/relative', 'https://']) {
      expect(adSchema.safeParse({ ...ok, destination_url: u }).success).toBe(false)
    }
  })
  it('rejects unknown placements and empty placements', () => {
    expect(adSchema.safeParse({ ...ok, placements: ['nope'] }).success).toBe(false)
    expect(adSchema.safeParse({ ...ok, placements: [] }).success).toBe(false)
  })
  it('rejects arbitrary storage paths', () => {
    expect(adSchema.safeParse({ ...ok, image_path: '../podcast-artwork/x.png' }).success).toBe(false)
  })
  it('requires end after start', () => {
    expect(adSchema.safeParse({ ...ok, starts_at: '2026-11-10T10:00:00Z', ends_at: '2026-11-09T10:00:00Z' }).success).toBe(false)
    expect(adSchema.safeParse({ ...ok, starts_at: '2026-11-10T10:00:00Z', ends_at: '2026-11-12T10:00:00Z' }).success).toBe(true)
  })
  it('patch allows partial updates', () => {
    expect(adPatchSchema.parse({ is_active: true })).toEqual({ is_active: true })
    expect(adPatchSchema.parse({ archived: true })).toEqual({ archived: true })
  })
})

describe('misc', () => {
  it('recognises network hosts only', () => {
    expect(isNetworkUrl('https://www.softplaynearme.co.uk/x')).toBe(true)
    expect(isNetworkUrl('https://evil-softplaynearme.co.uk')).toBe(false)
    expect(isNetworkUrl('https://example.com')).toBe(false)
  })
  it('zero-fills missing days', () => {
    const out = fillDays([{ day: '2026-11-01', impressions: 5, clicks: 1 }], 7)
    expect(out).toHaveLength(7)
    expect(out.filter(d => d.impressions > 0)).toHaveLength(out.some(d => d.day === '2026-11-01') ? 1 : 0)
  })
})
