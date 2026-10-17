import type { HubFaq } from '@/lib/seo/hub-content'

/**
 * Hand-edited hub copy. Anything set here replaces the generated first
 * draft from lib/seo/hub-content.ts for that hub.
 *
 * Keys are `${kind}:${key}`: `category:cold-cases`, `country:UK`,
 * `platform:Spotify`. `intro` is one string per paragraph (aim for 120–250
 * words in total); `faqs` should be 3–4 questions.
 *
 * TODO(owner): review each generated hub intro/FAQ on the live site and
 * paste the edited version here.
 */
export const HUB_COPY_OVERRIDES: Record<string, { intro?: string[]; faqs?: HubFaq[] }> = {}
