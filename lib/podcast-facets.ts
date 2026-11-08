// Case-insensitive helpers for the free-text podcast taxonomy.
//
// podcasts.case_types and podcasts.format_type are free text, so the same idea
// appears as "Cold Case" and "Cold case", "Serialized" and "Serialised". Exact
// string comparisons silently skip the variants, so anything that classifies a
// podcast should go through these helpers instead.

import type { Podcast } from '@/lib/types/database'

type Facets = Pick<Podcast, 'case_types' | 'format_type'>

const key = (s: string | null | undefined) => (s ?? '').trim().toLowerCase()

/** True when the podcast carries any of the given case types (case-insensitive). */
export function hasCaseType(p: Pick<Podcast, 'case_types'>, ...types: string[]): boolean {
  const wanted = new Set(types.map(key))
  return (p.case_types ?? []).some(t => wanted.has(key(t)))
}

/** "Serialized" and "Serialised" are the same format. */
export function isSerialised(p: Pick<Podcast, 'format_type'>): boolean {
  const f = key(p.format_type)
  return f === 'serialised' || f === 'serialized'
}

export function isEpisodic(p: Pick<Podcast, 'format_type'>): boolean {
  return key(p.format_type) === 'episodic'
}

export function isMustListen(p: Pick<Podcast, 'quick_verdict'>): boolean {
  return key(p.quick_verdict) === 'must listen'
}

/** Editorial verdicts that are a rating label rather than a statement of who the show suits. */
const GENERIC_VERDICTS = new Set(['must listen', 'worth a listen', 'worth your time', 'for fans of the genre', 'approach with caution'])

/** The editor's audience-fit line (e.g. "Good if UK true crime interests you"), or null for generic labels. */
export function audienceFitVerdict(p: Pick<Podcast, 'quick_verdict'>): string | null {
  const v = p.quick_verdict?.trim()
  if (!v || GENERIC_VERDICTS.has(key(v))) return null
  return v
}

/**
 * "Who it's for", derived only from fields an editor has entered. Returns an
 * empty array when nothing can be said, never a generic filler line.
 */
export function whoIsItFor(p: Pick<Podcast, 'case_types' | 'format_type' | 'host_style' | 'factual_style' | 'country'>): string[] {
  const lines: string[] = []
  if (isSerialised(p)) lines.push('Listeners who enjoy following a single case from start to finish')
  if (isEpisodic(p)) lines.push('Listeners who prefer variety — a new case with every episode')
  if (hasCaseType(p, 'Cold Case')) lines.push('Cold case enthusiasts who love decades-old unsolved mysteries')
  if (hasCaseType(p, 'Missing Person')) lines.push('Anyone fascinated by missing persons investigations')
  if (hasCaseType(p, 'Investigative')) lines.push('Fans of original investigative journalism over retold news')
  if (hasCaseType(p, 'Courtroom', 'Wrongful Conviction')) lines.push('Legal procedure enthusiasts and wrongful conviction advocates')
  if (hasCaseType(p, 'Serial Killer')) lines.push('Those interested in the psychology of serial offenders')
  if (hasCaseType(p, 'Fraud', 'White-Collar Crime')) lines.push('Fans of financial crime and corporate misconduct stories')
  if (p.host_style === 'Dual Host') lines.push('Listeners who enjoy a conversational, back-and-forth dynamic')
  if (p.factual_style === 'Purely Factual') lines.push('Those who prefer straight reporting over host commentary')
  if (p.country === 'UK') lines.push('Listeners interested in British cases and the UK criminal justice system')
  if (p.country === 'AU') lines.push('Fans of Australian true crime and its unique landscape and culture')
  return lines.slice(0, 4)
}

/** Format label normalised to the site's British spelling for display. */
export function formatLabel(p: Facets): string | null {
  if (isSerialised(p)) return 'Serialised'
  if (isEpisodic(p)) return 'Episodic'
  const f = p.format_type?.trim()
  return f ? f : null
}
