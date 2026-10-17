// First-draft intros and FAQs for the programmatic hubs (/category/*,
// /country/*, /platform/*), generated from the site's own podcast data:
// how many shows, the top three by editor score, common themes, format
// split, geography and platforms. Nothing here states a fact that is not
// in the data passed in.
//
// TODO(owner): review every generated hub intro and FAQ, then paste the
// edited version into HUB_COPY_OVERRIDES (lib/seo/hub-overrides.ts), which
// takes precedence over what is generated here.

import { COUNTRIES, countryHref, platformHref } from '@/lib/types/database'
import { HUB_COPY_OVERRIDES } from '@/lib/seo/hub-overrides'
import {
  joinList,
  segmentsToText,
  topCounts,
  wordCount,
  type Segment,
} from '@/lib/seo/text'

export type HubKind = 'category' | 'country' | 'platform'

export interface HubShow {
  title: string
  slug: string
  binge_factor: number | null
  case_types: string[] | null
  country: string | null
  platforms: string[] | null
  format_type: string | null
  episode_length: string | null
}

export interface HubInput {
  kind: HubKind
  /** Hub key: category slug, country code or platform display name. */
  key: string
  /** Every published show on this hub (not just the first page of cards). */
  shows: HubShow[]
  /** Total published shows on the site, for share-of-catalogue sentences. */
  catalogueTotal?: number
}

export interface HubFaq {
  q: string
  a: string
  link?: { href: string; label: string }
}

export interface HubContent {
  /** Intro paragraphs, 120–250 words in total. */
  intro: Segment[][]
  /** 3–4 data-driven questions. */
  faqs: HubFaq[]
}

export const HUB_INTRO_MIN_WORDS = 120
export const HUB_INTRO_MAX_WORDS = 250

// How each category reads inside a sentence ("<phrase> podcasts").
const CATEGORY_PHRASES: Record<string, string> = {
  'cold-cases': 'cold case',
  'missing-persons': 'missing persons',
  'investigative': 'investigative',
  'serial-killers': 'serial killer',
  'courtroom': 'courtroom and trial',
  'fraud-scams': 'fraud and scam',
  'uk-crime': 'UK true crime',
  'australian-crime': 'Australian true crime',
  'binge-worthy': 'binge-worthy',
}

// Case types that define a category — left out of the "common themes"
// sentence, which would otherwise just repeat the page topic.
const CATEGORY_OWN_CASE_TYPES: Record<string, string[]> = {
  'cold-cases': ['Cold Case'],
  'missing-persons': ['Missing Person'],
  'investigative': ['Investigative'],
  'serial-killers': ['Serial Killer', 'Murder', 'Organised Crime'],
  'courtroom': ['Courtroom', 'Wrongful Conviction'],
  'fraud-scams': ['Fraud', 'White-Collar Crime', 'Corporate Fraud', 'Financial Crime', 'Scam'],
}

const THE_COUNTRIES = new Set(['United States', 'United Kingdom', 'Philippines'])

/** "the United Kingdom", "Australia" — a country name as it reads mid-sentence. */
function withThe(name: string): string {
  return THE_COUNTRIES.has(name) ? `the ${name}` : name
}

function countryPhrase(code: string): string {
  return withThe(COUNTRIES[code] ?? code)
}

function hash(text: string): number {
  let h = 0
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0
  return h
}

const plural = (n: number, one: string, many = `${one}s`) => (n === 1 ? one : many)
const fmtScore = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1))

interface Facts {
  n: number
  topic: string // "cold case podcasts" / "podcasts from the United Kingdom" / "podcasts on Spotify"
  ranked: HubShow[]
  top: HubShow[]
  scored: HubShow[]
  avg: number | null
  highScorers: number
  serialized: number
  episodic: number
  length: string | null
  themes: Array<{ value: string; count: number }>
  countries: Array<{ value: string; count: number }>
  platforms: Array<{ value: string; count: number }>
  beginners: HubShow[]
}

