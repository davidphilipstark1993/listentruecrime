import { BASE } from '@/lib/seo/config'

export interface NewsletterRenderItem {
  position: number
  title: string
  slug: string | null // set once the podcast has a live LTC page
  artworkUrl: string | null
  hosts: string | null
  format: string | null
  episodeCount: number | null
  score: number | null
  blurb: string
  appleUrl: string | null
  spotifyUrl: string | null
  websiteUrl: string | null
  /** Generic listen link for manually-curated picks that only have one URL, not a split Apple/Spotify pair. */
  listenUrl: string | null
}

export interface NewsletterRenderInput {
  title: string
  /** Legacy single intro paragraph; only used when `body` is empty. */
  intro?: string | null
  /** Short personal note from the editor, shown first under the title. */
  editorsNote?: string | null
  /** Main text shown before the five podcasts. */
  body?: string | null
  /** Wrap-up / preview of the next issue, shown after the five podcasts. */
  conclusion?: string | null
  items: NewsletterRenderItem[]
}

/** Blank line = new paragraph, single newline = line break. */
function paragraphsHtml(text: string, style: string): string {
  return text
    .split(/\n{2,}/)
    .map(p => p.trim())
    .filter(Boolean)
    .map(p => `<p style="${style}">${escHtml(p).replace(/\n/g, '<br />')}</p>`)
    .join('')
}

const TEXT_STYLE = 'color:#e5e5e5;font-size:15px;line-height:1.6;margin:0 0 14px;'
const KICKER_STYLE = 'color:#be123c;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;margin:0 0 8px;'

function textBlockRow(kicker: string | null, text: string | null | undefined, opts: { accent?: boolean; top: number; bottom: number }): string {
  if (!text?.trim()) return ''
  const inner = `${kicker ? `<p style="${KICKER_STYLE}">${kicker}</p>` : ''}${paragraphsHtml(text, TEXT_STYLE)}`
  return `
      <tr>
        <td style="padding:${opts.top}px 32px ${opts.bottom}px;">
          ${opts.accent ? `<div style="border-left:3px solid #be123c;padding:2px 0 2px 16px;">${inner}</div>` : inner}
        </td>
      </tr>`
}

function listenLink(label: string, url: string | null): string {
  if (!url) return ''
  return `<a href="${url}" style="color:#be123c;text-decoration:none;font-size:13px;font-weight:600;margin-right:14px;">${label} →</a>`
}

function renderItemHtml(item: NewsletterRenderItem): string {
  const podcastUrl = item.slug ? `${BASE}/podcasts/${item.slug}` : item.websiteUrl ?? '#'
  const meta = [
    item.hosts ? `Hosted by ${escHtml(item.hosts)}` : null,
    item.format,
    item.episodeCount != null ? `${item.episodeCount} episodes` : null,
    item.score != null ? `${item.score}/10` : null,
  ].filter(Boolean).join(' · ')

  return `
    <tr>
      <td style="padding:28px 32px;border-bottom:1px solid #262626;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            ${item.artworkUrl ? `
            <td width="80" valign="top" style="padding-right:16px;">
              <img src="${item.artworkUrl}" width="80" height="80" alt="${escHtml(item.title)}" style="border-radius:10px;display:block;" />
            </td>` : ''}
            <td valign="top">
              <div style="display:inline-block;width:24px;height:24px;background:#be123c;border-radius:50%;text-align:center;line-height:24px;color:#fff;font-weight:700;font-size:12px;font-family:Georgia,serif;margin-bottom:6px;">
                ${item.position}
              </div>
              <a href="${podcastUrl}" style="color:#ffffff;font-weight:700;font-size:17px;font-family:Georgia,serif;text-decoration:none;display:block;margin-bottom:4px;">
                ${escHtml(item.title)}
              </a>
              ${meta ? `<p style="color:#999;font-size:12px;margin:0 0 10px;">${escHtml(meta)}</p>` : ''}
              <div style="color:#e5e5e5;font-size:14px;line-height:1.6;white-space:pre-line;margin-bottom:10px;">${escHtml(item.blurb)}</div>
              <div>
                ${listenLink('Apple Podcasts', item.appleUrl)}
                ${listenLink('Spotify', item.spotifyUrl)}
                ${listenLink('Listen', item.listenUrl)}
                ${listenLink('Website', item.websiteUrl)}
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>`
}

