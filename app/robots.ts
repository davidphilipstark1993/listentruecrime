import type { MetadataRoute } from 'next'
import { BASE } from '@/lib/seo/config'

const PRIVATE_PATHS = ['/admin/', '/api/', '/auth/']

// AI crawlers and assistants we want to be able to read and cite the site:
// training/search crawlers (GPTBot, OAI-SearchBot, ClaudeBot, Claude-SearchBot,
// PerplexityBot) and the user-triggered fetchers behind chat answers
// (ChatGPT-User, Claude-User), plus the Google-Extended / Applebot-Extended
// opt-in tokens. A bot with its own group ignores the `*` group, so the private
// paths are repeated here.
export const AI_USER_AGENTS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-SearchBot',
  'Claude-User',
  'PerplexityBot',
  'Google-Extended',
  'Applebot-Extended',
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: PRIVATE_PATHS,
      },
      { userAgent: AI_USER_AGENTS, allow: '/', disallow: PRIVATE_PATHS },
      // Block indiscriminate scrapers
      { userAgent: 'CCBot', disallow: '/' },
      { userAgent: 'Bytespider', disallow: '/' },
    ],
    sitemap: `${BASE}/sitemap.xml`,
  }
}