function gatherFacts(input: HubInput): Facts {
  const { kind, key, shows } = input
  const ranked = [...shows].sort(
    (a, b) => (b.binge_factor ?? -1) - (a.binge_factor ?? -1) || a.title.localeCompare(b.title)
  )
  const scored = ranked.filter(s => s.binge_factor != null)
  const top = (scored.length >= 3 ? scored : ranked).slice(0, 3)
  const avg = scored.length >= 3
    ? Math.round((scored.reduce((sum, s) => sum + (s.binge_factor ?? 0), 0) / scored.length) * 10) / 10
    : null
  const own = kind === 'category' ? CATEGORY_OWN_CASE_TYPES[key] ?? [] : []

  const topic =
    kind === 'category' ? `${CATEGORY_PHRASES[key] ?? key.replace(/-/g, ' ')} podcasts`
    : kind === 'country' ? `podcasts from ${countryPhrase(key)}`
    : `podcasts on ${key}`

  return {
    n: shows.length,
    topic,
    ranked,
    top,
    scored,
    avg,
    highScorers: scored.filter(s => (s.binge_factor ?? 0) >= 8).length,
    serialized: shows.filter(s => s.format_type === 'Serialized').length,
    episodic: shows.filter(s => s.format_type === 'Episodic').length,
    length: topCounts(shows.map(s => s.episode_length), 1)[0]?.value ?? null,
    themes: topCounts(shows.flatMap(s => s.case_types ?? []), 3, own),
    countries: topCounts(shows.map(s => (s.country ? COUNTRIES[s.country] ?? s.country : null)), 3),
    platforms: topCounts(shows.flatMap(s => s.platforms ?? []), 3, kind === 'platform' ? [key] : []),
    beginners: ranked.filter(s => s.format_type === 'Episodic' && (s.binge_factor ?? 0) >= 7).slice(0, 3),
  }
}

/** "Serial (9/10), Casefile (9/10) and In the Dark (8/10)" with each title linked. */
function topShowsSegments(shows: HubShow[]): Segment[] {
  const out: Segment[] = []
  shows.forEach((s, i) => {
    if (i > 0) out.push(i === shows.length - 1 ? ' and ' : ', ')
    out.push({ text: s.title, href: `/podcasts/${s.slug}` })
    if (s.binge_factor != null) out.push(` (${fmtScore(s.binge_factor)}/10)`)
  })
  return out
}

function topShowsText(shows: HubShow[]): string {
  return segmentsToText(topShowsSegments(shows))
}

function formatSentence(f: Facts): string | null {
  const parts: string[] = []
  if (f.serialized > 0) parts.push(`${f.serialized} ${plural(f.serialized, 'is', 'are')} serialized, following a single case across a season`)
  if (f.episodic > 0) parts.push(`${f.episodic} ${plural(f.episodic, 'is', 'are')} episodic, with a new case in each episode`)
  if (parts.length === 0) return null
  const length = f.length ? ` The most common episode length is ${f.length}.` : ''
  return `Of the ${f.n}, ${parts.join(', while ')}.${length}`
}

function platformSentence(f: Facts, alt: boolean): string | null {
  if (f.platforms.length === 0) return null
  const counts = f.platforms.map(p => `${p.count} on ${p.value}`)
  return alt
    ? `For listening, ${joinList(counts)}.`
    : `By app, ${joinList(counts)}.`
}

const RANKING_SENTENCE = 'Scores on this page are editor scores out of 10; a community average only appears once a show has five listener ratings.'

