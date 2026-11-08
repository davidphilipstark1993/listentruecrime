// Selection logic and copy for /best-true-crime-podcasts.
//
// Everything on the page comes from the published database or from the curated
// `relatedPodcasts` lists in the published guides. This module is pure (no I/O)
// so the rules can be unit-tested and so every sentence it produces can be
// traced back to a field that exists.

import type { Podcast } from '@/lib/types/database'
import { audienceFitVerdict, hasCaseType, isEpisodic, isMustListen, isSerialised, whoIsItFor } from '@/lib/podcast-facets'
import { stripHtml, truncate } from '@/lib/utils'

/**
 * Date the page's selections and copy were last updated. This is an editorial
 * date, NOT the render time: change it when the picks or copy are reviewed.
 * The visible "Last updated" line, the title year and JSON-LD dateModified all
 * read from here, so they can never disagree.
 */
export const BEST_PAGE_UPDATED = '2026-11-08'
export const BEST_PAGE_YEAR = Number(BEST_PAGE_UPDATED.slice(0, 4))

export function formatBestPageDate(iso = BEST_PAGE_UPDATED): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
}

/** Columns the page needs. Deliberately excludes description and search_vector (large). */
export const BEST_PAGE_COLUMNS =
  'id, slug, title, short_description, newsletter_worthy_summary, image_url, country, case_types, format_type, ' +
  'country_name, host_style, factual_style, binge_factor, episode_length, episode_count, best_episode_to_start, platforms, ' +
  'platform_urls, quick_verdict, is_featured, updated_at'

export type BestPodcast = Pick<
  Podcast,
  | 'id' | 'slug' | 'title' | 'short_description' | 'newsletter_worthy_summary' | 'image_url' | 'country' | 'country_name' | 'case_types'
  | 'format_type' | 'host_style' | 'factual_style' | 'binge_factor' | 'episode_length' | 'episode_count'
  | 'best_episode_to_start' | 'platforms' | 'platform_urls' | 'quick_verdict' | 'is_featured' | 'updated_at'
>

/** Editorial order: Binge Factor (high to low, unscored last), then featured, then A to Z for a stable result. */
export function compareBest(a: BestPodcast, b: BestPodcast): number {
  const ab = a.binge_factor ?? -1
  const bb = b.binge_factor ?? -1
  if (ab !== bb) return bb - ab
  if (a.is_featured !== b.is_featured) return a.is_featured ? -1 : 1
  return a.title.localeCompare(b.title, 'en-GB')
}

export interface BestSectionDef {
  id: string
  heading: string
  /** Label for the jump-link bar. */
  shortLabel: string
  /** Label for the "Quick answers" list. */
  quickLabel: string
  /** Short factual line under the heading. */
  blurb: string
  /** Rule description shown to readers so the selection is transparent. */
  rule: string
  predicate: (p: BestPodcast) => boolean
  /** Slug of a published guide whose curated `relatedPodcasts` list seeds this section. */
  curatedFrom?: string
  /** Where to go for the full list. */
  more: { href: string; label: string }[]
  /** Optional platform for listen links. */
  platform?: string
}

const must = (p: BestPodcast) => isMustListen(p)

