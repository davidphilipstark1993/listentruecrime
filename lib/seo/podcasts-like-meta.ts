// Hand-written <title> and meta description for /podcasts-like pages that
// Search Console shows ranking on page one with a low click-through rate
// (GSC, 18 Aug – 13 Nov 2026). Everything else uses the template in
// app/podcasts-like/[slug]/page.tsx. Titles are complete (no site suffix):
// keep them under 60 characters and descriptions at 140–155. Only name shows
// that are in the source podcast's hand-picked `if_you_liked_this` list, since
// the automatic matches change.
export const PODCASTS_LIKE_META: Record<string, { title: string; description: string }> = {
  'love-trapped': {
    title: 'Podcasts Like Love Trapped: Romance Scam Shows (2026)',
    description:
      'Liked Love Trapped? More podcasts about romance scams, controlling partners and relationships that turned criminal, each with a binge score.',
  },
  'up-and-vanished': {
    // GSC Nov 2026: "podcasts like / podcast like / podcasts similar to up and
    // vanished" at positions 7–9. These picks are fixed in podcasts-like-editorial.ts.
    title: 'Podcasts Like Up and Vanished: Investigative Cold Case Shows',
    description:
      'Podcasts like Up and Vanished that investigate one disappearance or cold case over many episodes: Your Own Backyard, The Teacher\'s Pet, Cold and more.',
  },
  'wind-of-change': {
    title: 'Podcasts Like Wind of Change (2026): Slow Burn and More',
    description:
      'Liked Wind of Change? Start with Slow Burn, Bag Man and Crimetown: reported series about politics, power and hidden history, each with a binge score.',
  },
}
