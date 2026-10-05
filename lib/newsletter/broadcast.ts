import type { SupabaseClient } from '@supabase/supabase-js'
import { BASE } from '@/lib/seo/config'
import { sendNewsletterCampaign } from '@/lib/email/newsletter-campaign'

// One-off "write a message, attach some files" email. Separate from the
// weekly newsletter (render.ts / manualSend.ts), which it deliberately does
// not touch; it only shares the provider switch in newsletter-campaign.ts.

export interface BroadcastAttachment {
  name: string
  url: string
  type: string
  size: number
}

export const BROADCAST_BUCKET = 'broadcast-media'
export const MAX_FILE_BYTES = 25 * 1024 * 1024
export const MAX_FILES = 10

// Mirrors allowed_mime_types on the bucket (migration 017).
export const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain', 'text/csv', 'application/zip', 'audio/mpeg',
]

const isImage = (a: BroadcastAttachment) => a.type.startsWith('image/') && a.type !== 'image/svg+xml'

function escHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function formatBytes(n: number): string {
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

function fileLabel(a: BroadcastAttachment): string {
  const ext = a.name.includes('.') ? a.name.split('.').pop()!.toUpperCase() : 'File'
  return `${ext}, ${formatBytes(a.size)}`
}

// Only links we host ourselves are ever emitted for attachments.
export function isOurMediaUrl(url: string): boolean {
  try {
    const u = new URL(url)
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL.trim()) : null
    return u.protocol === 'https:' && (!base || u.host === base.host) && u.pathname.includes(`/${BROADCAST_BUCKET}/`)
  } catch { return false }
}

const TEXT_STYLE = 'color:#e5e5e5;font-size:15px;line-height:1.6;margin:0 0 14px;'

/** Blank line = new paragraph; bare http(s) links become clickable. */
function messageHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .map(p => p.trim())
    .filter(Boolean)
    .map(p => {
      const html = escHtml(p)
        .replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)])/g, '<a href="$1" style="color:#be123c;">$1</a>')
        .replace(/\n/g, '<br />')
      return `<p style="${TEXT_STYLE}">${html}</p>`
    })
    .join('')
}

export function renderBroadcastHtml(input: { subject: string; message: string; attachments: BroadcastAttachment[] }): string {
  const images = input.attachments.filter(isImage)
  const files = input.attachments.filter(a => !isImage(a))

  const imageRows = images.map(a => `
      <tr>
        <td style="padding:8px 32px;">
          <a href="${escHtml(a.url)}"><img src="${escHtml(a.url)}" alt="${escHtml(a.name)}" width="536" style="display:block;width:100%;max-width:536px;height:auto;border-radius:8px;" /></a>
        </td>
      </tr>`).join('')

  const fileRows = files.map(a => `
      <tr>
        <td style="padding:8px 32px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#141414;border:1px solid #262626;border-radius:8px;">
            <tr>
              <td style="padding:14px 16px;">
                <a href="${escHtml(a.url)}" style="color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">${escHtml(a.name)}</a>
                <p style="color:#999;font-size:12px;margin:2px 0 0;">${escHtml(fileLabel(a))}</p>
              </td>
              <td align="right" style="padding:14px 16px;white-space:nowrap;">
                <a href="${escHtml(a.url)}" style="color:#be123c;font-size:13px;font-weight:700;text-decoration:none;">Download →</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>`).join('')

  return `<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1.0" />
<title>${escHtml(input.subject)}</title>
</head>
<body style="margin:0;padding:0;background:#000000;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#000000;">
  <tr><td align="center" style="padding:32px 16px;">
    <table width="600" cellpadding="0" cellspacing="0" border="0" style="background:#000000;border:1px solid #1a1a1a;border-radius:12px;overflow:hidden;max-width:600px;width:100%;">
      <tr>
        <td style="padding:28px 32px 16px;text-align:center;">
          <a href="${BASE}" style="color:#ffffff;font-family:Georgia,serif;font-size:22px;font-weight:700;text-decoration:none;letter-spacing:0.5px;">ListenTrueCrime</a>
        </td>
      </tr>
      <tr>
        <td style="padding:8px 32px 4px;">
          <h1 style="color:#ffffff;font-family:Georgia,serif;font-size:24px;line-height:1.3;margin:0 0 16px;font-weight:700;">${escHtml(input.subject)}</h1>
          ${messageHtml(input.message)}
        </td>
      </tr>${imageRows}${fileRows}
      <tr>
        <td style="padding:24px 32px;text-align:center;">
          <p style="color:#999;font-size:12px;margin:0 0 6px;">You're receiving this because you subscribed at listentruecrime.com.</p>
          <p style="color:#777;font-size:11px;margin:0;">
            © ${new Date().getFullYear()} ListenTrueCrime &nbsp;·&nbsp;
            <a href="${BASE}" style="color:#be123c;text-decoration:none;">Visit site</a>
            &nbsp;·&nbsp;
            <a href="%asm_group_unsubscribe_raw_url%" style="color:#be123c;text-decoration:none;">Unsubscribe</a>
          </p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>`
}

