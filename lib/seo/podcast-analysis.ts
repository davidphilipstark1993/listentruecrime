// ============================================================
// Derives human-readable pros, cons, and host descriptions
// from existing podcast data — no extra DB columns required.
// ============================================================

import type { Podcast, RatingStats } from '@/lib/types/database'

export function getPros(podcast: Podcast, stats: RatingStats | null): string[] {
  const pros: string[] = []

  // Editorial verdict
  if (podcast.quick_verdict === 'Must listen') {
    pros.push('Rated "Must Listen" by our editorial team — exceptional across all dimensions')
  }

  // Community rating highlights (only when we have meaningful data)
  if (stats && stats.rating_count >= 3) {
    if ((stats.avg_storytelling ?? 0) >= 8.5) pros.push('Community-rated outstanding for storytelling — one of the best narrative true crime shows')
    else if ((stats.avg_storytelling ?? 0) >= 7.5) pros.push('Consistently praised for strong narrative storytelling')

    if ((stats.avg_research ?? 0) >= 8.5) pros.push('Deep research quality that goes well beyond surface-level case reporting')
    else if ((stats.avg_research ?? 0) >= 7.5) pros.push('Well-researched with sourcing that goes beyond standard news reports')

    if ((stats.avg_host_quality ?? 0) >= 8.5) pros.push('Exceptional host — compelling, authoritative, and easy to trust')
    else if ((stats.avg_host_quality ?? 0) >= 7.5) pros.push('Strong host performance that holds listener attention throughout')

    if ((stats.avg_production ?? 0) >= 8.5) pros.push('High production values — clean audio, strong editing, professional presentation')
    else if ((stats.avg_production ?? 0) >= 7.5) pros.push('Good production quality with clear, well-edited audio')

    if ((stats.avg_factual_accuracy ?? 0) >= 8) pros.push('Listeners rate it highly for factual accuracy and responsible reporting')
  }

  // Binge factor (editorial if no community ratings yet)
  if ((podcast.binge_factor ?? 0) >= 9) {
    pros.push('Exceptional binge factor — near impossible to stop at one episode')
  } else if ((podcast.binge_factor ?? 0) >= 7 && pros.length < 3) {
    pros.push('High binge factor — listeners consistently come back for more')
  }

  // Format strengths
  if (podcast.format_type === 'Serialized' && pros.length < 4) {
    pros.push('Serialized format builds a compelling, sustained narrative arc across episodes')
  } else if (podcast.format_type === 'Episodic' && pros.length < 4) {
    pros.push('Episodic format — great for both casual listeners and committed fans, start anywhere')
  }

  // Factual style
  if (podcast.factual_style === 'Purely Factual' && pros.length < 4) {
    pros.push('Purely factual presentation — no speculation, no dramatisation, just the case')
  }

  // Platform breadth
  if ((podcast.platforms?.length ?? 0) >= 4 && pros.length < 4) {
    pros.push(`Available on ${podcast.platforms?.length} platforms — listen wherever you prefer`)
  }

  return pros.slice(0, 4)
}

export function getCons(podcast: Podcast, stats: RatingStats | null): string[] {
  const cons: string[] = []

  // Community rating weaknesses (only flag when meaningful sample)
  if (stats && stats.rating_count >= 5) {
    if ((stats.avg_production ?? 10) < 6) cons.push('Some listeners note inconsistent audio or production quality')
    else if ((stats.avg_production ?? 10) < 7) cons.push('Production quality is functional but not polished — audio varies between episodes')

    if ((stats.avg_storytelling ?? 10) < 6) cons.push('Storytelling style is divisive — some find the pacing slow or the narrative unfocused')

    if ((stats.avg_host_quality ?? 10) < 6) cons.push('Host style is not to everyone\'s taste — check a sample episode first')
  }

  // Format limitations
  if (podcast.format_type === 'Serialized') {
    cons.push('Must listen in order — cannot dip in and out between episodes')
  }

  // Episode length
  const len = podcast.episode_length ?? ''
  if (len.includes('90') || len.includes('120') || len.includes('2 hour') || len.includes('2hr')) {
    if (!cons.some(c => c.includes('episode'))) {
      cons.push('Long episodes (90 min+) require a time commitment — not ideal for short commutes')
    }
  }

  // Host dialogue style — flag as a con for listeners who prefer pure reporting
  if (podcast.host_style === 'Dual Host' && podcast.factual_style === 'Host Dialogue') {
    cons.push('Heavy on host conversation — listeners who prefer straight case reporting may find the banter distracting')
  }

  // Ongoing without resolution
  if (
    typeof podcast.episode_count === 'string' &&
    podcast.episode_count.toLowerCase().includes('ongoing') &&
    podcast.format_type === 'Serialized'
  ) {
    cons.push('Ongoing series with no definitive ending yet — cases may not resolve')
  }

  // Platform limitation
  if ((podcast.platforms?.length ?? 0) === 1) {
    cons.push(`Only available on ${podcast.platforms?.[0]} — not accessible on all podcast apps`)
  }

  return cons.slice(0, 3)
}