export const BEST_SECTIONS: BestSectionDef[] = [
  {
    id: 'beginners',
    shortLabel: 'Beginners',
    quickLabel: 'Best for beginners',
    heading: 'Best true crime podcasts for beginners',
    blurb: 'Where to start if you are new to the genre: shows with a clear entry point, a Must listen verdict and a strong Binge Factor.',
    rule: 'Seeded by the picks in our beginners guide, then filled with Must listen shows that have a recommended starting episode and a Binge Factor of 8 or more.',
    predicate: p => must(p) && !!p.best_episode_to_start && (p.binge_factor ?? 0) >= 8,
    curatedFrom: 'best-true-crime-podcasts-for-beginners',
    more: [{ href: '/blog/best-true-crime-podcasts-for-beginners', label: 'Full beginners guide' }],
  },
  {
    id: 'investigative',
    shortLabel: 'Investigative',
    quickLabel: 'Best investigative podcast',
    heading: 'Best investigative true crime podcasts',
    blurb: 'Shows built on original reporting rather than retelling: interviews, documents and records the host went and got.',
    rule: 'Seeded by our investigative journalism guide, then filled with Must listen shows tagged Investigative.',
    predicate: p => must(p) && hasCaseType(p, 'Investigative'),
    curatedFrom: 'best-investigative-journalism-podcasts',
    more: [
      { href: '/blog/best-investigative-journalism-podcasts', label: 'Investigative podcasts guide' },
      { href: '/category/investigative', label: 'All investigative podcasts' },
    ],
  },
  {
    id: 'cold-cases',
    shortLabel: 'Cold cases',
    quickLabel: 'Best cold case podcast',
    heading: 'Best cold case podcasts',
    blurb: 'Unsolved murders and disappearances, from shows that keep returning to the evidence.',
    rule: 'Seeded by our cold case guide, then filled with Must listen shows tagged Cold Case.',
    predicate: p => must(p) && hasCaseType(p, 'Cold Case'),
    curatedFrom: 'best-cold-case-podcasts',
    more: [
      { href: '/blog/best-cold-case-podcasts', label: 'Cold case podcasts guide' },
      { href: '/category/cold-cases', label: 'All cold case podcasts' },
    ],
  },
  {
    id: 'serial-killers',
    shortLabel: 'Serial killers',
    quickLabel: 'Best serial killer podcast',
    heading: 'Best serial killer podcasts',
    blurb: 'Series and episodes on serial offenders and the investigations that stopped them.',
    rule: 'Seeded by our serial killer guide, then filled with Must listen shows tagged Serial Killer.',
    predicate: p => must(p) && hasCaseType(p, 'Serial Killer'),
    curatedFrom: 'best-serial-killer-podcasts',
    more: [
      { href: '/blog/best-serial-killer-podcasts', label: 'Serial killer podcasts guide' },
      { href: '/category/serial-killers', label: 'All serial killer podcasts' },
    ],
  },
  {
    id: 'uk',
    shortLabel: 'UK',
    quickLabel: 'Best UK true crime podcast',
    heading: 'Best UK true crime podcasts',
    blurb: 'British cases and British journalism, for listeners who want the UK legal and policing context.',
    rule: 'Seeded by our British true crime guide, then filled with Must listen shows whose country is the United Kingdom.',
    predicate: p => must(p) && p.country === 'UK',
    curatedFrom: 'best-british-true-crime-podcasts',
    more: [
      { href: '/blog/best-british-true-crime-podcasts', label: 'British true crime guide' },
      { href: '/country/UK', label: 'All UK true crime podcasts' },
    ],
  },
  {
    id: 'binge',
    shortLabel: 'Binge-worthy',
    quickLabel: 'Most binge-worthy',
    heading: 'Most binge-worthy true crime podcasts',
    blurb: 'The shows with the strongest "one more episode" pull on our editorial Binge Factor score.',
    rule: 'Seeded by our binge guide, then filled with Must listen shows that score 9 or 10 on Binge Factor.',
    predicate: p => must(p) && (p.binge_factor ?? 0) >= 9,
    curatedFrom: 'best-true-crime-podcasts-binge-weekend',
    more: [
      { href: '/blog/best-true-crime-podcasts-binge-weekend', label: 'Weekend binge guide' },
      { href: '/category/binge-worthy', label: 'All binge-worthy podcasts' },
    ],
  },
  {
    id: 'limited-series',
    shortLabel: 'Limited series',
    quickLabel: 'Best limited series',
    heading: 'Best limited-series and serialised true crime podcasts',
    blurb: 'One case followed from the first episode to the last, so you can start at the beginning and finish the story.',
    rule: 'Must listen shows whose format is serialised, highest Binge Factor first.',
    predicate: p => must(p) && isSerialised(p),
    more: [
      { href: '/blog/podcasts-like-serial', label: 'Podcasts like Serial' },
      { href: '/blog/best-true-crime-podcasts-binge-weekend', label: 'Limited series to binge in a weekend' },
    ],
  },
  {
    id: 'episodic',
    shortLabel: 'Episodic',
    quickLabel: 'Best episodic show',
    heading: 'Best episodic true crime podcasts',
    blurb: 'A new case in every episode, so you can dip in anywhere. Our directory does not record whether a show is still releasing, so check the show page for the latest episode.',
    rule: 'Must listen shows whose format is episodic and whose Binge Factor is 8 or more.',
    predicate: p => must(p) && isEpisodic(p) && (p.binge_factor ?? 0) >= 8,
    more: [
      { href: '/blog/podcasts-like-casefile', label: 'Podcasts like Casefile' },
      { href: '/blog/podcasts-like-crime-junkie', label: 'Podcasts like Crime Junkie' },
    ],
  },
  {
    id: 'spotify',
    shortLabel: 'Spotify',
    quickLabel: 'Best on Spotify',
    heading: 'Best true crime podcasts on Spotify',
    blurb: 'Must listen shows that are listed on Spotify. Open a show page for its listen links.',
    rule: 'Seeded by our Spotify guide, then filled with Must listen shows listed on Spotify.',
    predicate: p => must(p) && listedOn(p, 'Spotify'),
    curatedFrom: 'true-crime-podcasts-spotify',
    platform: 'Spotify',
    more: [
      { href: '/blog/true-crime-podcasts-spotify', label: 'True crime on Spotify guide' },
      { href: '/platform/Spotify', label: 'All Spotify true crime podcasts' },
    ],
  },
  {
    id: 'apple-podcasts',
    shortLabel: 'Apple Podcasts',
    quickLabel: 'Best on Apple Podcasts',
    heading: 'Best true crime podcasts on Apple Podcasts',
    blurb: 'Nearly every show in our directory is on Apple Podcasts, so this list is the top of the whole ranking with Apple links.',
    rule: 'Must listen shows listed on Apple Podcasts, highest Binge Factor first.',
    predicate: p => must(p) && listedOn(p, 'Apple Podcasts'),
    platform: 'Apple Podcasts',
    more: [{ href: '/platform/apple-podcasts', label: 'All Apple Podcasts true crime shows' }],
  },
]

