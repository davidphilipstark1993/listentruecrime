// Single source of truth for affiliate programmes. To add a programme,
// add an entry here — the admin form, URL validation, link defaults and
// disclosure wording all pick it up. No migration needed.
//
// Nothing here generates or rewrites affiliate URLs: the URL supplied in
// /admin/affiliates is rendered exactly as entered. `hostnames` only
// guards against pasting a link for the wrong programme (or a typo).

export interface AffiliateProvider {
  id: string
  name: string
  /** Default button text when a product has no link_text of its own. */
  defaultLinkText: string
  /** Hostnames an affiliate URL for this provider may point at (subdomains allowed). */
  hostnames: string[]
  /**
   * Wording the programme itself requires to appear wherever its links are
   * used, on top of our general disclosure. Providers sharing a statement
   * (e.g. Audible via Amazon Associates) are only shown it once.
   */
  requiredStatement?: string
  /**
   * Optional check that a URL looks like an affiliate link rather than an
   * ordinary product link. Advisory only — shown as a warning in admin,
   * never used to alter the URL.
   */
  looksLikeAffiliateUrl?: (url: URL) => boolean
}

const AMAZON_STATEMENT = 'As an Amazon Associate, ListenTrueCrime earns from qualifying purchases.'

// Associates links carry a tag= parameter; SiteStripe short links
// (link.amazon, and the older amzn.to / amzn.eu) resolve to one, so they
// can't be checked here.
const amazonLooksLikeAffiliate = (url: URL) =>
  url.searchParams.has('tag') || /(^|\.)amzn\.(to|eu)$/.test(url.hostname) || url.hostname === 'link.amazon'

export const AFFILIATE_PROVIDERS = {
  amazon: {
    id: 'amazon',
    name: 'Amazon',
    defaultLinkText: 'Check the latest price on Amazon',
    hostnames: ['amazon.co.uk', 'amazon.com', 'amazon.ie', 'amazon.ca', 'amazon.com.au', 'link.amazon', 'amzn.to', 'amzn.eu'],
    requiredStatement: AMAZON_STATEMENT,
    looksLikeAffiliateUrl: amazonLooksLikeAffiliate,
  },
  // Audible in the UK is paid through Amazon Associates, so it shares the
  // Amazon statement and link format.
  audible: {
    id: 'audible',
    name: 'Audible',
    defaultLinkText: 'Listen on Audible',
    hostnames: ['audible.co.uk', 'audible.com', 'amazon.co.uk', 'amazon.com', 'link.amazon', 'amzn.to', 'amzn.eu'],
    requiredStatement: AMAZON_STATEMENT,
    looksLikeAffiliateUrl: amazonLooksLikeAffiliate,
  },
} satisfies Record<string, AffiliateProvider>

export type AffiliateProviderId = keyof typeof AFFILIATE_PROVIDERS

export const AFFILIATE_PROVIDER_IDS = Object.keys(AFFILIATE_PROVIDERS) as [AffiliateProviderId, ...AffiliateProviderId[]]

export function getAffiliateProvider(id: string): AffiliateProvider | null {
  return (AFFILIATE_PROVIDERS as Record<string, AffiliateProvider>)[id] ?? null
}

export const AFFILIATE_CATEGORIES = [
  { value: 'book', label: 'Book' },
  { value: 'audiobook', label: 'Audiobook' },
  { value: 'subscription', label: 'Listening service / subscription' },
  { value: 'other', label: 'Other' },
] as const

export const AFFILIATE_PAGE_TYPES = [
  { value: 'blog', label: 'Article', pathPrefix: '/blog/' },
  { value: 'podcast', label: 'Podcast page', pathPrefix: '/podcasts/' },
  { value: 'case', label: 'Case page', pathPrefix: '/cases/' },
  // Fixed routes wired up in code, e.g. /best-true-crime-podcasts
  { value: 'page', label: 'Other page', pathPrefix: '/' },
] as const

export type AffiliatePageType = (typeof AFFILIATE_PAGE_TYPES)[number]['value']
export const AFFILIATE_PAGE_TYPE_VALUES = AFFILIATE_PAGE_TYPES.map(t => t.value) as [AffiliatePageType, ...AffiliatePageType[]]

export const AFFILIATE_DISCLOSURE_PATH = '/terms#affiliate-links'

/**
 * An audiobook edition is linked to its book by slug: the audiobook of
 * `in-cold-blood` is `in-cold-blood-audiobook`. When both are live, the
 * book's card shows a "Prefer to listen?" line for the audiobook. The
 * line only appears once a real audiobook URL has been added, so the site
 * never claims an audiobook edition exists before that's confirmed.
 */
export const AUDIOBOOK_SLUG_SUFFIX = '-audiobook'

/** Shown in admin in place of an affiliate URL that hasn't been supplied yet. */
export const AFFILIATE_URL_PLACEHOLDER = 'AMAZON_AFFILIATE_URL_TO_BE_SUPPLIED'

/**
 * Checks an affiliate URL is https and points at one of the provider's
 * hostnames. Returns an error message, or null if valid. Never modifies
 * the URL.
 */
export function validateAffiliateUrl(providerId: string, raw: string): string | null {
  const provider = getAffiliateProvider(providerId)
  if (!provider) return 'Unknown provider'
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return 'Enter a full URL, starting https://'
  }
  if (url.protocol !== 'https:') return 'Affiliate URLs must start https://'
  const host = url.hostname.toLowerCase()
  const allowed = provider.hostnames.some(h => host === h || host.endsWith(`.${h}`))
  if (!allowed) return `This doesn't look like a ${provider.name} link (expected ${provider.hostnames.join(', ')})`
  return null
}

/** Advisory: true when the URL doesn't appear to carry affiliate tracking. */
export function affiliateUrlWarning(providerId: string, raw: string): string | null {
  const provider = getAffiliateProvider(providerId)
  if (!provider?.looksLikeAffiliateUrl) return null
  try {
    return provider.looksLikeAffiliateUrl(new URL(raw))
      ? null
      : `This looks like an ordinary ${provider.name} link, not an Associates link. Paste the link generated by ${provider.name} Associates (SiteStripe or the Associates Central link builder).`
  } catch {
    return null
  }
}

/** Distinct programme-required statements for the given providers. */
export function requiredStatementsFor(providerIds: string[]): string[] {
  const statements = providerIds
    .map(id => getAffiliateProvider(id)?.requiredStatement)
    .filter((s): s is string => Boolean(s))
  return Array.from(new Set(statements))
}