export function getHostDescription(podcast: Podcast): {
  headline: string
  detail: string
  name?: string
} | null {
  // If we have explicit host data from the DB, use that
  if (podcast.host_name) {
    const styleSuffix = podcast.host_style === 'Dual Host'
      ? ' Co-hosted show.'
      : podcast.host_style === 'Panel'
      ? ' Panel format with multiple hosts.'
      : ''

    return {
      name: podcast.host_name,
      headline: podcast.host_name,
      detail: podcast.host_bio
        ? podcast.host_bio + styleSuffix
        : `Host of ${podcast.title}.${styleSuffix}`,
    }
  }

  // Fallback: derive from host_style + factual_style
  if (!podcast.host_style && !podcast.factual_style) return null

  const styleMap: Record<string, { headline: string; detail: string }> = {
    'Single Host': {
      headline: 'Solo presenter',
      detail: 'Hosted by a single voice whose distinctive style carries you through the case. Solo hosts tend to develop a strong personal relationship with their audience over time.',
    },
    'Dual Host': {
      headline: 'Co-hosted',
      detail: 'Two hosts working together, creating a conversational dynamic that many listeners find easier to stay engaged with on long drives or commutes.',
    },
    'Panel': {
      headline: 'Panel format',
      detail: 'Multiple voices contributing to each episode, bringing different perspectives and areas of expertise to the case.',
    },
  }

  const base = podcast.host_style ? styleMap[podcast.host_style] : null
  if (!base) return null

  if (podcast.factual_style === 'Purely Factual') {
    return { ...base, detail: base.detail + ' The presentation is strictly factual — no dramatisation or editorialising.' }
  }
  if (podcast.factual_style === 'Host Dialogue') {
    return { ...base, detail: base.detail + ' The hosts use dialogue and discussion to work through the case together, making for a more conversational listen.' }
  }
  if (podcast.factual_style === 'Mixed') {
    return { ...base, detail: base.detail + ' The style blends factual reporting with host commentary and discussion.' }
  }

  return base
}

export function getPodcastPersonSchema(podcast: Podcast): object | null {
  if (!podcast.host_name) return null
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: podcast.host_name,
    ...(podcast.host_bio && { description: podcast.host_bio }),
    worksFor: {
      '@type': 'PodcastSeries',
      name: podcast.title,
    },
  }
}

export function getPodcastNarrative(podcast: Podcast, stats: RatingStats | null): string {
  const parts: string[] = []

  // Core description
  if (podcast.newsletter_worthy_summary) {
    parts.push(podcast.newsletter_worthy_summary)
  } else if (podcast.short_description) {
    parts.push(podcast.short_description)
  }

  // What makes it special
  const caseTypes = podcast.case_types?.slice(0, 2).join(' and ') ?? 'true crime'
  const verdictNote = podcast.quick_verdict === 'Must listen' ? ', earning our highest editorial rating' : ''
  const bingeNote = (podcast.binge_factor ?? 0) >= 8
    ? ` With a binge factor of ${podcast.binge_factor}/10, it sits among the most compulsively listenable shows in the genre.`
    : (podcast.binge_factor ?? 0) >= 6
    ? ` Listeners rate its binge factor at ${podcast.binge_factor}/10.`
    : ''

  if (!parts.length) {
    parts.push(
      `${podcast.title} is a ${podcast.format_type?.toLowerCase() ?? 'true crime'} podcast covering ${caseTypes}${verdictNote}.${bingeNote}`
    )
  } else if (bingeNote) {
    parts.push(bingeNote.trim())
  }

  // Community signal
  if (stats && stats.rating_count >= 3 && stats.avg_overall) {
    parts.push(
      `Our community has rated it ${stats.avg_overall.toFixed(1)}/10 across ${stats.rating_count} listener ratings${verdictNote ? '' : verdictNote}.`
    )
  }

  // Format note
  if (podcast.format_type === 'Serialized') {
    parts.push(`It follows a serialized format — each season covers one case in depth, building suspense across episodes.`)
  }

  return parts.join(' ')
}
