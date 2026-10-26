import { sanitizeEnv } from '@/lib/utils'

// Single source of truth for the canonical base URL.
// NEXT_PUBLIC_SITE_URL must be set to https://www.listentruecrime.com in Vercel.
export const BASE = sanitizeEnv(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.listentruecrime.com')

// Open Graph defaults for pages that set their own `openGraph` (which replaces
// the layout's wholesale): og:type plus a branded /og share image, so no page
// is left with incomplete Open Graph tags.
export function ogDefaults(title: string, sub = 'True Crime Podcast Discovery & Reviews', type: 'website' | 'article' = 'website') {
  const params = new URLSearchParams({ title, sub })
  return {
    type,
    images: [{ url: `${BASE}/og?${params.toString()}`, width: 1200, height: 630, alt: title }],
  }
}