export function renderBroadcastPlainText(input: { subject: string; message: string; attachments: BroadcastAttachment[] }): string {
  const parts = [input.subject, '', input.message.trim(), '']
  if (input.attachments.length) {
    parts.push('Files:')
    for (const a of input.attachments) parts.push(`${a.name} (${fileLabel(a)}): ${a.url}`)
    parts.push('')
  }
  parts.push(`— ListenTrueCrime (${BASE})`)
  return parts.join('\n')
}

async function activeSubscribers(supabase: SupabaseClient): Promise<{ email: string }[]> {
  // Paged: PostgREST returns at most 1000 rows per request.
  const all: { email: string }[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('newsletter_subscribers')
      .select('email')
      .eq('status', 'active')
      .order('email', { ascending: true })
      .range(from, from + 999)
    if (error) throw new Error(error.message)
    all.push(...(data ?? []))
    if (!data || data.length < 1000) break
  }
  return all
}

export async function countActiveSubscribers(supabase: SupabaseClient): Promise<number> {
  const { count } = await supabase
    .from('newsletter_subscribers')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'active')
  return count ?? 0
}

function content(subject: string, message: string, attachments: BroadcastAttachment[], id: string) {
  const input = { subject, message, attachments }
  return {
    id,
    title: subject,
    html_content: renderBroadcastHtml(input),
    plain_text_content: renderBroadcastPlainText(input),
  }
}

/** Sends the email to one address only (the admin) so they can see the real thing. */
export async function sendBroadcastTest(
  input: { subject: string; message: string; attachments: BroadcastAttachment[] },
  toEmail: string,
): Promise<void> {
  await sendNewsletterCampaign(content(`[TEST] ${input.subject}`, input.message, input.attachments, 'broadcast-test'), [{ email: toEmail }])
}

/**
 * Sends to every active subscriber. The row is inserted as 'sending' before
 * anything goes out and is never re-sent, so a double click or a retry can't
 * email people twice; a failure leaves it marked 'failed' with the reason.
 */
export async function sendBroadcast(
  supabase: SupabaseClient,
  input: { subject: string; message: string; attachments: BroadcastAttachment[]; sentBy: string },
): Promise<{ id: string; sentCount: number }> {
  const recipients = await activeSubscribers(supabase)
  if (!recipients.length) throw new Error('No active subscribers to send to.')

  const { data: row, error } = await supabase
    .from('broadcasts')
    .insert({ subject: input.subject, message: input.message, attachments: input.attachments, sent_by: input.sentBy, status: 'sending' })
    .select('id')
    .single()
  if (error || !row) throw new Error(error?.message ?? 'Could not record the broadcast')

  try {
    const { campaignId, sentCount } = await sendNewsletterCampaign(
      content(input.subject, input.message, input.attachments, `broadcast-${row.id}`),
      recipients,
    )
    await supabase
      .from('broadcasts')
      .update({ status: 'sent', sent_at: new Date().toISOString(), recipient_count: sentCount, provider_ref: campaignId })
      .eq('id', row.id)
    return { id: row.id, sentCount }
  } catch (err) {
    await supabase.from('broadcasts').update({ status: 'failed', error: err instanceof Error ? err.message : 'Send failed' }).eq('id', row.id)
    throw err
  }
}
