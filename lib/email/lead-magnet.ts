import { BASE } from '@/lib/seo/config'

interface PodcastEntry {
  title: string
  slug: string
  short_description: string | null
  quick_verdict: string | null
  binge_factor: number | null
  case_types: string[] | null
}

export function buildLeadMagnetHtml(podcasts: PodcastEntry[]): string {
  const rows = podcasts
    .map(
      (p, i) => `
    <tr>
      <td style="padding:20px 24px;border-bottom:1px solid #f0f0f0;vertical-align:top;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td width="36" valign="top" style="padding-right:16px;">
              <div style="width:36px;height:36px;background:#be123c;border-radius:50%;text-align:center;line-height:36px;color:#ffffff;font-weight:700;font-size:15px;font-family:Georgia,serif;">
                ${i + 1}
              </div>
            </td>
            <td valign="top">
              <a href="${BASE}/podcasts/${p.slug}"
                 style="color:#be123c;font-weight:700;font-size:16px;font-family:Georgia,serif;text-decoration:none;display:block;margin-bottom:4px;">
                ${escHtml(p.title)}
              </a>
              ${p.case_types?.length ? `<div style="margin-bottom:6px;">${p.case_types.slice(0, 3).map(t => `<span style="display:inline-block;font-size:11px;color:#666;background:#f5f5f5;border-radius:4px;padding:2px 7px;margin-right:4px;">${escHtml(t)}</span>`).join('')}</div>` : ''}
              ${p.short_description ? `<p style="color:#444;font-size:14px;line-height:1.5;margin:0 0 6px;">${escHtml(p.short_description)}</p>` : ''}
              <div style="display:flex;gap:12px;align-items:center;">
                ${p.quick_verdict === 'Must listen' ? `<span style="color:#be123c;font-size:12px;font-weight:600;">★ Must Listen</span>` : ''}
                ${p.binge_factor != null ? `<span style="color:#888;font-size:12px;">Binge factor: <strong style="color:#333;">${p.binge_factor}/10</strong></span>` : ''}
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>`
    )
    .join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1.0" />
<title>Your Top 10 True Crime Podcasts — ListenTrueCrime</title>
</head>
<body style="margin:0;padding:0;background:#f6f6f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f6f6f7;">
  <tr><td align="center" style="padding:32px 16px;">

    <!-- Card -->
    <table width="600" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:600px;">

      <!-- Header -->
      <tr>
        <td style="background:#111118;padding:32px 32px 28px;text-align:center;">
          <a href="${BASE}" style="color:#be123c;font-family:Georgia,serif;font-size:22px;font-weight:700;text-decoration:none;letter-spacing:0.5px;">
            ListenTrueCrime
          </a>
          <p style="color:#a0a0b0;font-size:13px;margin:8px 0 0;">The true crime podcast database</p>
        </td>
      </tr>

      <!-- Hero -->
      <tr>
        <td style="background:#be123c;padding:28px 32px;text-align:center;">
          <h1 style="color:#ffffff;font-family:Georgia,serif;font-size:26px;margin:0 0 8px;font-weight:700;">
            Your Top 10 True Crime Podcasts
          </h1>
          <p style="color:rgba(255,255,255,0.85);font-size:14px;margin:0;">
            Curated by our editors • Ranked by binge factor &amp; community ratings
          </p>
        </td>
      </tr>

      <!-- Intro -->
      <tr>
        <td style="padding:24px 32px 8px;">
          <p style="color:#333;font-size:15px;line-height:1.6;margin:0;">
            Hi there — here's your curated list of the best true crime podcasts to start with right now.
            Each one has been reviewed by our editors and rated by our community. Click any title to read
            the full review and find similar shows.
          </p>
        </td>
      </tr>

      <!-- Podcast list -->
      <tr>
        <td>
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            ${rows}
          </table>
        </td>
      </tr>

      <!-- CTA -->
      <tr>
        <td style="padding:28px 32px;text-align:center;background:#fafafa;border-top:1px solid #f0f0f0;">
          <p style="color:#555;font-size:14px;margin:0 0 16px;">
            Want more recommendations? Browse our full database of reviewed &amp; rated shows.
          </p>
          <a href="${BASE}/browse"
             style="display:inline-block;background:#be123c;color:#ffffff;font-weight:600;font-size:15px;padding:12px 28px;border-radius:8px;text-decoration:none;">
            Browse All Podcasts
          </a>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="padding:20px 32px;border-top:1px solid #f0f0f0;text-align:center;">
          <p style="color:#999;font-size:12px;margin:0 0 6px;">
            You're receiving this because you subscribed at listentruecrime.com.
          </p>
          <p style="color:#bbb;font-size:11px;margin:0;">
            © ${new Date().getFullYear()} ListenTrueCrime &nbsp;·&nbsp;
            <a href="${BASE}" style="color:#be123c;text-decoration:none;">Visit site</a>
          </p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`
}

export async function sendLeadMagnetEmail(email: string, podcasts: PodcastEntry[]): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return // graceful degradation — no key, no send

  const html = buildLeadMagnetHtml(podcasts)

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'ListenTrueCrime <hello@listentruecrime.com>',
      to: email,
      subject: 'Your Top 10 True Crime Podcasts 🎧',
      html,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Resend error ${res.status}: ${body}`)
  }
}

function escHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
