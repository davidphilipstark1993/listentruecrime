import { describe, it, expect, vi, afterEach } from 'vitest'
import { validateArtworkUrl } from './validate'

// SSRF's assertSafeExternalUrl does a real DNS lookup — stubbed here so
// tests don't depend on network/DNS availability. example.com resolves to
// a public IP; 127.0.0.1 is exercised as a literal IP (no DNS involved).
// vi.mock calls are hoisted above imports by vitest, so this still applies
// before validate.ts (transitively) imports node:dns/promises.
vi.mock('node:dns/promises', () => ({
  default: { lookup: vi.fn(async () => [{ address: '93.184.216.34', family: 4 }]) },
  lookup: vi.fn(async () => [{ address: '93.184.216.34', family: 4 }]),
}))

// A minimal valid 1x1... too small to pass the dimension floor deliberately
// isn't useful here, so tests build a real PNG buffer at an acceptable size
// using a hand-rolled minimal encoder-free approach: we just need correct
// magic bytes + IHDR width/height for probeImage to read, not a decodable
// pixel payload, since validate.ts never renders the image.
function fakePng(width: number, height: number): Buffer {
  const buf = Buffer.alloc(33)
  buf.write('\x89PNG\r\n\x1a\n', 0, 'binary')
  buf.writeUInt32BE(13, 8) // IHDR chunk length
  buf.write('IHDR', 12, 'ascii')
  buf.writeUInt32BE(width, 16)
  buf.writeUInt32BE(height, 20)
  return buf
}

interface FakeResponse {
  ok: boolean
  status: number
  url: string
  headers?: Headers
  body?: ReadableStream<Uint8Array>
}

function mockFetch(impl: () => Promise<FakeResponse>) {
  vi.stubGlobal('fetch', vi.fn(impl) as unknown as typeof fetch)
}

function bodyFrom(buf: Buffer): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(buf))
      controller.close()
    },
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('validateArtworkUrl', () => {
  it('rejects a non-https URL before ever fetching', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const { result } = await validateArtworkUrl('http://example.com/art.jpg')
    expect(result.valid).toBe(false)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('rejects a URL pointing at a private IP', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const { result } = await validateArtworkUrl('https://127.0.0.1/art.jpg')
    expect(result.valid).toBe(false)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('rejects a 404', async () => {
    mockFetch(async () => ({ ok: false, status: 404, url: 'https://example.com/art.jpg' }))
    const { result } = await validateArtworkUrl('https://example.com/art.jpg')
    expect(result.valid).toBe(false)
    expect(result.reason).toContain('404')
  })

  it('rejects an HTML error page served with a 200', async () => {
    mockFetch(async () => ({
      ok: true, status: 200, url: 'https://example.com/art.jpg',
      headers: new Headers({ 'content-type': 'text/html' }),
      body: bodyFrom(Buffer.from('<html>not found</html>')),
    }))
    const { result } = await validateArtworkUrl('https://example.com/art.jpg')
    expect(result.valid).toBe(false)
    expect(result.reason).toMatch(/HTML/i)
  })

  it('rejects a declared content-length over the max download size', async () => {
    mockFetch(async () => ({
      ok: true, status: 200, url: 'https://example.com/art.jpg',
      headers: new Headers({ 'content-type': 'image/jpeg', 'content-length': String(50 * 1024 * 1024) }),
      body: bodyFrom(Buffer.from('irrelevant')),
    }))
    const { result } = await validateArtworkUrl('https://example.com/art.jpg')
    expect(result.valid).toBe(false)
    expect(result.reason).toMatch(/exceeds/i)
  })

  it('rejects an image below the minimum dimension floor', async () => {
    mockFetch(async () => ({
      ok: true, status: 200, url: 'https://example.com/art.png',
      headers: new Headers({ 'content-type': 'image/png' }),
      body: bodyFrom(fakePng(100, 100)),
    }))
    const { result } = await validateArtworkUrl('https://example.com/art.png')
    expect(result.valid).toBe(false)
    expect(result.reason).toMatch(/too small/i)
  })

  it('accepts a genuine, adequately sized PNG', async () => {
    mockFetch(async () => ({
      ok: true, status: 200, url: 'https://example.com/art.png',
      headers: new Headers({ 'content-type': 'image/png' }),
      body: bodyFrom(fakePng(600, 600)),
    }))
    const { result } = await validateArtworkUrl('https://example.com/art.png')
    expect(result.valid).toBe(true)
    expect(result.width).toBe(600)
    expect(result.height).toBe(600)
    expect(result.isSquare).toBe(true)
  })

  it('rejects a zero-byte response', async () => {
    mockFetch(async () => ({
      ok: true, status: 200, url: 'https://example.com/art.png',
      headers: new Headers({ 'content-type': 'image/png' }),
      body: bodyFrom(Buffer.alloc(0)),
    }))
    const { result } = await validateArtworkUrl('https://example.com/art.png')
    expect(result.valid).toBe(false)
  })

  it('treats a fetch rejection (network error/timeout) as invalid, not a throw', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network error') }))
    const { result } = await validateArtworkUrl('https://example.com/art.png')
    expect(result.valid).toBe(false)
  })
})
