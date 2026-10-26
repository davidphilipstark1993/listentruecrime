// Full country names for display. `country` keeps the short code that drives
// /country/[code] URLs; `country_name` (editor-entered or migrated) is what
// readers see. Unknown stays blank: never guess.
import { COUNTRIES } from '@/lib/types/database'

// Intl's wording for these reads oddly in running text
const OVERRIDES: Record<string, string> = { UK: 'United Kingdom', HK: 'Hong Kong', TT: 'Trinidad and Tobago' }

/** Name for an ISO 3166-1 alpha-2 code (plus the site's "UK"), or null when it is not a real country code. */
export function nameForCode(code: string): string | null {
  const c = code.trim().toUpperCase()
  if (OVERRIDES[c]) return OVERRIDES[c]
  if (!/^[A-Z]{2}$/.test(c)) return null
  try {
    const name = new Intl.DisplayNames(['en-GB'], { type: 'region' }).of(c)
    // Intl echoes the code back for unassigned codes
    return name && name !== c && !/unknown/i.test(name) ? name : null
  } catch {
    return null
  }
}

export function countryDisplayName(p: { country: string | null; country_name?: string | null }): string | null {
  const entered = p.country_name?.trim()
  if (entered) return entered
  if (!p.country) return null
  return COUNTRIES[p.country] ?? nameForCode(p.country)
}
