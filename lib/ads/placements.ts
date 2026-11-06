// Every place an advert can appear. To add a new placement:
//   1. add an entry here,
//   2. drop <AdSlot placement="your_key" /> where it should render.
// No migration is needed — ads.placements is validated against this list
// in code (lib/ads/schema.ts), and the admin form builds its checkboxes
// from it.

export type AdLayout = 'feature' | 'card' | 'banner'

export interface AdPlacement {
  key: string
  label: string
  /** Plain-English location, shown in the admin form. */
  where: string
  /** Default layout. The homepage promo switches to 'card' when two ads share the row. */
  layout: AdLayout
  /** Most adverts shown at once in this placement. Keep this low: they should read as recommendations. */
  maxAds: number
}

export const AD_PLACEMENTS: readonly AdPlacement[] = [
  {
    key: 'homepage_promo',
    label: 'Homepage: promotional section',
    where: 'A featured panel on the homepage, directly under the newsletter signup. Up to 2 adverts side by side.',
    layout: 'feature',
    maxAds: 2,
  },
  {
    key: 'homepage_between',
    label: 'Homepage: between sections',
    where: 'A slim banner on the homepage between the category links and the community-rated podcasts. 1 advert.',
    layout: 'banner',
    maxAds: 1,
  },
  {
    key: 'podcast_review',
    label: 'Podcast review pages',
    where: 'The sidebar of every podcast review page (below the page content on mobile). 1 advert.',
    layout: 'card',
    maxAds: 1,
  },
  {
    key: 'article',
    label: 'Articles and blog posts',
    where: 'At the end of every article, after the text and before the share buttons. 1 advert.',
    layout: 'card',
    maxAds: 1,
  },
  {
    key: 'newsletter_confirmed',
    label: 'Newsletter confirmation page',
    where: 'Under the buttons on the "You\'re subscribed" page, shown only after a successful confirmation. 1 advert.',
    layout: 'card',
    maxAds: 1,
  },
] as const

export const AD_PLACEMENT_KEYS = AD_PLACEMENTS.map(p => p.key) as [string, ...string[]]

export function getPlacement(key: string): AdPlacement | undefined {
  return AD_PLACEMENTS.find(p => p.key === key)
}

/** Recommended artwork: 16:9 landscape, e.g. 1600 x 900 px. */
export const RECOMMENDED_ASPECT = 16 / 9
export const RECOMMENDED_SIZE_LABEL = '1600 × 900 px (16:9 landscape)'
