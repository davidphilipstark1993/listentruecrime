// Editorial ranking and section rules for /best-true-crime-podcasts.
//
// The ranked list is hand-picked: change the order here and the page, its
// ItemList schema and its meta description all follow. Every detail shown for
// a pick (artwork, verdict, episodes, where to start) comes from the podcast's
// own record, so editing a podcast in /admin updates this page too.

import { stripHtml } from '@/lib/utils'

/** Ranked picks, best first. Slugs that are missing or unpublished are skipped. */
export const BEST_PICKS: string[] = [
  'serial',
  'in-the-dark',
  'casefile-true-crime',
  'the-teachers-pet',
  's-town',
  'west-cork',
  'bear-brook',
  'your-own-backyard',
  'dr-death',
  'crime-junkie',
  'bone-valley',
  'someone-knows-something',
  'believed',
  'the-missing-cryptoqueen',
  'dirty-john',
  'sweet-bobby',
  'the-dropout',
  'crimetown',
  'cold',
  'morbid',
  'wrongful-conviction-with-jason-flom',
  'where-is-george-gibney',
  'the-retrievals',
  'up-and-vanished',
  'murder-mile-uk-true-crime',
]

/** Date the picks were last reviewed. Shown on the page and used in schema. Bump when the list changes. */
export const BEST_PICKS_UPDATED = '2026-11-11'

export function formatPicksDate(iso = BEST_PICKS_UPDATED): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  })
}

/** Returns the picks in editorial order, skipping any slug not in `pool`. */
export function orderPicks<T extends { slug: string }>(pool: T[], picks: string[] = BEST_PICKS): T[] {
  const bySlug = new Map(pool.map(p => [p.slug, p]))
  return picks.map(s => bySlug.get(s)).filter((p): p is T => !!p)
}

interface SectionPodcast {
  slug: string
  country: string | null
  case_types: string[] | null
  quick_verdict: string | null
}

export interface BestTypeSection {
  id: string
  heading: string
  shortLabel: string
  blurb: string
  predicate: (p: SectionPodcast) => boolean
  more: { href: string; label: string }
}

const hasType = (p: SectionPodcast, ...types: string[]) => {
  const wanted = types.map(t => t.toLowerCase())
  return (p.case_types ?? []).some(t => wanted.includes(t.toLowerCase()))
}

/** "Best by type" sections. Each shows Must listen shows not already in the ranked list. */
export const BEST_TYPE_SECTIONS: BestTypeSection[] = [
  {
    id: 'investigative',
    heading: 'Best investigative true crime podcasts',
    shortLabel: 'Investigative',
    blurb: 'Original reporting: documents, interviews and evidence the journalists went and found themselves.',
    predicate: p => hasType(p, 'Investigative', 'Journalism'),
    more: { href: '/blog/best-investigative-journalism-podcasts', label: 'Investigative podcasts guide' },
  },
  {
    id: 'cold-cases',
    heading: 'Best cold case podcasts',
    shortLabel: 'Cold cases',
    blurb: 'Unsolved murders and disappearances, from shows that keep going back to the evidence.',
    predicate: p => hasType(p, 'Cold Case'),
    more: { href: '/blog/best-cold-case-podcasts', label: 'Cold case podcasts guide' },
  },
  {
    id: 'serial-killers',
    heading: 'Best serial killer podcasts',
    shortLabel: 'Serial killers',
    blurb: 'Serial offenders and the investigations that finally stopped them.',
    predicate: p => hasType(p, 'Serial Killer'),
    more: { href: '/blog/best-serial-killer-podcasts', label: 'Serial killer podcasts guide' },
  },
  {
    id: 'wrongful-convictions',
    heading: 'Best wrongful conviction podcasts',
    shortLabel: 'Wrongful convictions',
    blurb: 'Cases where the justice system got it wrong, and the people trying to put it right.',
    predicate: p => hasType(p, 'Wrongful Conviction', 'Systemic Injustice'),
    more: { href: '/blog/best-courtroom-true-crime-podcasts', label: 'Courtroom podcasts guide' },
  },
  {
    id: 'fraud',
    heading: 'Best fraud and scam podcasts',
    shortLabel: 'Fraud and scams',
    blurb: 'Con artists, cults of personality and white-collar crime.',
    predicate: p => hasType(p, 'Fraud', 'White-Collar Crime'),
    more: { href: '/blog/best-fraud-scam-podcasts', label: 'Fraud and scam podcasts guide' },
  },
  {
    id: 'uk',
    heading: 'Best UK true crime podcasts',
    shortLabel: 'UK',
    blurb: 'British cases with the UK policing and legal context.',
    predicate: p => p.country === 'UK',
    more: { href: '/blog/best-british-true-crime-podcasts', label: 'British true crime guide' },
  },
  {
    id: 'australia',
    heading: 'Best Australian true crime podcasts',
    shortLabel: 'Australia',
    blurb: 'Australian and New Zealand cases, from Casefile’s home turf.',
    predicate: p => p.country === 'AU' || p.country === 'NZ',
    more: { href: '/blog/best-australian-true-crime-podcasts', label: 'Australian true crime guide' },
  },
]

/** True for a "Must listen" verdict, whatever the casing. */
export function isMustListen(p: { quick_verdict: string | null }): boolean {
  return (p.quick_verdict ?? '').trim().toLowerCase() === 'must listen'
}

/** Plain text, whitespace collapsed; null when empty. */
export function clean(text: string | null | undefined): string | null {
  const t = stripHtml(text ?? '').replace(/\s+/g, ' ').trim()
  return t || null
}

/**
 * "Best for" text. `short_description` is written as an audience line on most
 * records ("True crime fans who…"), but some hold a plain synopsis; only the
 * audience form is labelled "Best for".
 */
export function audienceLine(shortDescription: string | null): string | null {
  const t = clean(shortDescription)
  if (!t) return null
  return /^(true crime fans|listeners|anyone|people|fans|those|true crime listeners)\b/i.test(t) ? t : null
}
