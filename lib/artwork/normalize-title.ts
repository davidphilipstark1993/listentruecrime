/**
 * Normalizes a podcast title for matching: lowercases, expands ampersands,
 * strips a leading "the", strips a trailing "podcast"/"show", strips
 * punctuation/apostrophes, and collapses whitespace. Two titles that are
 * "the same show" modulo these stylistic differences normalize identically
 * — e.g. "The Crime Files Podcast" and "Crime Files" both become
 * "crime files". Titles that are genuinely different shows must NOT
 * collapse to the same string here — "Crime Stories" and "Crime Stories
 * Daily" stay distinct.
 */
export function normalizeTitleForMatch(title: string): string {
  return title
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/'/g, '')
    .replace(/[’‘]/g, '')
    .replace(/^\s*the\s+/, '')
    .replace(/\s+(podcast|show)\s*$/, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function bigrams(str: string): string[] {
  const s = str.replace(/\s+/g, '')
  const grams: string[] = []
  for (let i = 0; i < s.length - 1; i++) grams.push(s.slice(i, i + 2))
  return grams
}

/** Sørensen–Dice coefficient over character bigrams — 0 (no overlap) to 1 (identical). */
export function titleSimilarity(a: string, b: string): number {
  const bigramsA = bigrams(a)
  const bigramsB = bigrams(b)
  if (!bigramsA.length || !bigramsB.length) return a === b ? 1 : 0

  const countsB = new Map<string, number>()
  for (const g of bigramsB) countsB.set(g, (countsB.get(g) ?? 0) + 1)

  let intersection = 0
  for (const g of bigramsA) {
    const remaining = countsB.get(g) ?? 0
    if (remaining > 0) {
      intersection++
      countsB.set(g, remaining - 1)
    }
  }
  return (2 * intersection) / (bigramsA.length + bigramsB.length)
}
