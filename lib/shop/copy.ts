// Customer-facing shop copy that depends on facts only the owner/supplier can
// confirm. Nothing here is a promise until the [CONFIRM] values are filled in.

/**
 * Delivery estimate shown on product pages, the basket and the shipping policy.
 * 3–5 working days is the owner's delivery figure; Printify's catalogue lists a
 * 10-day handling (production) time for the UK print providers checked on
 * 20 Oct 2026, so production is stated separately rather than hidden. Re-check
 * the handling time for whichever provider you choose and update this line.
 */
export const DELIVERY_ESTIMATE: string | null =
  'Printed to order: allow up to 10 days for production, then an estimated 3–5 working days for delivery once dispatched.'

/**
 * Listen True Crime is not VAT registered, so no VAT is charged or mentioned in
 * prices. If you ever register, set this to true, add your VAT number to the
 * terms, and set Admin > Shop > Settings > VAT % to 20.
 */
export const PRICES_INCLUDE_VAT = false

/**
 * The numbers behind DELIVERY_ESTIMATE and RETURNS_SUMMARY, for structured data.
 * Keep in step with those sentences (lib/shop/seo.test.ts checks they agree).
 */
export const DELIVERY_TIMES = { productionMaxDays: 10, transitMinDays: 3, transitMaxDays: 5 }
export const RETURN_WINDOW_DAYS = 14

export const BUSINESS_NAME = 'Listen True Crime'
export const OWNER_NAME = 'David Stark'
// Date the shop policies took effect (update when a policy changes).
export const POLICIES_UPDATED = '27 October 2026'
export const BUSINESS_ADDRESS = 'Station Road, Hessle, HU13 0BG'

export const DELIVERY_SUMMARY = [
  'Every item is printed to order, so there are two stages: production, then delivery.',
  'Delivery is currently available to UK addresses only.',
  'You will receive tracking by email as soon as your order is dispatched. Orders with several items can arrive in separate parcels.',
]

export const RETURNS_SUMMARY = [
  'Changed your mind? You can cancel within 14 days of receiving your order. Contact us first and we will send you the returns address. You pay the cost of posting it back.',
  'Faulty, damaged or misprinted items: contact us and we will replace or refund them.',
  'Full details are in our Returns and Refunds Policy.',
]

export const SHOP_META = {
  title: 'True Crime Merch & Gifts UK | Listen True Crime',
  description:
    'True crime T-shirts, hoodies, sweatshirts, mugs and tote bags for armchair detectives and podcast addicts. Our own designs, printed to order and delivered in the UK.',
}

/** Copy used on the /shop landing page only. Other pages keep the labels and blurbs in config.ts. */
export const SHOP_HOME = {
  h1: 'True crime merch and gifts, made for armchair detectives',
  intro:
    'T-shirts, hoodies, sweatshirts, mugs and tote bags in our own designs, for people who have opinions about timelines and are always five podcasts behind. Everything is printed to order, with UK delivery. A good gift for the true crime fan in your life, or for yourself.',
  categoriesHeading: 'Shop by type',
  collectionsHeading: 'Shop by obsession',
  categoryLabels: { hoodies: 'Sweatshirts & Hoodies' } as Record<string, string>,
  collectionLines: {
    'armchair-detective': 'For people who solve cases from the sofa.',
    'podcast-addict': 'For the \u201cjust one more episode\u201d crowd.',
    'case-files': 'Cold cases, case numbers and unresolved business.',
  } as Record<string, string>,
  giftHeading: 'Buying for someone else?',
  giftGuideHref: '/blog/true-crime-gift-ideas-for-podcast-listeners',
}