export const listedOn = (p: BestPodcast, platform: string) => (p.platforms ?? []).includes(platform)

function urlFor(p: BestPodcast, platform: string): string | null {
  const urls = p.platform_urls as Record<string, string> | null
  const u = urls?.[platform]
  return typeof u === 'string' && /^https?:\/\//i.test(u.trim()) ? u.trim() : null
}
export const spotifyUrl = (p: BestPodcast) => urlFor(p, 'Spotify')
export const applePodcastsUrl = (p: BestPodcast) => urlFor(p, 'Apple Podcasts')
export const listenUrlFor = urlFor

export interface BestSection extends Omit<BestSectionDef, 'predicate' | 'curatedFrom'> {
  podcasts: BestPodcast[]
  /** How many published podcasts satisfy the rule in total, for honest "showing N of M" copy. */
  total: number
}

/** The headline list: Must listen and a Binge Factor of 9 or 10. */
export function pickTopPicks(all: BestPodcast[], limit = 10): { picks: BestPodcast[]; total: number } {
  const eligible = all.filter(p => isMustListen(p) && (p.binge_factor ?? 0) >= 9).sort(compareBest)
  return { picks: eligible.slice(0, limit), total: eligible.length }
}

/**
 * Builds each section: curated slugs first (in the guide's order, only if the
 * podcast is published), then rule-matching shows by editorial order, up to `perSection`.
 * Shows already used in the top picks are allowed to repeat; sections are different lenses.
 */
export function buildSections(
  all: BestPodcast[],
  curated: Record<string, string[]>,
  perSection = 5,
  defs: BestSectionDef[] = BEST_SECTIONS,
): BestSection[] {
  const bySlug = new Map(all.map(p => [p.slug, p]))
  return defs.map(def => {
    const chosen: BestPodcast[] = []
    const seen = new Set<string>()
    for (const slug of (def.curatedFrom ? curated[def.curatedFrom] : undefined) ?? []) {
      const p = bySlug.get(slug)
      if (p && (!def.platform || listedOn(p, def.platform)) && !seen.has(slug) && chosen.length < perSection) { chosen.push(p); seen.add(slug) }
    }
    const matching = all.filter(def.predicate).sort(compareBest)
    for (const p of matching) {
      if (chosen.length >= perSection) break
      if (!seen.has(p.slug)) { chosen.push(p); seen.add(p.slug) }
    }
    const { predicate: _p, curatedFrom: _c, ...rest } = def
    return { ...rest, podcasts: chosen, total: matching.length }
  }).filter(s => s.podcasts.length >= 3) // a section with fewer than three entries is not a list
}

// ---------------------------------------------------------------------------
// Copy
// ---------------------------------------------------------------------------

/** "A, B and C" */
export function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? ''
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

