// Kept free of imports so it can be unit-tested without the @/ alias.

/** Slugs referenced inline in MDX as <AffiliateProduct slug="..." />. */
export function extractAffiliateSlugs(mdx: string): string[] {
  const slugs = new Set<string>()
  Array.from(mdx.matchAll(/<AffiliateProduct\b[^>]*\bslug=["']([a-z0-9-]+)["']/g)).forEach(m => slugs.add(m[1]))
  return Array.from(slugs)
}
