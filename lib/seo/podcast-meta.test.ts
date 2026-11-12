import { describe, it, expect } from 'vitest'
import { buildPodcastMeta, fitSentences, generatedDescription, generatedTitle } from './podcast-meta'

const base = {
  title: 'Example', short_description: null, description: null, host_name: null, producer: null,
  format_type: null, seo_title: null, meta_description: null, og_title: null, og_description: null,
  canonical_url: null, noindex: false,
}

describe('buildPodcastMeta', () => {
  it('generates neutral text from empty fields', () => {
    const m = buildPodcastMeta(base, 'example', 'https://x.test')
    expect(m.description).toBe('Example is a true crime podcast.')
    expect(m.canonical).toBe('https://x.test/podcasts/example')
    expect(m.robots).toBeUndefined()
  })
  it('uses host, producer and format only', () => {
    expect(generatedDescription({ ...base, host_name: 'A B', producer: 'Co', format_type: 'Serialized' }))
      .toBe('Example is a serialised true crime podcast, hosted by A B and produced by Co.')
  })
  it('lets editor fields win', () => {
    const m = buildPodcastMeta({ ...base, seo_title: 'T', meta_description: 'D', og_title: 'OT', canonical_url: 'https://y.test/z', noindex: true }, 'example', 'https://x.test')
    expect(m.title).toEqual({ absolute: 'T' })
    expect(m.description).toBe('D')
    expect(m.ogTitle).toBe('OT')
    expect(m.ogDescription).toBe('D')
    expect(m.canonical).toBe('https://y.test/z')
    expect(m.robots).toEqual({ index: false, follow: true })
  })
  it('does not use an audience note as the description when a full description exists', () => {
    const m = buildPodcastMeta({
      ...base, title: 'Casefile',
      short_description: 'Listeners who prefer documentary-style narration with zero filler.',
      description: 'An anonymous host delivers fully scripted episodes on criminal cases from around the world.',
    }, 'casefile', 'https://x.test')
    expect(m.description).toBe('Casefile review: An anonymous host delivers fully scripted episodes on criminal cases from around the world.')
  })
  it('never uses a "True crime fans who…" audience line as the description', () => {
    const audience = 'True crime fans who want concise, well-researched episodes without excessive banter or filler; great for commuters.'
    const withFull = buildPodcastMeta({
      ...base, title: 'Crime Junkie', short_description: audience,
      description: 'A weekly show in which two friends tell the story of one case per episode.',
    }, 'crime-junkie', 'https://x.test')
    expect(withFull.description).toBe('Crime Junkie review: A weekly show in which two friends tell the story of one case per episode.')
    // No long description either: fall through to the facts-only sentence, not the audience line.
    const bare = buildPodcastMeta({ ...base, title: 'Crime Junkie', short_description: audience, host_name: 'A B', format_type: 'Episodic' }, 'crime-junkie', 'https://x.test')
    expect(bare.description).toBe('Crime Junkie is an episodic true crime podcast, hosted by A B.')
  })
  it('keeps an ordinary short_description unchanged', () => {
    const m = buildPodcastMeta({ ...base, short_description: 'Covers one Florida case in forensic detail.', description: 'Long text.' }, 'x', 'https://x.test')
    expect(m.description).toBe('Covers one Florida case in forensic detail.')
  })
})

describe('generatedTitle', () => {
  it('adds "True Crime Podcast" when the full title fits', () => {
    expect(generatedTitle({ title: 'Serial' })).toBe('Serial Review: True Crime Podcast | ListenTrueCrime')
    expect(buildPodcastMeta({ ...base, title: 'Crime Junkie' }, 'crime-junkie', 'https://x.test').title)
      .toEqual({ absolute: 'Crime Junkie Review: True Crime Podcast | ListenTrueCrime' })
  })
  it('falls back to the short pattern for long names, without truncating them', () => {
    // 64 characters with the phrase, so it still fits.
    expect(generatedTitle({ title: 'Mother Knows Murder' })).toBe('Mother Knows Murder Review: True Crime Podcast | ListenTrueCrime')
    expect(generatedTitle({ title: 'The Woman in the Woods' })).toBe('The Woman in the Woods Review | ListenTrueCrime')
    const long = 'They Walk Among Us: UK True Crime Stories From Ordinary Streets'
    expect(generatedTitle({ title: long })).toBe(`${long} Review | ListenTrueCrime`)
  })
  it('never exceeds 65 characters when the phrase is added', () => {
    for (const title of ['Serial', 'In the Dark', 'The Woman in the Woods', 'Casefile True Crime']) {
      const t = generatedTitle({ title })
      if (t.includes('True Crime Podcast')) expect(t.length).toBeLessThanOrEqual(65)
    }
  })
})

describe('fitSentences', () => {
  it('returns short text unchanged', () => {
    expect(fitSentences('One. Two.')).toBe('One. Two.')
  })
  it('cuts at a sentence boundary, never mid-sentence', () => {
    const t = 'First sentence is here. ' + 'Second sentence goes on and on '.repeat(8) + 'end.'
    expect(fitSentences(t, 60)).toBe('First sentence is here.')
  })
  it('falls back to a word-boundary cut with an ellipsis', () => {
    const out = fitSentences('word '.repeat(60).trim(), 30)
    expect(out.length).toBeLessThanOrEqual(30)
    expect(out.endsWith('…')).toBe(true)
  })
})
