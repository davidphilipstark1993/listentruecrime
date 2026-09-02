// Sunday send job for the MANUALLY-CURATED weekly newsletter. Deliberately
// does not import scripts/discovery/draftCopy.ts or call Anthropic anywhere
// in this file — the manual workflow never depends on the AI/discovery
// system, which remains available separately for future use.
import { createDiscoveryClient } from '../discovery/supabaseClient'
import { sanitizeEnv } from '@/lib/utils'
import { nextSunday } from '@/lib/newsletter/week'
import { sendApprovedManualNewsletter } from '@/lib/newsletter/manualSend'

async function notifyAdmin(subject: string, text: string): Promise<void> {
  const apiKey = process.env.SENDGRID_API_KEY ? sanitizeEnv(process.env.SENDGRID_API_KEY) : undefined
  const adminEmails = (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim()).filter(Boolean)
  if (!apiKey || !adminEmails.length) {
    console.log(`(no SENDGRID_API_KEY/ADMIN_EMAILS — would have notified: ${subject})`)
    return
  }
  const fromEmail = process.env.SENDGRID_FROM_EMAIL ? sanitizeEnv(process.env.SENDGRID_FROM_EMAIL) : 'info@listentruecrime.com'
  const fromName = process.env.SENDGRID_FROM_NAME ? sanitizeEnv(process.env.SENDGRID_FROM_NAME) : 'Listen True Crime'

  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      personalizations: [{ to: adminEmails.map(email => ({ email })) }],
      from: { email: fromEmail, name: fromName },
      subject,
      content: [{ type: 'text/plain', value: text }],
    }),
  })
  if (!res.ok) console.error(`Admin notification failed: ${res.status} ${await res.text()}`)
}

async function main() {
  const supabase = createDiscoveryClient()
  const publicationDate = nextSunday()

  console.log(`=== Weekly manual newsletter send — targeting ${publicationDate} ===`)

  const { data: newsletter } = await supabase
    .from('newsletters')
    .select('*')
    .eq('publication_date', publicationDate)
    .in('status', ['draft', 'review', 'approved'])
    .maybeSingle()

  if (!newsletter) {
    console.log('No newsletter found for this week — nothing was ever added. Not sending.')
    await notifyAdmin(
      'Newsletter not sent this week — no podcasts submitted',
      `No podcasts were added to this week's newsletter (target date ${publicationDate}), so nothing was sent.\n\nAdd podcasts at any time during the week in the admin panel: /admin/weekly-newsletter`
    )
    return
  }

  const result = await sendApprovedManualNewsletter(supabase, newsletter.id)

  if (!result.ok && result.reason === 'not_ready') {
    console.log(`Not ready to send — ${result.approvedCount}/5 approved, explicitly approved for sending: ${result.explicitlyApproved}.`)
    await notifyAdmin(
      'Newsletter not sent this week — not fully approved',
      `This week's newsletter (issue #${newsletter.issue_number}, target date ${publicationDate}) was NOT sent.\n\n` +
      `Approved podcasts: ${result.approvedCount}/5\n` +
      `Explicitly approved for sending: ${result.explicitlyApproved ? 'yes' : 'no'}\n\n` +
      `Nothing was sent and no content was generated. Review and approve at /admin/weekly-newsletter when ready.`
    )
    return
  }

  if (!result.ok && result.reason === 'no_subscribers') {
    console.log('No active subscribers — content generated but nothing to send.')
    await notifyAdmin(
      'Newsletter not sent — no active subscribers',
      `This week's newsletter (issue #${newsletter.issue_number}) was fully approved and its content was generated, but there are no active subscribers to send it to.`
    )
    return
  }

  if (result.ok) {
    console.log(`Sent to ${result.sentCount} subscribers. Campaign id: ${result.campaignId}`)
    await notifyAdmin(
      `Newsletter sent — issue #${newsletter.issue_number}`,
      `This week's newsletter was sent successfully.\n\nRecipients: ${result.sentCount}\nSendGrid campaign id: ${result.campaignId}\nSent at: ${new Date().toISOString()}\n\nArchive page: ${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/newsletter/${newsletter.slug}`
    )
  }
}

main().catch(async err => {
  console.error('Weekly newsletter send failed:', err)
  await notifyAdmin('Newsletter send FAILED', `The weekly newsletter send job crashed:\n\n${err instanceof Error ? err.stack ?? err.message : String(err)}`)
  process.exit(1)
})
