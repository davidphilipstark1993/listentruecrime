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
