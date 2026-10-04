import { describe, it, expect } from 'vitest'
import { renderNewsletterHtml, renderNewsletterPlainText, type NewsletterRenderInput } from './render'

const item = (position: number) => ({
  position, title: `Pod ${position}`, slug: null, artworkUrl: null, hosts: null, format: null, episodeCount: null,
  score: null, blurb: `Blurb ${position}`, appleUrl: null, spotifyUrl: null, websiteUrl: null, listenUrl: null,
})
const base = (): NewsletterRenderInput => ({ title: 'Issue', items: [1, 2, 3, 4, 5].map(item) })

describe('newsletter sections', () => {
  it('renders editor\'s note, body, podcasts, conclusion in that order', () => {
    const html = renderNewsletterHtml({ ...base(), editorsNote: 'NOTE_TEXT', body: 'BODY_TEXT', conclusion: 'CONCLUSION_TEXT' })
    const at = (s: string) => html.indexOf(s)
    expect(at('NOTE_TEXT')).toBeGreaterThan(0)
    expect(at('NOTE_TEXT')).toBeLessThan(at('BODY_TEXT'))
    expect(at('BODY_TEXT')).toBeLessThan(at('Pod 1'))
    expect(at('Pod 5')).toBeLessThan(at('CONCLUSION_TEXT'))
    expect(at('CONCLUSION_TEXT')).toBeLessThan(at('Unsubscribe'))
  })

  it('leaves empty sections out entirely', () => {
    const html = renderNewsletterHtml({ ...base(), editorsNote: '  ', body: null, conclusion: '' })
    expect(html).not.toContain("Editor's note")
    expect(html).not.toContain('Wrapping up')
  })

  it('falls back to the legacy intro when there is no body', () => {
    expect(renderNewsletterHtml({ ...base(), intro: 'LEGACY_INTRO' })).toContain('LEGACY_INTRO')
    expect(renderNewsletterHtml({ ...base(), intro: 'LEGACY_INTRO', body: 'NEW_BODY' })).not.toContain('LEGACY_INTRO')
  })

  it('escapes HTML and turns blank lines into paragraphs', () => {
    const html = renderNewsletterHtml({ ...base(), body: 'One <b>x</b>\n\nTwo\nline' })
    expect(html).toContain('One &lt;b&gt;x&lt;/b&gt;')
    expect(html).not.toContain('<b>x</b>')
    expect(html).toContain('Two<br />line')
    expect((html.match(/<p style="color:#e5e5e5;font-size:15px/g) ?? []).length).toBe(2)
  })

  it('includes the sections in the plain-text version in order', () => {
    const text = renderNewsletterPlainText({ ...base(), editorsNote: 'NOTE', body: 'BODY', conclusion: 'CONC' })
    expect(text.indexOf('NOTE')).toBeLessThan(text.indexOf('BODY'))
    expect(text.indexOf('BODY')).toBeLessThan(text.indexOf('1. Pod 1'))
    expect(text.indexOf('5. Pod 5')).toBeLessThan(text.indexOf('CONC'))
  })
})