export interface BestFacts {
  publishedCount: number
  mustListenCount: number
  /** Podcasts with at least three community ratings (the threshold for any aggregate being shown in structured data). */
  threeRatingCount: number
  serialisedCount: number
  episodicCount: number
  ukCount: number
}

export function computeFacts(all: BestPodcast[], threeRatingCount: number): BestFacts {
  return {
    publishedCount: all.length,
    mustListenCount: all.filter(isMustListen).length,
    threeRatingCount,
    serialisedCount: all.filter(isSerialised).length,
    episodicCount: all.filter(isEpisodic).length,
    ukCount: all.filter(p => p.country === 'UK').length,
  }
}

export interface Faq { q: string; a: string }

export function buildBestFaqs(
  top: BestPodcast[],
  sections: BestSection[],
  facts: BestFacts,
  dateLabel: string,
): Faq[] {
  const sec = (id: string) => sections.find(s => s.id === id)
  const names = (id: string, n = 3) => joinNames((sec(id)?.podcasts ?? []).slice(0, n).map(p => p.title))
  const faqs: Faq[] = []
  const year = BEST_PAGE_YEAR

  if (top.length >= 3) {
    faqs.push({
      q: `What are the best true crime podcasts in ${year}?`,
      a: `Our highest-ranked picks are ${joinNames(top.slice(0, 5).map(p => p.title))}. Each has an editorial verdict of Must listen and a Binge Factor of 9 or 10 out of 10. The full ranked list is at the top of this page; the sections below pick the best shows for beginners, cold cases, serial killers, the UK and more.`,
    })
  }
  if (sec('beginners')) {
    const first = sec('beginners')!.podcasts[0]
    faqs.push({
      q: 'What true crime podcast should I start with?',
      a: `${names('beginners', 4)} are our suggested starting points for new listeners.${first.best_episode_to_start ? ` For ${first.title}, we suggest starting with: ${first.best_episode_to_start}.` : ''} Our beginners guide explains the choices in more detail.`,
    })
  }
  faqs.push({
    q: 'How do you choose and rank the best true crime podcasts?',
    a: `Three things feed the lists on this page. First, our editorial verdict: a short label such as Must listen, or a line about who a show suits. Second, the editorial Binge Factor, a 1 to 10 score for how compulsively listenable a show is, which sets the order within a list. Third, community ratings from listeners, which we show separately. Verdicts and Binge Factor scores are the editor's opinion, informed by what listeners and critics say in public reviews. The full method is on our How We Review page.`,
  })
  faqs.push({
    q: 'What is Binge Factor?',
    a: 'Binge Factor is a score out of 10 for how compulsively listenable a podcast is, that "one more episode" pull. It is the one score we assign editorially to every podcast we have scored, and community members can rate it too. A 9 or 10 means you lose track of time; a 7 or 8 is a strong pull; a low score means it is easy to stop mid-series.',
  })
  faqs.push({
    q: 'Do community ratings affect the order of this list?',
    a: facts.threeRatingCount === 0
      ? 'Not yet. Community ratings are shown on each podcast page, but no podcast has reached three ratings so far, which is the minimum we require before using an aggregate anywhere beyond the page itself. The order on this page is set by our editorial verdict and Binge Factor.'
      : `Only lightly. ${facts.threeRatingCount} podcasts have three or more community ratings. Community ratings are shown on each podcast page, but the order on this page is set by our editorial verdict and Binge Factor.`,
  })
  if (sec('cold-cases')) {
    faqs.push({
      q: 'What are the best cold case podcasts?',
      a: `Top picks include ${names('cold-cases', 4)}. Our cold case guide goes through each one, and the cold cases category lists every cold case podcast in the directory.`,
    })
  }
  if (sec('serial-killers')) {
    faqs.push({
      q: 'What are the best serial killer podcasts?',
      a: `${names('serial-killers', 4)} are among the highest-ranked serial killer podcasts in our directory. Our serial killer guide covers the wider field, including shows that look beyond the best-known names.`,
    })
  }
  if (sec('uk')) {
    faqs.push({
      q: 'What are the best UK true crime podcasts?',
      a: `${names('uk', 4)} lead our UK picks. We list ${facts.ukCount} UK podcasts in total, all on the UK true crime page.`,
    })
  }
  if (sec('investigative')) {
    faqs.push({
      q: 'What are the best investigative true crime podcasts?',
      a: `${names('investigative', 4)} are our top investigative picks. Investigative shows do original reporting, such as interviews, records requests and court documents, rather than retelling a case from public coverage.`,
    })
  }
  faqs.push({
    q: 'What is the difference between serialised and episodic true crime podcasts?',
    a: `A serialised podcast follows one case across a run of episodes, so you listen in order from the start. An episodic podcast covers a different case in each episode, so you can begin anywhere. Our directory lists ${facts.serialisedCount} serialised and ${facts.episodicCount} episodic shows.${sec('limited-series') ? ` ${names('limited-series', 3)} are among our top serialised picks.` : ''}`,
  })
  if (sec('spotify') || sec('apple-podcasts')) {
    faqs.push({
      q: 'Where can I listen to the best true crime podcasts?',
      a: `Most are on both Spotify and Apple Podcasts, and each entry above links to the show's page with its listen links. ${sec('spotify') ? `On Spotify, ${names('spotify', 3)} are among our highest-ranked. ` : ''}We also list shows on BBC Sounds, Audible, Amazon Music and other platforms.`,
    })
  }
  faqs.push({
    q: 'Have you listened to every podcast on this list?',
    a: 'No. We do not claim to have listened to every episode of every show in the directory. Verdicts and Binge Factor scores are editorial opinion, set by the editor and informed by public listener and critic reviews, and we update them when a show changes or when we find an error.',
  })
  faqs.push({
    q: 'Does paid promotion affect which podcasts are recommended?',
    a: 'No. Paid promotion is kept separate from our editorial coverage. Buying a placement does not buy a review, a rating, a verdict or a place in our editorial recommendations, and paid placements are always labelled as promoted.',
  })
  faqs.push({
    q: 'How many true crime podcasts do you cover, and how often is this page updated?',
    a: `The directory currently lists ${facts.publishedCount} true crime podcasts, ${facts.mustListenCount} of which carry a Must listen verdict. This page was last updated on ${dateLabel}, and we revise it as shows are added or re-assessed.`,
  })
  return faqs
}

