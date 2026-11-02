import { CURRENT_YEAR } from '@/lib/seo/config'
import type { BestOfPage } from '@/lib/best-of'

const MAX_DESCRIPTION = 160

/** "A", "A and B", "A, B and C". */
export function joinNames(names: string[]): string {
  if (names.length <= 1) return names.join('')
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

/** Fills {top3} and {count} from the live list, so copy never hard-codes show names. */
export function fillBestOfTokens(text: string, names: string[]): string {
  return text
    .replaceAll('{top3}', joinNames(names.slice(0, 3)))
    .replaceAll('{count}', String(names.length))
}

export interface BestOfMeta {
  title: string
  description: string
  listHeading: string
}

/**
 * Title, description and list heading for a /best/[slug] page. The year comes from
 * CURRENT_YEAR; the count and the named shows come from the database list.
 */
export function bestOfMeta(page: BestOfPage, names: string[]): BestOfMeta {
  const base = page.title.replace(new RegExp(`\\s*\\(?${CURRENT_YEAR}\\)?$`), '')
  const count = names.length
  const title = count > 0 ? `${base} (${CURRENT_YEAR}): ${count} Ranked` : `${base} (${CURRENT_YEAR})`

  let description = page.description
  if (count >= 3) {
    const lead = `${page.h1}: ${joinNames(names.slice(0, 3))}`
    const tails = [
      ` lead our ranking of ${count} shows, scored for binge factor and community ratings.`,
      ` lead our ranking of ${count} shows, scored for binge factor.`,
      ` lead our ranked list of ${count} shows.`,
    ]
    const fit = tails.map(t => lead + t).find(d => d.length <= MAX_DESCRIPTION)
    if (fit) description = fit
  }

  const listHeading = `${count} podcast${count !== 1 ? 's' : ''}, ranked by binge factor`
  return { title, description, listHeading }
}
