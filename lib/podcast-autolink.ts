// Single-word podcast titles that are also common English words — autolinking
// these turns ordinary prose (e.g. "the suspect denies involvement") into
// misleading links to an unrelated podcast. Exact-match, case-insensitive.
const AUTOLINK_STOPWORDS = new Set(['suspect', 'believed', 'unsolved'])

export function autolinkPodcasts(
  content: string,
  podcasts: Array<{ slug: string; title: string }>
): string {
  if (!podcasts.length) return content

  // Longest titles first to prefer longer matches over partial ones
  const sorted = [...podcasts]
    .filter(pod => !AUTOLINK_STOPWORDS.has(pod.title.trim().toLowerCase()))
    .sort((a, b) => b.title.length - a.title.length)

  const titles = new Set(sorted.map(pod => pod.title))

  let inCodeBlock = false
  const lines = content.split('\n')

  return lines
    .map(line => {
      // Track fenced code blocks
      if (/^```|^~~~/.test(line)) {
        inCodeBlock = !inCodeBlock
        return line
      }
      if (inCodeBlock) return line

      // Skip headings, MDX component tags, import statements
      if (/^#{1,6}\s/.test(line) || /^<[A-Z]/.test(line) || /^import\s/.test(line)) {
        return line
      }

      // Protect existing markdown links and inline code from replacement
      const placeholders: string[] = []
      const protect = (match: string) => {
        const idx = placeholders.length
        placeholders.push(match)
        return `\x00P${idx}\x00`
      }
      let result = line.replace(/`[^`]*`|\[[^\]]+\]\([^)]+\)/g, protect)

      // Protect *italicised* titles of other works (books, films) so a podcast
      // title can't be linked from inside one — e.g. "Cold" in *In Cold Blood*.
      // An italic span that is exactly a podcast title (*Serial*) still links.
      // Single asterisks only, so **bold** text is unaffected.
      result = result.replace(/(?<!\*)\*(?![*\s])([^*\n]+?)(?<![*\s])\*(?!\*)/g, (match, inner: string) =>
        titles.has(inner.trim()) ? match : protect(match)
      )

      // Replace podcast titles in remaining plain text. Case-sensitive: many
      // podcast titles are ordinary words or phrases ("Cold", "Proof", "The
      // Disappearance"), and matching case-insensitively turns everyday lowercase
      // prose into misleading links. Requiring the title's exact casing keeps
      // genuine name references (typically capitalized) while leaving normal
      // sentences alone.
      for (const pod of sorted) {
        const escaped = pod.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const re = new RegExp(`\\b${escaped}\\b`, 'g')
        result = result.replace(re, match => `[${match}](/podcasts/${pod.slug})`)
      }

      // Restore protected segments
      result = result.replace(/\x00P(\d+)\x00/g, (_, i) => placeholders[parseInt(i, 10)])

      return result
    })
    .join('\n')
}
