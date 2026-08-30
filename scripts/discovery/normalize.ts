// Lowercases + strips punctuation/whitespace so near-duplicate podcast names
// ("The Generation Why Podcast" vs "Generation Why") compare equal-ish.
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\bpodcast\b/g, '')
    .replace(/[^a-z0-9]+/g, '')
    .trim()
}
