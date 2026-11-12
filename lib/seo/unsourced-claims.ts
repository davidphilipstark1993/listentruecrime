// Display guard for popularity boasts we cannot cite (download totals, chart
// positions). Podcast records and imported copy sometimes carry them; until a
// figure has a source the Fact Checker accepts, it is not shown. This is a
// safety net at render time, not a substitute for cleaning the records.

const NUM = String.raw`\d[\d.,]*\s*(?:million|billion|m|bn|k)?\+?`
const DOWNLOADS = String.raw`(?:monthly |total |weekly )?(?:downloads|listens|streams)(?: per (?:month|week|episode))?`

// A sentence that cannot be repaired by removing a phrase is dropped whole.
const BOAST_SENTENCE = new RegExp(
  String.raw`(?:^|(?<=[.!?]\s))[^.!?]*\b(?:ranked it|named it|ranks it)\b[^.!?]*\bmost[- ](?:popular|downloaded|listened)[^.!?]*[.!?]?\s*`,
  'gi',
)

const PHRASES: [RegExp, string][] = [
  // "With over 600 million downloads, Casefile's host…" -> "Casefile's host…"
  [new RegExp(String.raw`\bwith (?:over |more than |nearly |around |approximately |about )?${NUM}\s*${DOWNLOADS},?\s*`, 'gi'), ''],
  // "…, over 800M downloads" / "· 600M+ downloads" -> ""
  [new RegExp(String.raw`\s*[,;·(–—-]\s*(?:over |more than |nearly |around |approximately |about )?${NUM}\s*${DOWNLOADS}\)?`, 'gi'), ''],
]

const LEFTOVER = new RegExp(String.raw`${NUM}\s*${DOWNLOADS}`, 'i')

function tidy(text: string): string {
  const t = text
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/([,;·])\s*(?=[,;·.])/g, '')
    .replace(/^[\s,;·–—-]+|[\s,;·–—-]+$/g, '')
    .trim()
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : t
}

/**
 * Removes uncited download and chart claims. A phrase is lifted out when the
 * sentence still reads without it; otherwise the whole sentence goes. Nothing
 * is substituted: no softer figure is written in its place.
 */
export function stripUnsourcedPopularity(text: string): string {
  let out = text.replace(BOAST_SENTENCE, '')
  for (const [pattern, replacement] of PHRASES) out = out.replace(pattern, replacement)
  if (LEFTOVER.test(out)) {
    const sentences = out.match(/[^.!?]+[.!?]*\s*/g) ?? [out]
    out = sentences.filter(s => !LEFTOVER.test(s)).join('')
  }
  return tidy(out)
}

/** Null-safe wrapper for optional record fields; returns null when nothing is left. */
export function guardClaims(text: string | null | undefined): string | null {
  if (!text) return null
  return stripUnsourcedPopularity(text) || null
}
