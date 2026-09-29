// Kept free of imports so it can be unit-tested without the @/ alias.

/**
 * Product slugs an article references inline, from either
 * <AffiliateProduct slug="..." /> or <FurtherReading slugs="a, b" />.
 */
export function extractAffiliateSlugs(mdx: string): string[] {
  const slugs = new Set<string>()
  Array.from(mdx.matchAll(/<AffiliateProduct\b[^>]*\bslug=["']([a-z0-9-]+)["']/g)).forEach(m => slugs.add(m[1]))
  Array.from(mdx.matchAll(/<FurtherReading\b[^>]*\bslugs=["']([a-z0-9,\s-]+)["']/g)).forEach(m =>
    parseSlugList(m[1]).forEach(s => slugs.add(s))
  )
  return Array.from(slugs)
}

export function parseSlugList(list: string): string[] {
  return list.split(',').map(s => s.trim()).filter(Boolean)
}
