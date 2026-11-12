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
// as a fragment.
const AUDIENCE_BLURB = /^(listeners|fans|anyone|people|those|readers|viewers|audiences|perfect for|ideal for|best for|great for|suited|for |true[- ]crime (fans|listeners|lovers|enthusiasts|obsessives|newcomers|podcast fans))/i

/** True when the text describes who a show is for, not the show itself. */
export function isAudienceBlurb(text: string | null | undefined): boolean {
  return AUDIENCE_BLURB.test((text ?? '').trim())
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
