// Near-duplicate detection for podcast slugs, used by the admin form so an
// editor is warned before creating "counter-clock" next to "counterclock".

function squash(slug: string): string {
  return slug.replace(/-/g, '')
}

function editDistance(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0]
    prev[0] = i
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j]
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1))
      diag = tmp
    }
  }
  return prev[b.length]
}

/** Existing slugs that look like the same podcast as `slug` (never includes an exact match). */
export function findSimilarSlugs(slug: string, existing: string[], limit = 5): string[] {
  const target = squash(slug)
  if (target.length < 4) return []
  return existing
    .filter(other => {
      if (other === slug) return false
      const o = squash(other)
      if (o === target) return true
      // "bear-brook" vs "bear-brook-nhpr": one is a whole-word prefix of the other
      const [short, long] = slug.length <= other.length ? [slug, other] : [other, slug]
      if (short.length >= 6 && long.startsWith(`${short}-`)) return true
      return Math.min(o.length, target.length) >= 8 && editDistance(o, target) <= 2
    })
    .slice(0, limit)
}
