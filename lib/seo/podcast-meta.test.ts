import { describe, it, expect } from 'vitest'
import { buildPodcastMeta, fitSentences, generatedDescription, generatedTitle, isAudienceBlurb } from './podcast-meta'

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

// Live short_description values from /llms-full.txt on 12 November 2026.
const LIVE_AUDIENCE_BLURBS: [string, string][] = [
  ['Crime Junkie', 'True crime fans who want concise, well-researched episodes without excessive banter or filler; great for commuters.'],
  ['Shadow World: Sarah Payne: Unforgotten', 'UK true crime listeners who want a careful, family-centred documentary about a case that changed British law, rather than a graphic retelling of the crime.'],
  ['They Walk Among Us', 'UK listeners who want their own true crime podcast tradition rather than American-focused shows; international fans who want well-crafted British perspective on crime.'],
  ['Dark Poutine', 'Canadian true crime fans; international listeners curious about crime north of the border; those who appreciate a lighter touch on dark material.'],
  ['Sword and Scale', 'True crime veterans who want visceral, no-holds-barred storytelling with authentic audio evidence; not suitable for beginners or those sensitive to graphic content.'],
  ['Chameleon: Hollywood Con Queen', 'True crime and fraud fans who love elaborate cons, Hollywood intrigue, and identity deception at a jaw-dropping scale.'],
  ['Bag Man', "Political history fans; true crime listeners who want to understand how American power insulates its criminals; anyone surprised that Watergate wasn't the only White House crime happening simultaneously."],
  ['Wrongful Conviction', 'Criminal justice reform advocates; true crime fans troubled by prosecutorial misconduct and the fallibility of the justice system.'],
  ['Slow Burn', 'History buffs and true crime fans who want political crime; listeners who want to understand how America gets to defining moments of corruption and crisis.'],
  ['Obsessed with True Crime', 'Midwest and Michigan listeners wanting representation in the genre; true crime fans who prefer clear, unadorned case presentation without comedy or excessive banter.'],
  ['American Scandal', 'History and current affairs enthusiasts who want true crime-style storytelling applied to institutional corruption and political failures.'],
]

// Synopses: about the show, so they stay usable as a description.
const LIVE_SYNOPSES: [string, string][] = [
  ['The Apology Line', 'For fifteen years, a Manhattan phone line let anonymous callers confess anything — until the man on the other end became consumed by his own creation.'],
  ['Ghosted', 'Stories of people who have completely vanished, covering both crime disappearances and chosen disappearances.'],
  ["I'm Not a Monster", 'A multi-award-winning BBC investigation into ISIS recruitment, told through the people who were pulled in.'],
  ['Serial', 'Serial review: Investigative journalism podcast devoting an entire season to one true story.'],
]

describe('isAudienceBlurb', () => {
  it.each(LIVE_AUDIENCE_BLURBS)('treats the %s audience line as an audience blurb', (title, blurb) => {
    expect(isAudienceBlurb(blurb)).toBe(true)
    // Never the meta description: with a long description that wins, without one the facts-only sentence does.
    const full = 'A documentary series that follows one case from the first report to the verdict.'
    expect(buildPodcastMeta({ ...base, title, short_description: blurb, description: full }, 'x', 'https://x.test').description)
      .toBe(`${title} review: ${full}`)
    expect(buildPodcastMeta({ ...base, title, short_description: blurb }, 'x', 'https://x.test').description)
      .toBe(`${title} is a true crime podcast.`)
  })
  it.each(LIVE_SYNOPSES)('does not treat the %s synopsis as an audience blurb', (title, synopsis) => {
    expect(isAudienceBlurb(synopsis)).toBe(false)
    expect(buildPodcastMeta({ ...base, title, short_description: synopsis, description: 'Long text.' }, 'x', 'https://x.test').description)
      .toBe(synopsis)
  })
  it('accepts "for" only when a group of people follows it', () => {
    expect(isAudienceBlurb('For fans of slow, careful reporting.')).toBe(true)
    expect(isAudienceBlurb('For anyone new to the genre.')).toBe(true)
    expect(isAudienceBlurb('Perfect for long drives.')).toBe(true)
    expect(isAudienceBlurb('For three decades the case went unsolved.')).toBe(false)
    expect(isAudienceBlurb('For the first time, the family tells the story.')).toBe(false)
  })
  it('does not mistake a line about the hosts or the people in the story for an audience line', () => {
    expect(isAudienceBlurb('Two true crime fans who decided to investigate a local cold case.')).toBe(false)
    expect(isAudienceBlurb('People who vanished without trace, and the families left behind.')).toBe(false)
    expect(isAudienceBlurb('Those who knew the victim describe her final week.')).toBe(false)
    expect(isAudienceBlurb('')).toBe(false)
    expect(isAudienceBlurb(null)).toBe(false)
  })
})
