import { describe, expect, it } from 'vitest'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { COUNTRY_SEO, buildFAQSchema } from './content'

const uk = COUNTRY_SEO.UK

describe('/country/UK copy', () => {
  it('has the agreed title, H1 and dynamic-count description', () => {
    expect(uk.title).toBe('UK True Crime Podcasts: Reviewed British Shows')
    expect(uk.h1).toBe('UK true crime podcasts, reviewed')
    expect(uk.metaDescription).toBe('{count} true crime podcasts in our UK directory. Explore editorial verdicts, listener ratings where available, and our guide to British true crime.')
    expect(uk.metaDescription).not.toMatch(/\b92\b/)
  })

  it('uses a {count} token in the intro and never claims "ranked", "most listened-to" or an update date', () => {
    const all = [uk.metaDescription, ...uk.intro, ...uk.faqs.map(f => f.a), ...(uk.howToChoose?.items.map(i => i.text) ?? [])].join(' ')
    expect(uk.intro[0]).toContain('{count}')
    expect(all).not.toMatch(/ranked|most listened|updated|Real Crimes|British True Crime Club/i)
  })

  it('every intro and FAQ link phrase occurs in its text, and every target route exists', () => {
    const links = [
      ...(uk.introLinks ?? []).map(l => ({ ...l, in: uk.intro[0] })),
      ...uk.faqs.flatMap(f => (f.links ?? []).map(l => ({ ...l, in: f.a }))),
    ]
    expect(links.length).toBe(3)
    for (const l of links) {
      expect(l.in).toContain(l.text)
      if (l.href.startsWith('/blog/')) expect(existsSync(join(process.cwd(), 'content/blog', `${l.href.slice(6)}.mdx`))).toBe(true)
      else expect(existsSync(join(process.cwd(), 'app', l.href, 'page.tsx'))).toBe(true)
    }
  })

  it('FAQPage JSON-LD carries the same plain text as the visible FAQ answer', () => {
    const faq = uk.faqs[0]
    expect(faq.q).toBe('What are the best UK true crime podcasts?')
    expect(faq.a).toBe('Our must-listen UK picks include They Walk Among Us, RedHanded and Untold: The Daniel Morgan Murder. See the full list above, or our guide to British true crime podcasts.')
    expect(buildFAQSchema(uk.faqs).mainEntity[0].acceptedAnswer.text).toBe(faq.a)
  })

  it('leaves the other countries on their existing copy', () => {
    for (const c of ['US', 'AU']) {
      expect(COUNTRY_SEO[c]?.title).toBeUndefined()
      expect(COUNTRY_SEO[c]?.picksHeading).toBeUndefined()
      expect(COUNTRY_SEO[c]?.metaDescription ?? '').not.toContain('{count}')
    }
  })
})
