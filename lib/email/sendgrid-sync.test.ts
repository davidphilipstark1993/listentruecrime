import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { AWAITING_WINDOW_MS, describeSyncError, maskEmail, reconcileAwaiting, syncSubscriber } from './sendgrid-sync'

// Minimal chainable stand-in for the Supabase client: records updates
// (patch + the email they were applied to) and serves `rows` to selects.
function fakeSupabase(rows: { email: string }[] = []) {
  const updates: { email: string; patch: Record<string, unknown> }[] = []
  const client = {
    from() {
      let patch: Record<string, unknown> | null = null
      let email = ''
      const b: Record<string, unknown> = {}
      for (const m of ['select', 'is', 'not', 'limit', 'order']) b[m] = () => b
      b.eq = (col: string, value: string) => {
        if (col === 'email') email = value
        return b
      }
      b.update = (p: Record<string, unknown>) => {
        patch = p
        return b
      }
      b.then = (resolve: (v: unknown) => unknown) => {
        if (patch) {
          updates.push({ email, patch })
          return resolve({ error: null })
        }
        return resolve({ data: rows, error: null })
      }
      return b
    },
  }
  return { supabase: client as unknown as SupabaseClient, updates }
}

type Handler = (body: Record<string, unknown>) => { status: number; json?: unknown; text?: string }

function stubSendGrid(handlers: { search?: Handler; upsert?: Handler }) {
  const calls: { url: string; method: string; body: Record<string, unknown> }[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: { method: string; body?: string }) => {
      const body = init.body ? JSON.parse(init.body) : {}
      calls.push({ url, method: init.method, body })
      const handler = url.endsWith('/search/emails') ? handlers.search : handlers.upsert
      if (!handler) throw new Error(`unexpected request ${init.method} ${url}`)
      const r = handler(body)
      return {
        ok: r.status >= 200 && r.status < 300,
        status: r.status,
        json: async () => r.json,
        text: async () => r.text ?? JSON.stringify(r.json ?? {}),
      }
    })
  )
  return calls
}

const notFound: Handler = () => ({ status: 404, json: {} })
const accepted: Handler = () => ({ status: 202, json: { job_id: 'job-1' } })
const found = (email: string): Handler => () => ({ status: 200, json: { result: { [email]: { contact: { id: 'contact-9' } } } } })

