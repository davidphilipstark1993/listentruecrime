import { beforeEach, describe, expect, it, vi } from 'vitest'

// Fake Supabase client: records the filters applied to each count query and
// answers from `counts`, keyed by which filters were used.
const calls: { filters: string[] }[] = []
const counts = { active: 1234, created: 17, unsubscribed: 3 }
let failQueries = false

function fakeAdmin() {
  return {
    from(table: string) {
      expect(table).toBe('newsletter_subscribers')
      return {
        select(columns: string, opts: Record<string, unknown>) {
          // Read-only, count-only queries: never selects personal columns.
          expect(columns).toBe('id')
          expect(opts).toEqual({ count: 'exact', head: true })
          const call = { filters: [] as string[] }
          calls.push(call)
          const q: any = {
            eq(col: string, val: string) { call.filters.push(`eq:${col}=${val}`); return q },
            gte(col: string) { call.filters.push(`gte:${col}`); return q },
            then(resolve: (v: unknown) => void) {
              if (failQueries) return resolve({ count: null, error: { message: 'db down' } })
              const f = call.filters.join(',')
              const n = f.includes('unsubscribed') ? counts.unsubscribed
                : f.startsWith('eq:status=active') ? counts.active
                : counts.created
              resolve({ count: n, error: null })
            },
          }
          return q
        },
      }
    },
  }
}

vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => fakeAdmin() }))

const KEY = 'test-stats-key-0123456789abcdef0123456789abcdef'

async function getRoute() {
  vi.resetModules() // fresh in-memory rate limiter per test
  return (await import('./route')).GET
}

function request(headers: Record<string, string> = {}) {
  return new Request('http://localhost/api/subscriber-count', { headers })
}

beforeEach(() => {
  calls.length = 0
  failQueries = false
  process.env.STATS_API_KEY = KEY
})

describe('GET /api/subscriber-count', () => {
  it('returns 200 with the expected shape for the right key', async () => {
    const GET = await getRoute()
    const res = await GET(request({ 'x-stats-key': KEY }))
    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control')).toBe('no-store')

    const body = await res.json()
    expect(Object.keys(body).sort()).toEqual(
      ['as_of', 'new_last_24h', 'site', 'total_subscribers', 'unsubscribed_last_24h'],
    )
    expect(body.site).toBe('listentruecrime.com')
    expect(body.total_subscribers).toBe(1234)
    expect(body.new_last_24h).toBe(17)
    expect(body.unsubscribed_last_24h).toBe(3)
    expect(new Date(body.as_of).toISOString()).toBe(body.as_of)
  })

  it('counts only active rows for the total and uses 24h windows for the rest', async () => {
    const GET = await getRoute()
    await GET(request({ 'x-stats-key': KEY }))
    const filters = calls.map(c => c.filters.join(','))
    expect(filters).toContain('eq:status=active')
    expect(filters).toContain('gte:created_at')
    expect(filters).toContain('eq:status=unsubscribed,gte:unsubscribed_at')
  })

  it('returns 401 for a wrong key, without touching the database', async () => {
    const GET = await getRoute()
    const res = await GET(request({ 'x-stats-key': 'wrong' }))
    expect(res.status).toBe(401)
    expect(res.headers.get('cache-control')).toBe('no-store')
    expect(calls).toHaveLength(0)
  })

  it('returns 401 when the key header is missing', async () => {
    const GET = await getRoute()
    const res = await GET(request())
    expect(res.status).toBe(401)
    expect(calls).toHaveLength(0)
  })

  it('returns 401 for every request when STATS_API_KEY is not configured', async () => {
    delete process.env.STATS_API_KEY
    const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    const GET = await getRoute()
    expect((await GET(request({ 'x-stats-key': 'anything' }))).status).toBe(401)
    expect((await GET(request())).status).toBe(401)
    err.mockRestore()
  })

  it('never logs the key', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    failQueries = true
    const GET = await getRoute()
    await GET(request({ 'x-stats-key': KEY }))
    await GET(request({ 'x-stats-key': 'wrong-key-attempt' }))
    const logged = JSON.stringify([...err.mock.calls, ...log.mock.calls])
    expect(logged).not.toContain(KEY)
    expect(logged).not.toContain('wrong-key-attempt')
    err.mockRestore()
    log.mockRestore()
  })

  it('returns 500 (not zeros) when the database query fails', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    failQueries = true
    const GET = await getRoute()
    const res = await GET(request({ 'x-stats-key': KEY }))
    expect(res.status).toBe(500)
    err.mockRestore()
  })

  it('rate limits to 30 requests per hour per IP', async () => {
    const GET = await getRoute()
    const headers = { 'x-stats-key': KEY, 'x-forwarded-for': '203.0.113.9' }
    for (let i = 0; i < 30; i++) expect((await GET(request(headers))).status).toBe(200)
    const limited = await GET(request(headers))
    expect(limited.status).toBe(429)
    expect(limited.headers.get('retry-after')).toBeTruthy()
    // A different IP is unaffected.
    expect((await GET(request({ ...headers, 'x-forwarded-for': '198.51.100.7' }))).status).toBe(200)
  })
})
