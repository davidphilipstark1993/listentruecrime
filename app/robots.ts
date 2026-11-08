import type { MetadataRoute } from 'next'
import { BASE } from '@/lib/seo/config'

// Paths no crawler needs. A crawler that matches a named group below IGNORES the
// "*" group entirely, so these must be repeated in every group that allows "/".
const PRIVATE_PATHS = ['/admin/', '/api/', '/auth/', '/shop/basket', '/shop/checkout/']

// Crawler policy (see docs/AI-SEARCH-OPTIMISATION-REPORT.md):
//  - Conventional search crawlers (Googlebot, Bingbot, etc.) fall under "*": allowed.
//  - AI *search / answer* crawlers are allowed: they are how the site gets cited.
//  - AI *training* crawlers are also allowed, as a deliberate choice to be present
//    in model knowledge. To opt out of training only, move GPTBot, ClaudeBot,
//    Google-Extended and Applebot-Extended to `disallow: '/'`; search visibility
//    is unaffected because search uses the separate bots above them.
//  - Bulk scrapers that send no traffic back are blocked.
const ALLOWED_BOTS = [
  // Search / answer engines
  'OAI-SearchBot',
  'Claude-SearchBot',
  'PerplexityBot',
  // Training / general AI crawlers (and the Google-Extended / Applebot-Extended control tokens)
  'GPTBot',
  'ClaudeBot',
  'Google-Extended',
  'Applebot-Extended',
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: PRIVATE_PATHS },
      ...ALLOWED_BOTS.map(userAgent => ({ userAgent, allow: '/', disallow: PRIVATE_PATHS })),
      { userAgent: 'CCBot', disallow: '/' },
      { userAgent: 'Bytespider', disallow: '/' },
    ],
    sitemap: `${BASE}/sitemap.xml`,
  }
}
