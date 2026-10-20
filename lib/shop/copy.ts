// Customer-facing shop copy that depends on facts only the owner/supplier can
// confirm. Nothing here is a promise until the [CONFIRM] values are filled in.

/**
 * Delivery estimate shown on product pages, the basket and the shipping policy.
 * Set to 3–5 working days by the owner. It is worded as delivery time FROM
 * DISPATCH, with production called out separately, so it never promises more
 * than the supplier can support. Check it against the print provider's handling
 * time in Printify before launch, and update it if a provider is slower.
 */
export const DELIVERY_ESTIMATE: string | null =
  'Estimated delivery: 3–5 working days from dispatch. Items are printed to order, so production happens first and is not included in that estimate.'

/**
 * Prices are shown and charged VAT-inclusive (the UK rule for consumer prices).
 * Flip to false if you are not VAT registered: every "includes VAT" mention
 * disappears. Keep it in step with Admin > Shop > Settings > VAT %.
 */
export const PRICES_INCLUDE_VAT = true

export const DELIVERY_SUMMARY = [
  'Every item is printed to order, so there are two stages: production, then delivery.',
  'Delivery is currently available to UK addresses only.',
  'You will receive tracking by email as soon as your order is dispatched. Orders with several items can arrive in separate parcels.',
]

export const RETURNS_SUMMARY = [
  'Changed your mind? You can cancel within 14 days of receiving your order under the Consumer Contracts Regulations. Contact us first and we will send you the returns address — and we pay the return postage.',
  'Faulty, damaged or misprinted items: contact us and we will replace or refund them.',
  'Full details are in our Returns and Refunds Policy.',
]

export const SHOP_META = {
  title: 'True Crime Merchandise UK | Listen True Crime Shop',
  description:
    'True crime T-shirts, hoodies and mugs for armchair detectives, cold case obsessives and podcast addicts. Designed by Listen True Crime, printed to order, delivered across the UK.',
}