function buildCandidates(input: HubInput, f: Facts): Segment[][] {
  const { kind, key } = input
  const variant = hash(`${kind}:${key}`) % 3
  const name = kind === 'country' ? countryPhrase(key) : key
  const sentences: Array<Segment[] | string | null> = []

  if (kind === 'category') {
    sentences.push(
      variant === 0
        ? [`${f.n} ${f.topic} ${plural(f.n, 'has', 'have')} been reviewed on ListenTrueCrime, and the strongest on editor score ${plural(f.top.length, 'is', 'are')} `, ...topShowsSegments(f.top), '.']
        : variant === 1
        ? [`Our ${f.topic} list brings together ${f.n} reviewed ${plural(f.n, 'show')}, led by `, ...topShowsSegments(f.top), '.']
        : [`If you want ${f.topic}, start with `, ...topShowsSegments(f.top), `: the highest editor ${plural(f.top.length, 'score')} among the ${f.n} ${plural(f.n, 'show')} we have reviewed.`]
    )
    if (f.avg != null) {
      sentences.push(`Across the list the average editor score is ${fmtScore(f.avg)}/10, and ${f.highScorers} ${plural(f.highScorers, 'show scores', 'shows score')} 8 or higher.`)
    }
    if (f.themes.length) {
      sentences.push(
        variant === 2
          ? `These shows most often also tackle ${joinList(f.themes.map(t => t.value.toLowerCase()))}.`
          : `They overlap most with ${joinList(f.themes.map(t => `${t.value.toLowerCase()} (${t.count})`))} stories.`
      )
    }
    sentences.push(formatSentence(f))
    if (f.countries.length) {
      sentences.push(
        f.countries.length === 1
          ? `All of them come from ${f.countries[0].value}.`
          : `${withThe(f.countries[0].value).replace(/^the/, 'The')} produces the most (${f.countries[0].count}), followed by ${joinList(f.countries.slice(1).map(c => `${withThe(c.value)} (${c.count})`))}.`
      )
    }
    sentences.push(platformSentence(f, variant === 0))
  } else if (kind === 'country') {
    const share = input.catalogueTotal ? Math.round((f.n / input.catalogueTotal) * 100) : null
    sentences.push(
      variant === 0
        ? [`We have reviewed ${f.n} true crime ${plural(f.n, 'podcast')} from ${name}, and the highest editor ${plural(f.top.length, 'score')} ${plural(f.top.length, 'goes', 'go')} to `, ...topShowsSegments(f.top), '.']
        : variant === 1
        ? [`${name.charAt(0).toUpperCase() + name.slice(1)} accounts for ${f.n} ${plural(f.n, 'show')} in the ListenTrueCrime catalogue; the best-scoring ${f.top.length === 1 ? 'is' : 'are'} `, ...topShowsSegments(f.top), '.']
        : [`Looking for true crime from ${name}? Start with `, ...topShowsSegments(f.top), `, the top ${f.top.length === 1 ? 'show' : f.top.length + ' shows'} by editor score out of ${f.n} reviewed.`]
    )
    if (share != null && share >= 1) sentences.push(`That is about ${share}% of the ${input.catalogueTotal!.toLocaleString('en-GB')} shows in our database.`)
    if (f.avg != null) sentences.push(`The average editor score is ${fmtScore(f.avg)}/10, with ${f.highScorers} ${plural(f.highScorers, 'show', 'shows')} at 8 or higher.`)
    if (f.themes.length) sentences.push(`Local shows lean towards ${joinList(f.themes.map(t => `${t.value.toLowerCase()} (${t.count})`))} cases.`)
    sentences.push(formatSentence(f))
    sentences.push(platformSentence(f, variant !== 1))
  } else {
    sentences.push(
      variant === 0
        ? [`${f.n} reviewed true crime ${plural(f.n, 'podcast is', 'podcasts are')} available on ${key}; ${plural(f.top.length, 'the', 'the three')} highest editor ${plural(f.top.length, 'score')} ${plural(f.top.length, 'belongs', 'belong')} to `, ...topShowsSegments(f.top), '.']
        : variant === 1
        ? [`On ${key}, we have reviewed ${f.n} true crime ${plural(f.n, 'show')}. Ranked by editor score, the front-runners ${plural(f.top.length, 'is', 'are')} `, ...topShowsSegments(f.top), '.']
        : [`Listening on ${key}? Our ${f.n} ${plural(f.n, 'review')} for that app start with `, ...topShowsSegments(f.top), '.']
    )
    if (f.avg != null) sentences.push(`Their average editor score is ${fmtScore(f.avg)}/10, and ${f.highScorers} ${plural(f.highScorers, 'scores', 'score')} 8 or higher.`)
    if (f.themes.length) sentences.push(`The most common case types are ${joinList(f.themes.map(t => `${t.value.toLowerCase()} (${t.count})`))}.`)
    if (f.countries.length) {
      sentences.push(
        f.countries.length === 1
          ? `They all originate in ${withThe(f.countries[0].value)}.`
          : `The shows come mainly from ${joinList(f.countries.map(c => `${withThe(c.value)} (${c.count})`))}.`
      )
    }
    sentences.push(formatSentence(f))
    if (f.platforms.length) {
      sentences.push(`Outside ${key}, the most common apps for these shows are ${joinList(f.platforms.map(p => p.value))}.`)
    }
  }

  return sentences
    .filter((s): s is Segment[] | string => s != null)
    .map(s => (typeof s === 'string' ? [s] : s))
}

