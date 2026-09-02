// Sunday send job for the MANUALLY-CURATED weekly newsletter. Deliberately
// does not import scripts/discovery/draftCopy.ts or call Anthropic anywhere
// in this file — the manual workflow never depends on the AI/discovery
// system, which remains available separately for future use.
import { createDiscoveryClient } from '../discovery/supabaseClient'
import { sanitizeEnv } from '@/lib/utils'
import { renderNewsletterHtml, renderNewsletterPlainText, type NewsletterRenderItem } from '@/lib/newsletter/render'
import { sendNewsletterCampaign } from '@/lib/email/sendgrid-campaign'
import { nextSunday } from '@/lib/newsletter/week'

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

  const { data: submissions } = await supabase
    .from('newsletter_submissions')
    .select('*')
    .eq('newsletter_id', newsletter.id)
    .order('created_at', { ascending: true })

  const approved = (submissions ?? []).filter(s => s.status === 'approved')

  console.log(`Newsletter status: ${newsletter.status}. Approved submissions: ${approved.length}/5.`)

  if (newsletter.status !== 'approved' || approved.length !== 5) {
    console.log('Not ready to send — missing either 5 approved podcasts or explicit "approve for sending".')
    await notifyAdmin(
      'Newsletter not sent this week — not fully approved',
      `This week's newsletter (issue #${newsletter.issue_number}, target date ${publicationDate}) was NOT sent.\n\n` +
      `Approved podcasts: ${approved.length}/5\n` +
      `Explicitly approved for sending: ${newsletter.status === 'approved' ? 'yes' : 'no'}\n\n` +
      `Nothing was sent and no content was generated. Review and approve at /admin/weekly-newsletter when ready.`
    )
    return
  }

  console.log('Ready — building newsletter content from curator-supplied data only (no AI, no auto-research)...')

  const renderItems: NewsletterRenderItem[] = []

  for (let i = 0; i < approved.length; i++) {
    const s = approved[i]
    // Directory publication is a separate, explicit admin action ("Add to
    // Directory" on /admin/weekly-newsletter) — the Sunday send never
    // creates or requires a podcasts row. If the curator has already
    // linked/published this one, matched_podcast_id carries its slug
    // through for a real internal link; otherwise the newsletter renders
    // entirely from the submission's own fields.
    let slug: string | null = null
    if (s.matched_podcast_id) {
      const { data: existing } = await supabase.from('podcasts').select('slug').eq('id', s.matched_podcast_id).single()
      slug = existing?.slug ?? null
    }

    await supabase.from('newsletter_podcasts').insert({
      newsletter_id: newsletter.id,
      podcast_id: s.matched_podcast_id ?? null,
      newsletter_submission_id: s.id,
      position: i + 1,
      blurb: s.recommendation ?? s.description ?? '',
    })

    renderItems.push({
      position: i + 1,
      title: s.podcast_name,
      slug,
      artworkUrl: s.artwork_url,
      hosts: s.hosts,
      format: null,
      episodeCount: null,
      score: s.curator_rating,
      blurb: s.recommendation ?? s.description ?? '',
      appleUrl: null,
      spotifyUrl: null,
      listenUrl: s.podcast_url,
      websiteUrl: s.website_url,
    })
  }

  const renderInput = { title: newsletter.title, intro: newsletter.intro, items: renderItems }
  const html_content = renderNewsletterHtml(renderInput)
  const plain_text_content = renderNewsletterPlainText(renderInput)

  await supabase.from('newsletters').update({ html_content, plain_text_content }).eq('id', newsletter.id)

  console.log('Content generated. Fetching active subscribers...')
  const { data: subscribers } = await supabase.from('newsletter_subscribers').select('email').eq('status', 'active')

  if (!subscribers?.length) {
    console.log('No active subscribers — content generated but nothing to send.')
    await notifyAdmin(
      'Newsletter not sent — no active subscribers',
      `This week's newsletter (issue #${newsletter.issue_number}) was fully approved and its content was generated, but there are no active subscribers to send it to.`
    )
    return
  }

  console.log(`Sending to ${subscribers.length} active subscribers via SendGrid...`)
  const { campaignId, sentCount } = await sendNewsletterCampaign(newsletter, subscribers)

  await supabase
    .from('newsletters')
    .update({ status: 'sent', sent_at: new Date().toISOString(), sendgrid_campaign_id: campaignId })
    .eq('id', newsletter.id)

  console.log(`Sent to ${sentCount} subscribers. Campaign id: ${campaignId}`)
  await notifyAdmin(
    `Newsletter sent — issue #${newsletter.issue_number}`,
    `This week's newsletter was sent successfully.\n\nRecipients: ${sentCount}\nSendGrid campaign id: ${campaignId}\nSent at: ${new Date().toISOString()}\n\nArchive page: ${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/newsletter/${newsletter.slug}`
  )
}

main().catch(async err => {
  console.error('Weekly newsletter send failed:', err)
  await notifyAdmin('Newsletter send FAILED', `The weekly newsletter send job crashed:\n\n${err instanceof Error ? err.stack ?? err.message : String(err)}`)
  process.exit(1)
})