// ---------------------------------------------------------------------------
// Entry text
// ---------------------------------------------------------------------------

/**
 * Award, ranking and audience-size wording that this page cannot verify. The
 * editor-entered copy on podcast pages may contain it; the primary
 * recommendation page repeats none of it. (Podcast pages are unchanged.)
 */
const UNVERIFIABLE_CLAIM =
  /\b(award|awards|winner|winning|won|shortlist(?:ed)?|nominat\w*|peabody|pulitzer|emmy|bafta|prize|most[- ](?:downloaded|listened|popular|streamed)|millions?|billions?|#\s?1|number (?:one|1)|chart(?:s|ed|-topping)?|top[- ]ranked|biggest|best[- ]known|most[- ]acclaimed|definitive|gold standard)\b/i

export function hasUnverifiableClaim(text: string | null | undefined): boolean {
  return !!text && UNVERIFIABLE_CLAIM.test(text)
}

/** Short_description is sometimes written as an audience line ("Listeners who…", "Anyone interested in…"). */
const AUDIENCE_OPENING = /^(listeners|anyone|fans|those|people|readers|viewers|true crime (?:fans|listeners)|if you)\b/i

export interface EntryText {
  /** What the show is, from editor-entered fields, free of unverifiable claims. May be empty. */
  summary: string
  /** Who it suits: the editor's audience-fit verdict, an audience-style description, or one derived line. May be empty. */
  who: string
}

export function describeEntry(p: BestPodcast, summaryMax = 230): EntryText {
  const clean = (t: string | null | undefined) => stripHtml(t).trim()
  const nws = clean(p.newsletter_worthy_summary)
  const short = clean(p.short_description)

  let who = audienceFitVerdict(p) ?? ''
  let summary = ''

  if (nws && !hasUnverifiableClaim(nws)) summary = nws
  if (short && !hasUnverifiableClaim(short)) {
    if (AUDIENCE_OPENING.test(short)) { if (!who) who = short }
    else if (!summary) summary = short
  }
  if (!who) {
    // One derived line, skipping the format lines, which would otherwise repeat on most entries.
    const derived = whoIsItFor(p).filter(l => !/^Listeners who (enjoy following|prefer variety)/.test(l))
    who = derived[0] ?? ''
  }
  return { summary: truncate(summary, summaryMax), who: truncate(who, 200) }
}
