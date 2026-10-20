// Customer-facing shop copy that depends on facts only the owner/supplier can
// confirm. Nothing here is a promise until the [CONFIRM] values are filled in.

/**
 * Delivery estimate shown on product pages and the basket. Leave null until it
 * is backed by Printify's handling_time for the chosen print provider plus the
 * carrier's transit time (e.g. "3–5 working days to dispatch, then 2–3 working
 * days delivery"). While null, the UI makes no timing promise.
 */
export const DELIVERY_ESTIMATE: string | null = null

export const DELIVERY_SUMMARY = [
  'Every item is printed to order, so there are two stages: production, then delivery.',
  'Delivery is currently available to UK addresses only.',
  'You will receive tracking by email as soon as your order is dispatched. Orders with several items can arrive in separate parcels.',
]

export const RETURNS_SUMMARY = [
  'Made-to-order items printed with a standard design are covered by your normal 14-day cancellation right under the Consumer Contracts Regulations. [CONFIRM: returns address and process]',
  'Faulty, damaged or misprinted items: contact us and we will replace or refund them.',
  'Full details are in our Returns and Refunds Policy.',
]

export const SHOP_META = {
  title: 'True Crime Merchandise UK | Listen True Crime Shop',
  description:
    'True crime T-shirts, hoodies and mugs for armchair detectives, cold case obsessives and podcast addicts. Designed by Listen True Crime, printed to order, delivered across the UK.',
}
