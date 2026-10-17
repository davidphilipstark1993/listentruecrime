import { describe, expect, it } from 'vitest'
import { buildHomeAnswer, buildHomeFaqs } from './home-content'
import { segmentsToText, wordCount } from './text'

const show = (title: string) => ({ title, slug: title.toLowerCase().replace(/\s+/g, '-') })

describe('buildHomeAnswer', () => {
  it('is 60–90 words and names 3–5 shows', () => {
    const shows = ['Serial', 'Casefile', 'In the Dark', 'Crime Junkie', 'Atlanta Monster'].map(show)
    const segments = buildHomeAnswer(shows, 712)!
    const words = wordCount(segmentsToText(segments))
    expect(words).toBeGreaterThanOrEqual(60)
    expect(words).toBeLessThanOrEqual(90)
    const links = segments.filter(s => typeof s !== 'string' && s.href.startsWith('/podcasts/'))
    expect(links.length).toBeGreaterThanOrEqual(3)
    expect(links.length).toBeLessThanOrEqual(5)
  })

  it('trims the list when titles are long', () => {
    const shows = [
      'The Teacher\'s Pet: A Very Long Investigative Series Title',
      'Dr. Death and the Surgeon Who Should Never Have Been Allowed To Operate',
      'Someone Knows Something: The Complete Investigation',
      'Undisclosed: The State of Maryland v. Adnan Syed Retrial Files',
      'Up and Vanished Season One: Tara Grinstead',
    ].map(show)
    const words = wordCount(segmentsToText(buildHomeAnswer(shows, 700)!))
    expect(words).toBeLessThanOrEqual(90)
  })

  it('returns null with fewer than three shows', () => {
    expect(buildHomeAnswer([show('Serial'), show('Casefile')], 10)).toBeNull()
  })
})

describe('buildHomeFaqs', () => {
  it('has the five required questions, with answers even when data is empty', () => {
    const faqs = buildHomeFaqs({ beginners: [], uk: [], spotify: [] })
    expect(faqs).toHaveLength(5)
    expect(faqs.every(f => f.a.length > 20)).toBe(true)
    expect(faqs.map(f => f.q).join('|')).toMatch(/beginners.*UK.*Spotify.*ratings.*free/i)
    expect(faqs[3].link?.href).toBe('/how-we-review')
  })

  it('names the shows it was given', () => {
    const faqs = buildHomeFaqs({ beginners: [show('Serial'), show('Casefile')], uk: [show('Murder Mile')], spotify: [] })
    expect(faqs[0].a).toContain('Serial and Casefile')
    expect(faqs[1].a).toContain('Murder Mile')
  })
})
