import type { SupabaseClient } from '@supabase/supabase-js'
import { findSendGridContactId, subscribeSendGrid } from './sendgrid-contacts'

// Tracks whether a subscriber is really in SendGrid Marketing Contacts.
//
// SendGrid's contact upsert is asynchronous: a 202 + job_id only means the
// request was accepted. So a subscriber is only marked synced once a search
// finds the contact. Until then they are "awaiting" (accepted, not yet
// visible), and a failed attempt records its error instead of vanishing
// into the logs.
//
// None of this gates sending: issues go out through the Mail Send API to
// active rows in newsletter_subscribers, regardless of this flag.

export type SyncState = 'synced' | 'awaiting' | 'failed'
export interface SyncResult {
  state: SyncState
  error?: string
}

export interface SyncSubscriber {
  email: string
  first_name?: string | null
  last_sync_attempt?: string | null
  sync_error?: string | null
}

/** How long an accepted upsert is given to appear before we re-submit it. */
export const AWAITING_WINDOW_MS = 10 * 60 * 1000
const MAX_ERROR_LENGTH = 300

/** j***@gmail.com — for logs and API responses. */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  return domain ? `${local.slice(0, 1)}***@${domain}` : '***'
}

export function describeSyncError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err)
  const flat = message.replace(/\s+/g, ' ').trim()
  return flat.length > MAX_ERROR_LENGTH ? `${flat.slice(0, MAX_ERROR_LENGTH)}…` : flat
}

function isAwaiting(sub: SyncSubscriber, now: Date): boolean {
  if (!sub.last_sync_attempt || sub.sync_error) return false
  return now.getTime() - new Date(sub.last_sync_attempt).getTime() < AWAITING_WINDOW_MS
}

async function save(supabase: SupabaseClient, email: string, patch: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.from('newsletter_subscribers').update(patch).eq('email', email)
  if (error) console.error(`Could not record SendGrid sync state for ${maskEmail(email)}:`, error.message)
}

/**
 * Syncs one subscriber to SendGrid and records the outcome. Never throws.
 *  - checkFirst: look the contact up before submitting (retries, re-signups),
 *    so an existing contact is marked synced without a second upsert, and a
 *    recently accepted upsert is left to finish instead of being re-sent.
 */
export async function syncSubscriber(
  supabase: SupabaseClient,
  sub: SyncSubscriber,
  options: { checkFirst?: boolean; now?: Date } = {}
): Promise<SyncResult> {
  const now = options.now ?? new Date()
  try {
    if (options.checkFirst) {
      const contactId = await findSendGridContactId(sub.email)
      if (contactId) {
        await save(supabase, sub.email, { sendgrid_synced: true, sendgrid_contact_id: contactId, sync_error: null })
        return { state: 'synced' }
      }
      if (isAwaiting(sub, now)) return { state: 'awaiting' }
    }

    const jobId = await subscribeSendGrid(sub.email, sub.first_name)
    await save(supabase, sub.email, {
      sendgrid_synced: false,
      sendgrid_contact_id: jobId,
      sync_error: null,
      last_sync_attempt: now.toISOString(),
    })
    return { state: 'awaiting' }
  } catch (err) {
    const error = describeSyncError(err)
    console.error(`SendGrid sync failed for ${maskEmail(sub.email)}: ${error}`)
    await save(supabase, sub.email, { sync_error: error, last_sync_attempt: now.toISOString() })
    return { state: 'failed', error }
  }
}

/**
 * Read-then-mark pass for subscribers SendGrid has accepted but we have not
 * yet seen in the list. Only ever flips awaiting -> synced; it never submits
 * anything. Failures are logged and skipped. Returns how many it confirmed.
 */
export async function reconcileAwaiting(supabase: SupabaseClient, limit = 25): Promise<number> {
  const { data } = await supabase
    .from('newsletter_subscribers')
    .select('email')
    .eq('status', 'active')
    .eq('sendgrid_synced', false)
    .is('sync_error', null)
    .not('last_sync_attempt', 'is', null)
    .limit(limit)

  const results = await Promise.all(
    (data ?? []).map(async ({ email }: { email: string }) => {
      try {
        const contactId = await findSendGridContactId(email)
        if (!contactId) return false
        await save(supabase, email, { sendgrid_synced: true, sendgrid_contact_id: contactId })
        return true
      } catch (err) {
        console.error(`SendGrid verify failed for ${maskEmail(email)}: ${describeSyncError(err)}`)
        return false
      }
    })
  )
  return results.filter(Boolean).length
}
