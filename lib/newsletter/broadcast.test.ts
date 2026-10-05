import { describe, expect, it } from 'vitest'
import { renderBroadcastHtml, renderBroadcastPlainText, isOurMediaUrl, type BroadcastAttachment } from './broadcast'

const img: BroadcastAttachment = { name: 'photo.jpg', url: 'https://x.supabase.co/storage/v1/object/public/broadcast-media/2026-10/a-photo.jpg', type: 'image/jpeg', size: 200_000 }
const pdf: BroadcastAttachment = { name: 'Guide.pdf', url: 'https://x.supabase.co/storage/v1/object/public/broadcast-media/2026-10/b-Guide.pdf', type: 'application/pdf', size: 2_500_000 }

describe('broadcast email', () => {
  it('embeds images and links other files', () => {
    const html = renderBroadcastHtml({ subject: 'Hello', message: 'Hi there', attachments: [img, pdf] })
    expect(html).toContain(`<img src="${img.url}"`)
    expect(html).toContain('Guide.pdf')
    expect(html).toContain('PDF, 2.4 MB')
    expect(html).toContain('%asm_group_unsubscribe_raw_url%')
  })

  it('escapes HTML, makes paragraphs and links URLs', () => {
    const html = renderBroadcastHtml({ subject: '<b>x</b>', message: 'One <script>\n\nSee https://example.com/a.', attachments: [] })
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;b&gt;x&lt;/b&gt;')
    expect(html.match(/<p style="color:#e5e5e5/g)).toHaveLength(2)
    expect(html).toContain('<a href="https://example.com/a"')
  })

  it('lists files in plain text', () => {
    expect(renderBroadcastPlainText({ subject: 'S', message: 'M', attachments: [pdf] })).toContain(`Guide.pdf (PDF, 2.4 MB): ${pdf.url}`)
  })

  it('only accepts links into the broadcast bucket', () => {
    expect(isOurMediaUrl(img.url)).toBe(true)
    expect(isOurMediaUrl('https://evil.example/broadcast-media/x.pdf')).toBe(process.env.NEXT_PUBLIC_SUPABASE_URL ? false : true)
    expect(isOurMediaUrl('http://x.supabase.co/storage/v1/object/public/broadcast-media/a.pdf')).toBe(false)
    expect(isOurMediaUrl('javascript:alert(1)')).toBe(false)
  })
})
