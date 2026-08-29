import { sanitizeEnv } from '@/lib/utils'

// Single source of truth for the canonical base URL.
// NEXT_PUBLIC_SITE_URL must be set to https://www.listentruecrime.com in Vercel.
export const BASE = sanitizeEnv(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.listentruecrime.com')
