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
  intro: string | null
  items: NewsletterRenderItem[]
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
      <td style="padding:28px 32px;border-bottom:1px solid #f0f0f0;">
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
              <a href="${podcastUrl}" style="color:#111118;font-weight:700;font-size:17px;font-family:Georgia,serif;text-decoration:none;display:block;margin-bottom:4px;">
                ${escHtml(item.title)}
              </a>
              ${meta ? `<p style="color:#888;font-size:12px;margin:0 0 10px;">${escHtml(meta)}</p>` : ''}
              <div style="color:#333;font-size:14px;line-height:1.6;white-space:pre-line;margin-bottom:10px;">${escHtml(item.blurb)}</div>
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
<body style="margin:0;padding:0;background:#f6f6f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f6f6f7;">
  <tr><td align="center" style="padding:32px 16px;">
    <table width="600" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:600px;">
      <tr>
        <td style="background:#111118;padding:32px 32px 28px;text-align:center;">
          <a href="${BASE}" style="color:#be123c;font-family:Georgia,serif;font-size:22px;font-weight:700;text-decoration:none;letter-spacing:0.5px;">
            ListenTrueCrime
          </a>
          <p style="color:#a0a0b0;font-size:13px;margin:8px 0 0;">The true crime podcast database</p>
        </td>
      </tr>
      <tr>
        <td style="background:#be123c;padding:28px 32px;text-align:center;">
          <h1 style="color:#ffffff;font-family:Georgia,serif;font-size:24px;margin:0;font-weight:700;">
            ${escHtml(input.title)}
          </h1>
        </td>
      </tr>
      ${input.intro ? `
      <tr>
        <td style="padding:24px 32px 0;">
          <p style="color:#333;font-size:15px;line-height:1.6;margin:0;">${escHtml(input.intro)}</p>
        </td>
      </tr>` : ''}
      <tr><td><table width="100%" cellpadding="0" cellspacing="0" border="0">${rows}</table></td></tr>
      <tr>
        <td style="padding:20px 32px;text-align:center;">
          <p style="color:#999;font-size:12px;margin:0 0 6px;">
            You're receiving this because you subscribed at listentruecrime.com.
          </p>
          <p style="color:#bbb;font-size:11px;margin:0;">
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
  const parts = [input.title, '', input.intro ?? '', ''].filter(Boolean)

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

  parts.push(`— ListenTrueCrime (${BASE})`)
  return parts.join('\n')
}

function escHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
