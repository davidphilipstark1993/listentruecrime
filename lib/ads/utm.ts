export interface UtmParams {
  source: string
  medium: string
  campaign?: string | null
  content?: string | null
}

export function slugifyCampaign(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'cross-promo'
}

/**
 * Adds source-specific UTM tags to a destination URL.
 *  - Existing query parameters (and the #fragment) are kept as they are.
 *  - A utm_* key that is already present is never overwritten or repeated,
 *    so re-tagging an already-tagged URL changes nothing.
 *  - Anything that isn't an http(s) URL is returned untouched.
 */
export function buildTrackedUrl(destination: string, utm: UtmParams): string {
  let url: URL
  try {
    url = new URL(destination)
  } catch {
    return destination
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return destination

  const extra = new URLSearchParams()
  const add = (key: string, value?: string | null) => {
    if (value && !url.searchParams.has(key)) extra.set(key, value)
  }
  add('utm_source', utm.source)
  add('utm_medium', utm.medium)
  add('utm_campaign', utm.campaign)
  add('utm_content', utm.content)

  const suffix = extra.toString()
  if (suffix) url.search = url.search ? `${url.search}&${suffix}` : `?${suffix}`
  return url.toString()
}
