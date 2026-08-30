// Multi-signal duplicate detection for podcast discovery.
//
// Design goal: catch real duplicates (including "shortened name" vs "full
// title" cases like "Unresolved" vs "Unresolved: A True Crime & Mystery
// Podcast") without silently auto-rejecting genuinely different podcasts
// that happen to share generic true-crime vocabulary ("true", "crime",
// "murder", "case" etc. are NOT treated as distinguishing — only real,
// distinctive words count toward a match).
//
// Confidence tiers:
//   HIGH   — identifier match (RSS/Apple ID/website) or exact/near-exact
//            name match. Safe to auto-reject.
//   MEDIUM — meaningful but not certain overlap (partial name containment,
//            moderate fuzzy similarity). Flagged for manual review, never
//            auto-rejected.
//   NONE   — no meaningful signal.

// Structural/connector words only — NOT genre words. Removing genre words
// (crime, true, murder, cold, case, unsolved, mystery...) would make almost
// every true-crime show look like a duplicate of every other one.
const STRUCTURAL_STOPWORDS = new Set([
  'a', 'an', 'the', 'of', 'with', 'and', 'podcast', 'show', 'presents',
  'daily', 'weekly', 'series', 'official',
])

export interface ComparableRecord {
  id: string
  name: string
  rssUrl: string | null
  appleUrl: string | null
  websiteUrl: string | null
}

export type DuplicateConfidence = 'high' | 'medium' | 'none'

export interface DuplicateMatch {
  confidence: DuplicateConfidence
  matchedId: string | null
  matchedName: string | null
  reason: string
}

function tokenize(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

function coreTokens(name: string): string[] {
  return tokenize(name).filter(t => !STRUCTURAL_STOPWORDS.has(t))
}

function bigrams(str: string): string[] {
  const s = str.toLowerCase().replace(/[^a-z0-9]/g, '')
  const grams: string[] = []
  for (let i = 0; i < s.length - 1; i++) grams.push(s.slice(i, i + 2))
  return grams
}

/** Sørensen–Dice coefficient over character bigrams — 0 (no overlap) to 1 (identical). */
export function diceCoefficient(a: string, b: string): number {
  const bigramsA = bigrams(a)
  const bigramsB = bigrams(b)
  if (!bigramsA.length || !bigramsB.length) return 0

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

function normalizeUrl(url: string): string {
  return url.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/+$/, '')
}

function appleId(url: string | null): string | null {
  if (!url) return null
  const m = url.match(/id(\d+)/)
  return m ? m[1] : null
}

/** Compares one candidate name/identifiers against one existing record. */
function compareOne(
  candidateName: string,
  candidateRss: string | null,
  candidateApple: string | null,
  candidateWebsite: string | null,
  existing: ComparableRecord
): DuplicateMatch {
  const none: DuplicateMatch = { confidence: 'none', matchedId: null, matchedName: null, reason: '' }

  // 1. Strong identifier matches — decisive on their own.
  if (candidateRss && existing.rssUrl && candidateRss.trim().toLowerCase() === existing.rssUrl.trim().toLowerCase()) {
    return { confidence: 'high', matchedId: existing.id, matchedName: existing.name, reason: `Identical RSS feed URL to existing "${existing.name}"` }
  }
  const candId = appleId(candidateApple)
  const existId = appleId(existing.appleUrl)
  if (candId && existId && candId === existId) {
    return { confidence: 'high', matchedId: existing.id, matchedName: existing.name, reason: `Identical Apple Podcasts ID to existing "${existing.name}"` }
  }
  if (candidateWebsite && existing.websiteUrl) {
    const a = normalizeUrl(candidateWebsite)
    const b = normalizeUrl(existing.websiteUrl)
    if (a && b && a === b) {
      return { confidence: 'high', matchedId: existing.id, matchedName: existing.name, reason: `Identical official website to existing "${existing.name}"` }
    }
  }

  // 2. Exact normalized name.
  const candTokens = tokenize(candidateName)
  const existTokens = tokenize(existing.name)
  if (candTokens.join(' ') === existTokens.join(' ') && candTokens.length > 0) {
    return { confidence: 'high', matchedId: existing.id, matchedName: existing.name, reason: `Identical name to existing "${existing.name}"` }
  }

  // 3. Containment on distinctive (non-stopword) core tokens — catches
  // "Unresolved" vs "Unresolved: A True Crime & Mystery Podcast".
  const candCore = coreTokens(candidateName)
  const existCore = coreTokens(existing.name)
  if (candCore.length && existCore.length) {
    const [shorter, longer] = candCore.length <= existCore.length ? [candCore, existCore] : [existCore, candCore]
    const shorterLen = shorter.join('').length
    const isSubset = shorter.every(t => longer.includes(t))
    if (isSubset && shorterLen >= 6) {
      const ratio = shorter.length / longer.length
      const confidence: DuplicateConfidence = ratio >= 0.5 ? 'high' : 'medium'
      return {
        confidence,
        matchedId: existing.id,
        matchedName: existing.name,
        reason: `Name "${candidateName}" contains/is contained by existing "${existing.name}" (distinctive overlap: ${shorter.join(' ')})`,
      }
    }
  }

  // 4. Fuzzy similarity on full normalized names — catches punctuation/typo variants.
  const similarity = diceCoefficient(candTokens.join(''), existTokens.join(''))
  if (similarity >= 0.85) {
    return { confidence: 'high', matchedId: existing.id, matchedName: existing.name, reason: `Very high name similarity (${Math.round(similarity * 100)}%) to existing "${existing.name}"` }
  }
  if (similarity >= 0.55) {
    return { confidence: 'medium', matchedId: existing.id, matchedName: existing.name, reason: `Moderate name similarity (${Math.round(similarity * 100)}%) to existing "${existing.name}"` }
  }

  return none
}

const CONFIDENCE_RANK: Record<DuplicateConfidence, number> = { none: 0, medium: 1, high: 2 }

/** Compares a candidate against every existing record and returns the strongest match found. */
export function findDuplicate(
  candidateName: string,
  candidateRss: string | null,
  candidateApple: string | null,
  candidateWebsite: string | null,
  existingRecords: ComparableRecord[]
): DuplicateMatch {
  let best: DuplicateMatch = { confidence: 'none', matchedId: null, matchedName: null, reason: '' }
  for (const existing of existingRecords) {
    const match = compareOne(candidateName, candidateRss, candidateApple, candidateWebsite, existing)
    if (CONFIDENCE_RANK[match.confidence] > CONFIDENCE_RANK[best.confidence]) best = match
    if (best.confidence === 'high') break
  }
  return best
}
