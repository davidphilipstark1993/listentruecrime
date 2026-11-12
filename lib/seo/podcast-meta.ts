// Title/description/canonical/robots for a podcast page. Editor-entered SEO
// fields win; otherwise text is generated only from the podcast's own facts
// (name, host, producer, format) and never from verdict, rating or platforms.
import type { Podcast } from '@/lib/types/database'

type MetaSource = Pick<
  Podcast,
  'title' | 'short_description' | 'description' | 'host_name' | 'producer' | 'format_type' |
  'seo_title' | 'meta_description' | 'og_title' | 'og_description' | 'canonical_url' | 'noindex'
>

const FORMAT_WORDS: Record<string, string> = { Serialized: 'serialised', Episodic: 'episodic' }

const clean = (v: string | null | undefined) => v?.trim() || null

const MAX_DESCRIPTION = 160

const MAX_TITLE = 65
const BRAND = ' | ListenTrueCrime'

// short_description is sometimes an audience note ("Listeners who prefer...", "True crime
// fans who want...") rather than a sentence about the show; as a meta description it reads
// as a fragment. Two shapes are recognised, both anchored at the start of the text.

// A group of people: "fans", "listeners", "true crime veterans", "reform advocates".
const AUDIENCE_NOUN = 'fans|listeners|enthusiasts|buffs|advocates|veterans|lovers|devotees|obsessives|junkies|newcomers|beginners'

// 1. A direct audience opening. "For" counts only when a group follows it, so a synopsis
//    such as "For fifteen years, a phone line..." is not an audience line.
const AUDIENCE_OPENING = new RegExp(
  '^(?:' + [
    `(?:${AUDIENCE_NOUN})\\b`,
    'anyone\\b',
    '(?:people|those) (?:who (?:want|like|love|enjoy|prefer|appreciate|need|are)|interested|looking|curious|new to)\\b',
    '(?:readers|viewers|audiences)\\b',
    '(?:perfect|ideal|best|great|good|suited) (?:for|to)\\b',
    `for (?:${AUDIENCE_NOUN}|anyone|those|people)\\b`,
  ].join('|') + ')',
  'i',
)

// 2. A short lead-in naming the group, then what they want: "UK true crime listeners
//    who...", "True crime and fraud fans who...", "Political history fans; ...",
//    "History buffs and true crime fans who...". Up to five plain words may come first,
//    with no punctuation between them, and the group must be followed by a clause about
//    them or by the next group in a list.
const AUDIENCE_LEAD_IN = new RegExp(
  `^(?:[\\w'’-]+ ){1,5}(?:${AUDIENCE_NOUN})(?: who\\b| wanting\\b| looking\\b| interested\\b| curious\\b| troubled\\b| new to\\b|;| and (?:[\\w'’-]+ ){1,4}(?:${AUDIENCE_NOUN})\\b)`,
  'i',
)

// Openings that describe the show or its hosts, never its audience ("Two true crime
// fans who decided to investigate...", "A podcast for listeners who...").
const SYNOPSIS_OPENING = /^(?:a|an|the|one|two|three|four|five|hosted|hosts?|join|follow|when|how|what|why|in|on|from|after|stories|story)\b/i

/** True when the text describes who a show is for, not the show itself. */
export function isAudienceBlurb(text: string | null | undefined): boolean {
  const t = (text ?? '').replace(/\s+/g, ' ').trim()
  if (!t || SYNOPSIS_OPENING.test(t)) return false
  return AUDIENCE_OPENING.test(t) || AUDIENCE_LEAD_IN.test(t)
}

/**
 * Complete <title>, brand included. "True Crime Podcast" is added only when the whole
 * title stays within MAX_TITLE; the show name is never truncated.
 */
export function generatedTitle(p: Pick<MetaSource, 'title'>): string {
  const withPhrase = `${p.title} Review: True Crime Podcast${BRAND}`
  return withPhrase.length <= MAX_TITLE ? withPhrase : `${p.title} Review${BRAND}`
}

/** Whole sentences up to `max` characters; otherwise a word-boundary cut with an ellipsis. */
export function fitSentences(text: string, max = MAX_DESCRIPTION): string {
  const t = text.replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  const sentences = t.match(/[^.!?]+[.!?]+(?=\s|$)/g) ?? []
  let out = ''
  for (const sentence of sentences) {
    const next = `${out} ${sentence.trim()}`.trim()
    if (next.length > max) break
    out = next
  }
  if (out) return out
  return `${t.slice(0, max - 1).replace(/\s+\S*$/, '')}…`
}

export function generatedDescription(p: MetaSource): string {
  const format = FORMAT_WORDS[p.format_type ?? '']
  const host = clean(p.host_name)
  const producer = clean(p.producer)
  const credit = [host && `hosted by ${host}`, producer && `produced by ${producer}`].filter(Boolean).join(' and ')
  return `${p.title} is ${format ? `${/^[aeiou]/.test(format) ? 'an' : 'a'} ${format}` : 'a'} true crime podcast${credit ? `, ${credit}` : ''}.`
}

export function buildPodcastMeta(p: MetaSource, slug: string, base: string) {
  // Editor-entered descriptions first, then generated. (short_description and
  // description are themselves editor fields, as before.)
  const short = clean(p.short_description)
  const full = clean(p.description)
  const description =
    clean(p.meta_description) ??
    // An audience note is never the description, even when there is nothing longer to use.
    (short && !isAudienceBlurb(short) ? short : null) ??
    (full && !isAudienceBlurb(full) ? fitSentences(`${p.title} review: ${full}`) : null) ??
    generatedDescription(p)

  return {
    // Absolute, so the layout template does not append the brand a second time.
    title: { absolute: clean(p.seo_title) ?? generatedTitle(p) },
    description,
    ogTitle: clean(p.og_title) ?? clean(p.seo_title) ?? `${p.title} | ListenTrueCrime`,
    ogDescription: clean(p.og_description) ?? description,
    canonical: clean(p.canonical_url) ?? `${base}/podcasts/${slug}`,
    robots: p.noindex ? { index: false, follow: true } : undefined,
  }
}
