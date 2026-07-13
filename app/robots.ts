import type { MetadataRoute } from 'next'
import { BASE } from '@/lib/seo/config'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/', '/auth/'],
      },
      // Explicitly allow beneficial AI crawlers
      { userAgent: 'GPTBot', allow: '/' },
      { userAgent: 'OAI-SearchBot', allow: '/' },
      { userAgent: 'ClaudeBot', allow: '/' },
      { userAgent: 'Claude-SearchBot', allow: '/' },
      { userAgent: 'PerplexityBot', allow: '/' },
      { userAgent: 'Google-Extended', allow: '/' },
      { userAgent: 'Applebot-Extended', allow: '/' },
      // Block indiscriminate scrapers
      { userAgent: 'CCBot', disallow: '/' },
      { userAgent: 'Bytespider', disallow: '/' },
    ],
    sitemap: `${BASE}/sitemap.xml`,
  }
}