// Site-level facts, true on every page. Only used to pad the intro of a hub
// with too little data to reach the minimum length.
function fillerSentences(kind: HubKind): Segment[][] {
  return [
    [RANKING_SENTENCE],
    ['Use the ', { text: 'browse page', href: '/browse' }, ' to narrow any list by case type, country, platform, format and binge score.'],
    ['Read ', { text: 'how we review', href: '/how-we-review' }, ' for the criteria behind the scores and what each verdict means.'],
    [kind === 'category'
      ? 'This page updates automatically as we review more shows, so the order can change from week to week.'
      : 'This list is generated from our database and updates automatically as we review more shows.'],
    ['Our free weekly newsletter picks five true crime podcasts every Sunday, and you can ', { text: 'sign up here', href: '/subscribe' }, '.'],
  ]
}

function buildIntro(input: HubInput, f: Facts): Segment[][] {
  const candidates = buildCandidates(input, f)
  const chosen: Segment[][] = []
  let words = 0

  const tryAdd = (seg: Segment[]) => {
    const w = wordCount(segmentsToText(seg))
    if (words + w > HUB_INTRO_MAX_WORDS) return
    chosen.push(seg)
    words += w
  }

  // Closing line first in the budget so it always makes it in.
  const closing: Segment[] = [RANKING_SENTENCE]
  const closingWords = wordCount(RANKING_SENTENCE)
  const reserve = HUB_INTRO_MAX_WORDS - closingWords

  for (const seg of candidates) {
    const w = wordCount(segmentsToText(seg))
    if (words + w <= reserve) {
      chosen.push(seg)
      words += w
    }
  }
  chosen.push(closing)
  words += closingWords

  for (const seg of fillerSentences(input.kind).slice(1)) {
    if (words >= HUB_INTRO_MIN_WORDS) break
    tryAdd(seg)
  }

  // Split into two paragraphs near the middle.
  const half = Math.ceil(chosen.length / 2)
  const flat = (parts: Segment[][]): Segment[] =>
    parts.flatMap((p, i) => (i === 0 ? p : [' ', ...p]))
  return chosen.length > 3 ? [flat(chosen.slice(0, half)), flat(chosen.slice(half))] : [flat(chosen)]
}

