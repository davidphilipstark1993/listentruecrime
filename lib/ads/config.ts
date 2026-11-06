import { sanitizeEnv } from '@/lib/utils'

// Identifies THIS site as the traffic source in UTM tags. When this module is
// copied to another site in the network, change this one value.
export const AD_SOURCE_SITE = 'listentruecrime'
export const AD_UTM_MEDIUM = 'cross_promo'

// Small label above every advert. Honest, low-key, and accurate: these are
// the owner's own sites rather than third-party advertising.
export const AD_LABEL = 'From our network'

// Hosts in the owner's network. Links to these are plain `noopener` links so
// the sites pass authority to each other; any other host is marked `sponsored`.
export const NETWORK_HOSTS = ['listentruecrime.com', 'softplaynearme.co.uk', 'aifounderfiles.com']

export const AD_BUCKET = 'ad-images'

export const AD_IMAGE_LIMITS = {
  maxBytes: 4 * 1024 * 1024, // Vercel serverless request bodies cap at ~4.5 MB
  minWidth: 600,
  minHeight: 200,
  maxDimension: 8000,
  formats: ['jpeg', 'png', 'webp'] as const,
}

export function adImageUrl(imagePath: string): string {
  const base = sanitizeEnv(process.env.NEXT_PUBLIC_SUPABASE_URL!).replace(/\/$/, '')
  return `${base}/storage/v1/object/public/${AD_BUCKET}/${imagePath}`
}

export function isNetworkUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '').toLowerCase()
    return NETWORK_HOSTS.some(h => host === h || host.endsWith(`.${h}`))
  } catch {
    return false
  }
}
