import type { SupabaseClient } from '@supabase/supabase-js'
import { renderNewsletterHtml, renderNewsletterPlainText, type NewsletterRenderItem, type NewsletterRenderInput } from './render'
import { sendNewsletterCampaign } from '@/lib/email/newsletter-campaign'
import type { Newsletter, NewsletterSubmission } from '@/lib/types/database'

/**
 * Curator-supplied fields, joined into the same 2-3 paragraph shape as the
 * AI-discovery blurb (what it is / why it was picked / who it's for) — every
 * field the curator actually typed ends up in the sent newsletter, instead
 * of picking one field and silently dropping the rest.
 */
export function composeSubmissionBlurb(s: Pick<NewsletterSubmission, 'description' | 'recommendation' | 'additional_info'>): string {
  return [s.description, s.recommendation, s.additional_info]
    .map(part => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join('\n\n')
}

async function buildRenderItems(supabase: SupabaseClient, approved: NewsletterSubmission[]): Promise<NewsletterRenderItem[]> {
  // Parallelized rather than one lookup at a time — this function sits on
  // the critical path before the actual SendGrid call, and serverless
  // functions have a hard wall-clock timeout.
  const slugs = await Promise.all(approved.map(async s => {
    if (!s.matched_podcast_id) return null
    const { data: existing } = await supabase.from('podcasts').select('slug').eq('id', s.matched_podcast_id).single()
    return existing?.slug ?? null
  }))

  return approved.map((s, i) => ({
    position: i + 1,
    title: s.podcast_name,
    slug: slugs[i],
    artworkUrl: s.artwork_url,
    hosts: s.hosts,
    format: null,
    episodeCount: null,
    score: s.curator_rating,
    blurb: composeSubmissionBlurb(s),
    appleUrl: null,
    spotifyUrl: null,
    listenUrl: s.podcast_url,
    websiteUrl: s.website_url,
  }))
}

async function loadApprovedSubmissions(supabase: SupabaseClient, newsletterId: string): Promise<NewsletterSubmission[]> {
  const { data: submissions } = await supabase
    .from('newsletter_submissions')
    .select('*')
    .eq('newsletter_id', newsletterId)
    .order('created_at', { ascending: true })
  return (submissions ?? []).filter(s => s.status === 'approved')
}

/**
 * Renders a preview of the newsletter from whatever's currently approved —
 * no side effects (no DB writes, no send). Used by both the admin
 * "Preview" button and can be called with any subset of approved picks,
 * even fewer than 5, so a curator can check formatting mid-week.
 */
export async function previewManualNewsletter(supabase: SupabaseClient, newsletterId: string): Promise<{ newsletter: Newsletter; html: string }> {
  const { data: newsletter } = await supabase.from('newsletters').select('*').eq('id', newsletterId).single()
  if (!newsletter) throw new Error('Newsletter not found')

  const approved = await loadApprovedSubmissions(supabase, newsletterId)
  const items = await buildRenderItems(supabase, approved)
  const input: NewsletterRenderInput = { title: newsletter.title, intro: newsletter.intro, items }
  return { newsletter, html: renderNewsletterHtml(input) }
}

export type SendResult =
  | { ok: true; sentCount: number; campaignId: string }
  | { ok: false; reason: 'not_ready'; approvedCount: number; explicitlyApproved: boolean }
  | { ok: false; reason: 'no_subscribers' }

/**
 * The one place that actually sends a manually-curated newsletter. Called
 * both by the Sunday GitHub Action (scripts/newsletter/weekly-send.ts) and
 * by the admin "Send Now" button — kept as a single function so the two
 * paths can never drift into producing different content for the same
 * newsletter.
 */
export async function sendApprovedManualNewsletter(supabase: SupabaseClient, newsletterId: string): Promise<SendResult> {
  const { data: newsletter } = await supabase.from('newsletters').select('*').eq('id', newsletterId).single()
  if (!newsletter) throw new Error('Newsletter not found')

  const approved = await loadApprovedSubmissions(supabase, newsletterId)

  if (newsletter.status !== 'approved' || approved.length !== 5) {
    return { ok: false, reason: 'not_ready', approvedCount: approved.length, explicitlyApproved: newsletter.status === 'approved' }
  }

  const items = await buildRenderItems(supabase, approved)

  // Idempotent by design: delete-then-insert instead of appending, so a
  // retried/interrupted send (e.g. a prior attempt that crashed or timed
  // out partway) can never leave duplicate podcasts in this newsletter's
  // archive page. Single bulk insert instead of one round trip per podcast.
  await supabase.from('newsletter_podcasts').delete().eq('newsletter_id', newsletterId)
  await supabase.from('newsletter_podcasts').insert(
    approved.map((s, i) => ({
      newsletter_id: newsletterId,
      podcast_id: s.matched_podcast_id ?? null,
      newsletter_submission_id: s.id,
      position: i + 1,
      blurb: items[i].blurb,
    }))
  )

  const input: NewsletterRenderInput = { title: newsletter.title, intro: newsletter.intro, items }
  const html_content = renderNewsletterHtml(input)
  const plain_text_content = renderNewsletterPlainText(input)
  await supabase.from('newsletters').update({ html_content, plain_text_content }).eq('id', newsletterId)

  const { data: subscribers } = await supabase.from('newsletter_subscribers').select('email').eq('status', 'active')
  if (!subscribers?.length) return { ok: false, reason: 'no_subscribers' }

  const { campaignId, sentCount } = await sendNewsletterCampaign({ ...newsletter, html_content, plain_text_content }, subscribers)

  await supabase
    .from('newsletters')
    .update({ status: 'sent', sent_at: new Date().toISOString(), sendgrid_campaign_id: campaignId })
    .eq('id', newsletterId)

  return { ok: true, sentCount, campaignId }
}