function buildFaqs(input: HubInput, f: Facts): HubFaq[] {
  const { kind, key } = input
  const name = kind === 'country' ? countryPhrase(key) : key
  const faqs: HubFaq[] = []

  const rankingQ: HubFaq = {
    q: kind === 'category' ? `How are ${f.topic} ranked?` : `How are the ${f.topic} ranked?`,
    a: `Shows are ordered by editor score, our own score out of 10. Community ratings are shown separately and only appear once a podcast has at least five listener ratings, so a single vote cannot move a show up the list.`,
    link: { href: '/how-we-review', label: 'How we review podcasts' },
  }

  if (kind === 'category') {
    faqs.push({
      q: `What are the best ${f.topic}?`,
      a: `By editor score, the top ${f.topic} on ListenTrueCrime ${f.top.length === 1 ? 'is' : 'are'} ${topShowsText(f.top)}. We have reviewed ${f.n} ${plural(f.n, 'show')} in this category.`,
    })
    faqs.push({
      q: `How many ${f.topic} have you reviewed?`,
      a: `${f.n} ${f.topic} ${plural(f.n, 'is', 'are')} listed.${f.serialized + f.episodic > 0 ? ` ${f.serialized} ${plural(f.serialized, 'is', 'are')} serialized and ${f.episodic} ${plural(f.episodic, 'is', 'are')} episodic.` : ''}${f.avg != null ? ` The average editor score is ${fmtScore(f.avg)}/10.` : ''}`,
    })
    if (f.themes.length) {
      faqs.push({
        q: `What else do ${f.topic} cover?`,
        a: `Besides the main topic, these shows most often cover ${joinList(f.themes.map(t => t.value.toLowerCase()))}, based on the case types we tag each podcast with.`,
        link: { href: '/browse', label: 'Filter by case type' },
      })
    }
  } else if (kind === 'country') {
    faqs.push({
      q: `What are the best true crime ${f.topic}?`,
      a: `By editor score, the top true crime podcasts from ${name} are ${topShowsText(f.top)}.`,
    })
    faqs.push({
      q: `How many true crime ${f.topic} have you reviewed?`,
      a: `We have reviewed ${f.n} true crime ${plural(f.n, 'podcast')} from ${name}${input.catalogueTotal && f.n / input.catalogueTotal >= 0.01 ? `, about ${Math.round((f.n / input.catalogueTotal) * 100)}% of our ${input.catalogueTotal.toLocaleString('en-GB')}-show database` : ''}.${f.avg != null ? ` Their average editor score is ${fmtScore(f.avg)}/10.` : ''}`,
    })
    if (f.platforms.length) {
      faqs.push({
        q: `Where can I listen to true crime ${f.topic}?`,
        a: `Of the ${f.n} shows, ${joinList(f.platforms.map(p => `${p.count} ${plural(p.count, 'is', 'are')} on ${p.value}`))}. Each podcast page lists every app it is available on.`,
        link: { href: platformHref('Spotify'), label: 'Browse by platform' },
      })
    }
  } else {
    faqs.push({
      q: `What are the best true crime ${f.topic}?`,
      a: `By editor score, the top true crime podcasts on ${key} are ${topShowsText(f.top)}. We have reviewed ${f.n} ${plural(f.n, 'show')} available there.`,
    })
    faqs.push(
      f.beginners.length > 0
        ? {
            q: `Which true crime podcasts on ${key} are good for beginners?`,
            a: `${joinList(f.beginners.map(s => s.title))} ${f.beginners.length === 1 ? 'is an episodic show' : 'are episodic shows'} with a high editor score, so each episode tells a self-contained story you can start anywhere.`,
          }
        : {
            q: `How many true crime podcasts on ${key} have you reviewed?`,
            a: `${f.n} reviewed ${plural(f.n, 'show is', 'shows are')} available on ${key}.${f.avg != null ? ` The average editor score is ${fmtScore(f.avg)}/10.` : ''}`,
          }
    )
    if (f.countries.length) {
      faqs.push({
        q: `Where are the true crime podcasts on ${key} from?`,
        a: `${f.countries.length === 1 ? `All of them are from ${withThe(f.countries[0].value)}.` : `Mostly ${joinList(f.countries.map(c => `${withThe(c.value)} (${c.count})`))}.`} Browse by country to see more from a specific region.`,
        link: { href: countryHref('UK'), label: 'Browse by country' },
      })
    }
  }

  faqs.push(rankingQ)
  return faqs.slice(0, 4)
}

/**
 * Generated first draft for a hub (or the hand-edited override from
 * lib/seo/hub-overrides.ts when one exists). Null when the hub has no shows
 * to describe.
 */
export function buildHubContent(input: HubInput): HubContent | null {
  if (input.shows.length === 0) return null
  const facts = gatherFacts(input)
  const generated: HubContent = { intro: buildIntro(input, facts), faqs: buildFaqs(input, facts) }
  const override = HUB_COPY_OVERRIDES[`${input.kind}:${input.key}`]
  if (!override) return generated
  return {
    intro: override.intro ? override.intro.map(p => [p]) : generated.intro,
    faqs: override.faqs ?? generated.faqs,
  }
}

/**
 * Generated FAQs first, then any hand-written ones for the hub, dropping
 * repeats of the same question so the page and its FAQPage schema carry one
 * copy of each.
 */
export function mergeFaqs<T extends { q: string }>(generated: T[], handWritten: T[]): T[] {
  const seen = new Set<string>()
  const out: T[] = []
  for (const faq of [...generated, ...handWritten]) {
    const key = faq.q.trim().toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(faq)
  }
  return out
}
