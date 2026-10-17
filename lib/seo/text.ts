// Small helpers for building answer-first copy from the site's own data.

/** Text with optional links, so the same copy renders as JSX and as plain text for schema. */
export type Segment = string | { text: string; href: string }

export function segmentsToText(segments: Segment[]): string {
  return segments.map(s => (typeof s === 'string' ? s : s.text)).join('')
}

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

/** ["A", "B", "C"] → "A, B and C" */
export function joinList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? ''
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

/** The same list as segments, with each item linked. */
export function joinLinked(items: Array<{ text: string; href: string }>): Segment[] {
  const out: Segment[] = []
  items.forEach((item, i) => {
    if (i > 0) out.push(i === items.length - 1 ? ' and ' : ', ')
    out.push(item)
  })
  return out
}

export function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1)
}

/** First sentence of a block of copy (keeps the terminal punctuation). */
export function firstSentence(text: string): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  const match = clean.match(/^.+?[.!?](?=\s|$)/)
  return match ? match[0] : clean
}

/** Most frequent values first; ties broken alphabetically so output is stable. */
export function topCounts(values: Array<string | null | undefined>, limit: number, exclude: string[] = []): Array<{ value: string; count: number }> {
  const skip = new Set(exclude.map(v => v.toLowerCase()))
  const counts = new Map<string, number>()
  for (const v of values) {
    const key = v?.trim()
    if (!key || skip.has(key.toLowerCase())) continue
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([value, count]) => ({ value, count }))
}
