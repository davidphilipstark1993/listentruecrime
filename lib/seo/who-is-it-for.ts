// "Who is this podcast for?" lines on a podcast page. An editor-written audience
// line leads when the record has one; the rest are canned lines keyed to facts on
// the record. A line is only added for a tag the show actually carries.
import { isAudienceBlurb } from '@/lib/seo/podcast-meta'

interface AudienceSource {
  short_description?: string | null
  format_type?: string | null
  case_types?: string[] | null
  host_style?: string | null
  factual_style?: string | null
  country?: string | null
}

const MAX_LINES = 4

export function getWhoIsItFor(podcast: AudienceSource): string[] {
  const lines: string[] = []
  const has = (type: string) => !!podcast.case_types?.includes(type)

  // short_description is an audience line on most records ("True crime fans who…").
  const editorLine = (podcast.short_description ?? '').replace(/\s+/g, ' ').trim()
  if (editorLine && isAudienceBlurb(editorLine)) lines.push(editorLine.replace(/[.;]+$/, ''))

  if (podcast.format_type === 'Serialized') lines.push('Listeners who enjoy following a single case from start to finish')
  if (podcast.format_type === 'Episodic') lines.push('Listeners who prefer variety — a new case with every episode')
  if (has('Cold Case')) lines.push('Cold case enthusiasts who love decades-old unsolved mysteries')
  if (has('Missing Person')) lines.push('Anyone fascinated by missing persons investigations')
  if (has('Investigative')) lines.push('Fans of original investigative journalism over retold news')
  // Two separate tags: a trial show is not a wrongful-conviction show unless it is tagged as one.
  if (has('Wrongful Conviction')) lines.push('Listeners following wrongful-conviction and criminal-justice stories')
  else if (has('Courtroom')) lines.push('Listeners interested in trials, evidence and legal procedure')
  if (has('Serial Killer')) lines.push('Those interested in the psychology of serial offenders')
  if (has('Fraud') || has('White-Collar Crime')) lines.push('Fans of financial crime and corporate misconduct stories')
  if (podcast.host_style === 'Dual Host') lines.push('Listeners who enjoy a conversational, back-and-forth dynamic')
  if (podcast.factual_style === 'Purely Factual') lines.push('Those who prefer straight reporting over host commentary')
  if (podcast.country === 'UK') lines.push('Listeners interested in British cases and the UK criminal justice system')
  if (podcast.country === 'AU') lines.push('Fans of Australian true crime and its unique landscape and culture')
  return lines.slice(0, MAX_LINES)
}