beforeEach(() => {
  vi.stubEnv('SENDGRID_API_KEY', 'SG.test-key')
  vi.stubEnv('SENDGRID_LIST_ID', '')
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('syncSubscriber', () => {
  it('records an accepted upsert as awaiting, not synced', async () => {
    const calls = stubSendGrid({ search: notFound, upsert: accepted })
    const { supabase, updates } = fakeSupabase()
    const result = await syncSubscriber(supabase, { email: 'a@example.com' }, { checkFirst: true })
    expect(result.state).toBe('awaiting')
    expect(calls.map(c => c.method)).toEqual(['POST', 'PUT'])
    expect(updates).toHaveLength(1)
    expect(updates[0].patch).toMatchObject({ sendgrid_synced: false, sendgrid_contact_id: 'job-1', sync_error: null })
    expect(updates[0].patch.last_sync_attempt).toEqual(expect.any(String))
  })

  it('marks synced only when search finds the contact, without a second upsert', async () => {
    const calls = stubSendGrid({ search: found('a@example.com') })
    const { supabase, updates } = fakeSupabase()
    const result = await syncSubscriber(supabase, { email: 'a@example.com' }, { checkFirst: true })
    expect(result.state).toBe('synced')
    expect(calls.some(c => c.method === 'PUT')).toBe(false)
    expect(updates[0].patch).toMatchObject({ sendgrid_synced: true, sendgrid_contact_id: 'contact-9', sync_error: null })
  })

  it('records the SendGrid error when the upsert is rejected, and never marks synced', async () => {
    stubSendGrid({ search: notFound, upsert: () => ({ status: 400, text: '{"errors":[{"message":"invalid list id"}]}' }) })
    const { supabase, updates } = fakeSupabase()
    const result = await syncSubscriber(supabase, { email: 'a@example.com' }, { checkFirst: true })
    expect(result.state).toBe('failed')
    expect(result.error).toContain('400')
    expect(result.error).toContain('invalid list id')
    expect(updates).toHaveLength(1)
    expect(updates[0].patch.sync_error).toContain('invalid list id')
    expect(updates[0].patch).not.toHaveProperty('sendgrid_synced')
  })

  it('reports a missing API key plainly instead of a cryptic TypeError', async () => {
    vi.stubEnv('SENDGRID_API_KEY', '')
    stubSendGrid({})
    const { supabase, updates } = fakeSupabase()
    const result = await syncSubscriber(supabase, { email: 'a@example.com' })
    expect(result).toEqual({ state: 'failed', error: 'SENDGRID_API_KEY is not set' })
    expect(updates[0].patch.sync_error).toBe('SENDGRID_API_KEY is not set')
  })

  it('does not re-submit an upsert that was accepted moments ago', async () => {
    const now = new Date('2026-11-01T12:00:00Z')
    const calls = stubSendGrid({ search: notFound, upsert: accepted })
    const { supabase, updates } = fakeSupabase()
    const recent = new Date(now.getTime() - 60_000).toISOString()
    const result = await syncSubscriber(supabase, { email: 'a@example.com', last_sync_attempt: recent }, { checkFirst: true, now })
    expect(result.state).toBe('awaiting')
    expect(calls.some(c => c.method === 'PUT')).toBe(false)
    expect(updates).toHaveLength(0)
  })

  it('re-submits once the awaiting window has passed', async () => {
    const now = new Date('2026-11-01T12:00:00Z')
    const calls = stubSendGrid({ search: notFound, upsert: accepted })
    const { supabase } = fakeSupabase()
    const stale = new Date(now.getTime() - AWAITING_WINDOW_MS - 1000).toISOString()
    await syncSubscriber(supabase, { email: 'a@example.com', last_sync_attempt: stale }, { checkFirst: true, now })
    expect(calls.some(c => c.method === 'PUT')).toBe(true)
  })

  it('retries immediately after a recorded failure', async () => {
    const now = new Date('2026-11-01T12:00:00Z')
    const calls = stubSendGrid({ search: notFound, upsert: accepted })
    const { supabase, updates } = fakeSupabase()
    const sub = { email: 'a@example.com', last_sync_attempt: new Date(now.getTime() - 1000).toISOString(), sync_error: 'old error' }
    await syncSubscriber(supabase, sub, { checkFirst: true, now })
    expect(calls.some(c => c.method === 'PUT')).toBe(true)
    expect(updates[0].patch.sync_error).toBeNull()
  })

  it('cleans a quoted / newline-suffixed SENDGRID_LIST_ID before sending it', async () => {
    vi.stubEnv('SENDGRID_LIST_ID', '"abc-123"\\n')
    const calls = stubSendGrid({ upsert: accepted })
    const { supabase } = fakeSupabase()
    await syncSubscriber(supabase, { email: 'a@example.com' })
    expect(calls[0].body.list_ids).toEqual(['abc-123'])
  })

  it('sends no list_ids when SENDGRID_LIST_ID is unset', async () => {
    const calls = stubSendGrid({ upsert: accepted })
    const { supabase } = fakeSupabase()
    await syncSubscriber(supabase, { email: 'a@example.com' })
    expect(calls[0].body.list_ids).toBeUndefined()
  })
})

describe('reconcileAwaiting', () => {
  it('marks found contacts synced, leaves unseen ones, never submits anything', async () => {
    const calls = stubSendGrid({
      search: body => {
        const [email] = body.emails as string[]
        return email === 'seen@example.com' ? found(email)(body) : notFound(body)
      },
    })
    const { supabase, updates } = fakeSupabase([{ email: 'seen@example.com' }, { email: 'unseen@example.com' }])
    const confirmed = await reconcileAwaiting(supabase)
    expect(confirmed).toBe(1)
    expect(calls.every(c => c.method === 'POST')).toBe(true)
    expect(updates).toEqual([{ email: 'seen@example.com', patch: { sendgrid_synced: true, sendgrid_contact_id: 'contact-9' } }])
  })

  it('skips a failing lookup without throwing', async () => {
    stubSendGrid({ search: () => ({ status: 500, text: 'boom' }) })
    const { supabase, updates } = fakeSupabase([{ email: 'a@example.com' }])
    await expect(reconcileAwaiting(supabase)).resolves.toBe(0)
    expect(updates).toHaveLength(0)
  })
})

describe('helpers', () => {
  it('masks emails', () => {
    expect(maskEmail('jane@gmail.com')).toBe('j***@gmail.com')
    expect(maskEmail('nonsense')).toBe('***')
  })
  it('flattens and truncates long errors', () => {
    const long = describeSyncError(new Error(`bad\n\n${'x'.repeat(500)}`))
    expect(long.startsWith('bad xxx')).toBe(true)
    expect(long.length).toBeLessThanOrEqual(301)
    expect(long.endsWith('…')).toBe(true)
  })
})
