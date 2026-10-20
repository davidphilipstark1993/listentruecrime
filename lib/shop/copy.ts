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

export const BUSINESS_NAME = 'Listen True Crime'
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
  title: 'True Crime Merchandise UK | Listen True Crime Shop',
  description:
    'True crime T-shirts, hoodies and mugs for armchair detectives, cold case obsessives and podcast addicts. Designed by Listen True Crime, printed to order, delivered across the UK.',
}
