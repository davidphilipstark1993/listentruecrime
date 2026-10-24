// Slugs that older blog posts and case pages linked to, but which never
// existed in the catalogue (the real pages are listed here). Those links
// 404'd and were reported in Search Console; the content now links to the real
// slugs, and this redirects any stray inbound link or crawl of the old URL.
export const PODCAST_SLUG_ALIASES: Record<string, string> = {
  'casefile': 'casefile-true-crime',
  'teachers-pet': 'the-teachers-pet',
}
