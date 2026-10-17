import { formatScore } from '@/lib/rating-stats'
import { firstSentence, lowerFirst } from '@/lib/seo/text'

interface QuickVerdictInput {
  newsletter_worthy_summary: string | null
  short_description: string | null
  binge_factor: number | null
  episode_count: string | null
  episode_length: string | null
}

const ensureStop = (text: string) => (/[.!?]$/.test(text) ? text : `${text}.`)

function episodeFact(input: QuickVerdictInput): string | null {
  const raw = input.episode_count?.trim()
  if (!raw) return null
  const length = input.episode_length?.trim()
  // "120", "120+" read as a count; free text ("Ongoing", "3 seasons") is kept as written.
  if (/^\d[\d,]*\+?$/.test(raw)) return `${raw} episodes${length ? ` of ${length}` : ''}`
  return `episodes: ${raw}${length ? `, ${length} each` : ''}`
}

/**
 * The 2–3 sentence "Quick verdict" at the top of a podcast page, drawn only
 * from fields we already hold: the standout line from the existing review
 * text, who it suits, and the editor score plus episode count/status.
 */
export function buildQuickVerdict(input: QuickVerdictInput, whoIsItFor: string[]): string | null {
  const sentences: string[] = []

  const standout = input.newsletter_worthy_summary || input.short_description
  if (standout) sentences.push(ensureStop(firstSentence(standout)))

  if (whoIsItFor.length > 0) {
    const two = whoIsItFor.slice(0, 2).map(lowerFirst).join(' and ')
    const who = two.length <= 150 ? two : lowerFirst(whoIsItFor[0])
    sentences.push(`Best for ${who}.`)
  }

  const facts: string[] = []
  if (input.binge_factor != null) facts.push(`editor score ${formatScore(Number(input.binge_factor))}/10`)
  const episodes = episodeFact(input)
  if (episodes) facts.push(episodes)
  if (facts.length > 0) {
    const text = facts.join(', ')
    sentences.push(`${text.charAt(0).toUpperCase()}${text.slice(1)}.`)
  }

  return sentences.length > 0 ? sentences.join(' ') : null
}
