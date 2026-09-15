import { CASES } from '@/content/cases/data'
export type { CaseData, CasePodcast } from '@/content/cases/data'

export function getAllCases() {
  return CASES.filter(c => c.published).sort((a, b) => b.year - a.year)
}

export function getCaseBySlug(slug: string) {
  return CASES.find(c => c.slug === slug && c.published) ?? null
}

/** Returns published cases that reference a given podcast slug */
export function getCasesForPodcast(podcastSlug: string) {
  return CASES.filter(
    c => c.published && c.podcasts.some(p => p.slug === podcastSlug)
  )
}

/** All published case slugs — used for generateStaticParams */
export function getAllCaseSlugs() {
  return CASES.filter(c => c.published).map(c => ({ slug: c.slug }))
}

/**
 * Related cases for a case page. A manually-curated `relatedCaseSlugs` list
 * always wins (in the order given) — otherwise falls back to automatic
 * matching so every case gets sensible related links with zero data entry:
 * cases that share a podcast are weighted far above ones that merely share
 * a country or status.
 */
export function getRelatedCases(caseSlug: string, limit = 4) {
  const current = getCaseBySlug(caseSlug)
  if (!current) return []

  const candidates = getAllCases().filter(c => c.slug !== caseSlug)

  if (current.relatedCaseSlugs?.length) {
    const manual = current.relatedCaseSlugs
      .map(slug => candidates.find(c => c.slug === slug))
      .filter((c): c is NonNullable<typeof c> => Boolean(c))
    if (manual.length) return manual.slice(0, limit)
  }

  const currentPodcastSlugs = new Set(current.podcasts.map(p => p.slug))

  return candidates
    .map(c => {
      const sharedPodcasts = c.podcasts.filter(p => currentPodcastSlugs.has(p.slug)).length
      const score = sharedPodcasts * 10 + (c.country === current.country ? 2 : 0) + (c.status === current.status ? 1 : 0)
      return { case: c, score }
    })
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(s => s.case)
}
