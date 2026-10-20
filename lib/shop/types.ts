import type { ShopCategory } from './config'

export interface ProductImage {
  url: string
  alt: string
  placeholder?: boolean
}

export interface SizeGuide {
  unit?: string
  columns: string[]
  rows: string[][]
}

export interface ShopProductRow {
  id: string
  slug: string
  title: string
  category: ShopCategory
  short_description: string | null
  description: string | null
  images: ProductImage[]
  specs: string[]
  size_guide: SizeGuide | null
  printify_product_id: string | null
  is_published: boolean
  is_featured: boolean
  is_best_seller: boolean
  is_new: boolean
  is_placeholder: boolean
  sort_order: number
  seo_title: string | null
  seo_description: string | null
  admin_notes: string | null
  created_at: string
  updated_at: string
}

export interface ShopVariantRow {
  id: string
  product_id: string
  printify_variant_id: number | null
  sku: string | null
  colour: string
  colour_hex: string | null
  size: string
  price_pence: number | null
  cost_minor: number | null
  is_enabled: boolean
  sort_order: number
}

/** What the browser is allowed to know about a variant. No costs, no Printify ids. */
export interface PublicVariant {
  id: string
  colour: string
  colourHex: string | null
  size: string
  pricePence: number | null
  purchasable: boolean
}

export interface PublicProduct {
  id: string
  slug: string
  title: string
  category: ShopCategory
  shortDescription: string | null
  description: string | null
  images: ProductImage[]
  specs: string[]
  sizeGuide: SizeGuide | null
  isFeatured: boolean
  isBestSeller: boolean
  isNew: boolean
  isPlaceholder: boolean
  seoTitle: string | null
  seoDescription: string | null
  variants: PublicVariant[]
  /** Lowest purchasable price, null when nothing is purchasable yet. */
  fromPricePence: number | null
  purchasable: boolean
  colours: { name: string; hex: string | null }[]
  sizes: string[]
}

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'expired' | 'partially_refunded' | 'refunded'
export type FulfilmentStatus =
  | 'awaiting_payment' | 'queued' | 'submitting' | 'created' | 'in_production'
  | 'shipped' | 'delivered' | 'failed' | 'needs_review' | 'cancelled'

export interface ShopOrderRow {
  id: string
  created_at: string
  updated_at: string
  order_number: string
  payment_status: PaymentStatus
  currency: string
  subtotal_pence: number
  shipping_pence: number
  total_pence: number
  refunded_pence: number
  stripe_checkout_session_id: string | null
  stripe_payment_intent_id: string | null
  stripe_fee_pence: number | null
  paid_at: string | null
  customer_email: string | null
  customer_name: string | null
  customer_phone: string | null
  shipping_address: ShippingAddress | null
  fulfilment_status: FulfilmentStatus
  printify_order_id: string | null
  printify_status: string | null
  printify_sent_to_production_at: string | null
  printify_cost_minor: number | null
  printify_shipping_minor: number | null
  printify_tax_minor: number | null
  est_printify_shipping_minor: number | null
  fulfilment_attempts: number
  next_retry_at: string | null
  last_error: string | null
  submitting_since: string | null
  confirmation_email_sent_at: string | null
  admin_alerted_at: string | null
  notes: string | null
}

export interface ShopOrderItemRow {
  id: string
  order_id: string
  variant_id: string | null
  product_title: string
  colour: string
  size: string
  quantity: number
  unit_price_pence: number
  printify_product_id: string
  printify_variant_id: number
  est_cost_minor: number | null
}

export interface ShopShipmentRow {
  id: string
  order_id: string
  carrier: string | null
  tracking_number: string
  tracking_url: string | null
  shipped_at: string | null
  delivered_at: string | null
  email_sent_at: string | null
}

export interface ShippingAddress {
  name?: string | null
  line1?: string | null
  line2?: string | null
  city?: string | null
  state?: string | null
  postal_code?: string | null
  country?: string | null
}
