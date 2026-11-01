// Daily job: one reminder email for subscribers who signed up but haven't
// clicked their confirmation link. Each subscriber is reminded at most once
// (confirm_reminder_sent_at), only while their original link is still valid,
// and only if they signed up on/after REMINDERS_FROM. Never touches status.
import { createDiscoveryClient } from '../discovery/supabaseClient'
import { issueConfirmation } from '@/lib/newsletter/confirmation'
import { CONFIRM_TOKEN_TTL_MS, REMINDERS_FROM, REMINDER_AFTER_MS } from '@/lib/newsletter/optin'
import { notifyAdmin } from '@/lib/email/adminNotify'

const MAX_PER_RUN = 50

async function main() {
  const supabase = createDiscoveryClient()
  const now = Date.now()
  const newest = new Date(now - REMINDER_AFTER_MS).toISOString()
  const oldest = new Date(now - CONFIRM_TOKEN_TTL_MS).toISOString()

  const { data: due, error } = await supabase
    .from('newsletter_subscribers')
    .select('email, first_name')
    .eq('status', 'pending')
    .is('confirm_reminder_sent_at', null)
    .gte('consent_at', REMINDERS_FROM)
    .lte('confirm_sent_at', newest)
    .gte('confirm_sent_at', oldest)
    .order('confirm_sent_at', { ascending: true })
    .limit(MAX_PER_RUN)
  if (error) throw new Error(`Could not load pending subscribers: ${error.message}`)

  console.log(`${due?.length ?? 0} pending subscriber(s) due a reminder.`)
  let sent = 0
  let failed = 0
  for (const sub of due ?? []) {
    const ok = await issueConfirmation(supabase, sub.email, sub.first_name, { reminder: true })
    if (ok) {
      // Marked only after a successful send, so a failure is retried tomorrow while the link is still valid.
      await supabase.from('newsletter_subscribers').update({ confirm_reminder_sent_at: new Date().toISOString() }).eq('email', sub.email)
      sent++
    } else {
      failed++
    }
  }

  console.log(`Reminders sent: ${sent}, failed: ${failed}.`)
  if (failed > 0) {
    await notifyAdmin('Newsletter confirmation reminders: some failed', `Sent ${sent}, failed ${failed}. Failed ones are retried on the next daily run while their link is valid. See the workflow log for details.`)
  }
}

main().catch(async err => {
  console.error('Confirmation reminder job failed:', err)
  await notifyAdmin('Newsletter confirmation reminder job FAILED', err instanceof Error ? err.stack ?? err.message : String(err))
  process.exit(1)
})