export function renderNewsletterHtml(input: NewsletterRenderInput): string {
  const rows = input.items.sort((a, b) => a.position - b.position).map(renderItemHtml).join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1.0" />
<title>${escHtml(input.title)}</title>
</head>
<body style="margin:0;padding:0;background:#000000;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#000000;">
  <tr><td align="center" style="padding:32px 16px;">
    <table width="600" cellpadding="0" cellspacing="0" border="0" style="background:#000000;border:1px solid #1a1a1a;border-radius:12px;overflow:hidden;max-width:600px;">
      <tr>
        <td style="background:#000000;padding:32px 32px 20px;text-align:center;">
          <a href="${BASE}">
            <img src="${BASE}/logo.png" width="72" height="72" alt="ListenTrueCrime" style="border-radius:50%;display:block;margin:0 auto 12px;" />
          </a>
          <a href="${BASE}" style="color:#ffffff;font-family:Georgia,serif;font-size:22px;font-weight:700;text-decoration:none;letter-spacing:0.5px;">
            ListenTrueCrime
          </a>
          <p style="color:#999;font-size:13px;margin:8px 0 0;">The true crime podcast database</p>
        </td>
      </tr>
      <tr>
        <td style="background:#be123c;padding:28px 32px;text-align:center;">
          <h1 style="color:#ffffff;font-family:Georgia,serif;font-size:24px;margin:0;font-weight:700;">
            ${escHtml(input.title)}
          </h1>
        </td>
      </tr>
      ${textBlockRow("Editor's note", input.editorsNote, { accent: true, top: 28, bottom: 4 })}
      ${textBlockRow(null, input.body ?? input.intro, { top: 24, bottom: 4 })}
      <tr><td><table width="100%" cellpadding="0" cellspacing="0" border="0">${rows}</table></td></tr>
      ${textBlockRow('Wrapping up', input.conclusion, { top: 28, bottom: 8 })}
      <tr>
        <td style="padding:20px 32px;text-align:center;">
          <p style="color:#999;font-size:12px;margin:0 0 6px;">
            You're receiving this because you subscribed at listentruecrime.com.
          </p>
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

export function renderNewsletterPlainText(input: NewsletterRenderInput): string {
  const parts = [input.title, '']
  if (input.editorsNote?.trim()) parts.push("EDITOR'S NOTE", input.editorsNote.trim(), '')
  const body = (input.body ?? input.intro)?.trim()
  if (body) parts.push(body, '')

  for (const item of input.items.sort((a, b) => a.position - b.position)) {
    const podcastUrl = item.slug ? `${BASE}/podcasts/${item.slug}` : item.websiteUrl ?? ''
    parts.push(`${item.position}. ${item.title}`)
    if (item.hosts) parts.push(`Hosted by ${item.hosts}`)
    parts.push(item.blurb)
    if (podcastUrl) parts.push(`Read more: ${podcastUrl}`)
    if (item.appleUrl) parts.push(`Apple Podcasts: ${item.appleUrl}`)
    if (item.spotifyUrl) parts.push(`Spotify: ${item.spotifyUrl}`)
    if (item.listenUrl) parts.push(`Listen: ${item.listenUrl}`)
    parts.push('')
  }

  if (input.conclusion?.trim()) parts.push('WRAPPING UP', input.conclusion.trim(), '')
  parts.push(`— ListenTrueCrime (${BASE})`)
  return parts.join('\n')
}

function escHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
