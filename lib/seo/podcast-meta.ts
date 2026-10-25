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

export function generatedDescription(p: MetaSource): string {
  const format = FORMAT_WORDS[p.format_type ?? '']
  const host = clean(p.host_name)
  const producer = clean(p.producer)
  const credit = [host && `hosted by ${host}`, producer && `produced by ${producer}`].filter(Boolean).join(' and ')
  return `${p.title} is ${format ? `a ${format}` : 'a'} true crime podcast${credit ? `, ${credit}` : ''}.`
}

export function buildPodcastMeta(p: MetaSource, slug: string, base: string) {
  // Editor-entered descriptions first, then generated. (short_description and
  // description are themselves editor fields, as before.)
  const description =
    clean(p.meta_description) ??
    clean(p.short_description) ??
    clean(p.description)?.slice(0, 160) ??
    generatedDescription(p)

  return {
    // Same pattern the pages have always used, so rankings are not disturbed.
    title: clean(p.seo_title) ? { absolute: clean(p.seo_title)! } : `${p.title} Review`,
    description,
    ogTitle: clean(p.og_title) ?? clean(p.seo_title) ?? `${p.title} | ListenTrueCrime`,
    ogDescription: clean(p.og_description) ?? description,
    canonical: clean(p.canonical_url) ?? `${base}/podcasts/${slug}`,
    robots: p.noindex ? { index: false, follow: true } : undefined,
  }
}
