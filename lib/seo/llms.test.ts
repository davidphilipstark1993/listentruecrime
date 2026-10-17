import { describe, expect, it } from 'vitest'
import { CATEGORIES } from '@/lib/types/database'
import { buildLlmsTxt } from './llms'

const guides = [
  { slug: 'best-cold-case-podcasts', title: 'Best Cold Case Podcasts', featured: true },
  { slug: 'best-comedy-true-crime-podcasts', title: 'Best Comedy True Crime Podcasts' },
  { slug: 'lucy-letby-timeline', title: 'Lucy Letby Timeline', featured: true },
  { slug: 'serial-vs-casefile', title: 'Serial vs Casefile' },
]

describe('buildLlmsTxt', () => {
  const text = buildLlmsTxt('https://www.example.com', guides)

  it('is markdown with an H1 and a blockquote summary', () => {
    expect(text.startsWith('# ListenTrueCrime\n\n> ')).toBe(true)
  })

  it('explains the editor score and the 5-rating community threshold', () => {
    expect(text).toContain('Editor score')
    expect(text).toContain('at least 5 ratings')
  })

  it('links the key pages and every category hub', () => {
    expect(text).toContain('https://www.example.com/best-true-crime-podcasts')
    expect(text).toContain('https://www.example.com/how-we-review')
    for (const c of CATEGORIES) expect(text).toContain(`https://www.example.com/category/${c.slug}`)
  })

  it('uses lowercase hub slugs', () => {
    expect(text).toContain('https://www.example.com/country/uk')
    expect(text).toContain('https://www.example.com/platform/spotify')
    expect(text).not.toMatch(/\/country\/[A-Z]|\/platform\/[A-Z]/)
  })

  it('lists featured and best-of guides, not every post', () => {
    expect(text).toContain('/blog/best-cold-case-podcasts')
    expect(text).toContain('/blog/lucy-letby-timeline')
    expect(text).toContain('/blog/best-comedy-true-crime-podcasts')
    expect(text).not.toContain('/blog/serial-vs-casefile')
  })
})
