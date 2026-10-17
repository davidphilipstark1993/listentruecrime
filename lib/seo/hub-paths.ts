import { countryFromSlug, countryHref, platformFromSlug, platformHref } from '@/lib/types/database'

/**
 * The canonical lowercase path for a /country/* or /platform/* URL, or null
 * when the path is already canonical (or isn't a known hub). Used by
 * middleware to 301 legacy URLs such as /country/US or /platform/Spotify.
 */
export function canonicalHubPath(pathname: string): string | null {
  const match = /^\/(country|platform)\/([^/]+)$/.exec(pathname)
  if (!match) return null

  let param: string
  try {
    param = decodeURIComponent(match[2])
  } catch {
    return null
  }

  let target: string | null = null
  if (match[1] === 'country') {
    const code = countryFromSlug(param)
    target = code ? countryHref(code) : null
  } else {
    const name = platformFromSlug(param)
    target = name ? platformHref(name) : null
  }
  return target && target !== pathname ? target : null
}
