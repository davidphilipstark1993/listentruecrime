// Text clean-up for /llms-full.txt entries.
import { stripHtml } from '@/lib/utils'
import { guardClaims } from '@/lib/seo/unsourced-claims'

// Copy written for a newsletter issue ("the gentlest pick this week") is not a
// description of the show and dates badly; such blurbs are skipped.
const NEWSLETTER_VOICE = /\b(this week(?:'s|’s)?|this issue|this month(?:'s|’s)? (?:pick|issue)|in today(?:'s|’s) (?:issue|newsletter))\b/i

/** Plain-text, single-line blurb with no markup, or null when there is nothing usable. */
export function llmsBlurb(text: string | null | undefined): string | null {
  const plain = stripHtml(text ?? '').replace(/\s+/g, ' ').trim()
  if (!plain || NEWSLETTER_VOICE.test(plain)) return null
  return guardClaims(plain)
}
