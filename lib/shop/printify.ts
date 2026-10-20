import { sanitizeEnv } from '@/lib/utils'

// Thin server-side client for the Printify REST API (https://developers.printify.com).
// Used only from API routes / server code — the token never reaches the browser.
//
// Costs and prices in Printify responses are integers in minor units (cents).

const API = 'https://api.printify.com/v1'

export class PrintifyError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: string,
    /** Safe to try again later: Printify told us it did not process the request. */
    readonly retryable: boolean,
    /** We cannot tell whether Printify processed the request (timeout, network drop, 500/504). */
    readonly ambiguous = false,
  ) {
    super(message)
    this.name = 'PrintifyError'
  }
}

export function printifyConfigured(): boolean {
  return Boolean(process.env.PRINTIFY_API_TOKEN && process.env.PRINTIFY_SHOP_ID)
}

function creds() {
  const token = process.env.PRINTIFY_API_TOKEN ? sanitizeEnv(process.env.PRINTIFY_API_TOKEN) : ''
  const shopId = process.env.PRINTIFY_SHOP_ID ? sanitizeEnv(process.env.PRINTIFY_SHOP_ID) : ''
  if (!token || !shopId) throw new PrintifyError('Printify is not configured (PRINTIFY_API_TOKEN / PRINTIFY_SHOP_ID)', 0, '', false, false)
  return { token, shopId }
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

/**
 * One request with bounded in-process retries for transient failures only.
 * GETs are retried on any transient failure; writes only when Printify says it
 * did not process them (429/502/503). A 4xx validation error is never retried —
 * it won't get better. createOrder uses `retries: 0`; the fulfilment layer owns
 * that decision because a blind retry could create a duplicate supplier order.
 */
async function request<T>(method: 'GET' | 'POST' | 'DELETE', path: string, body?: unknown, retries = 2): Promise<T> {
  const { token } = creds()
  let attempt = 0
  for (;;) {
    let res: Response | null = null
    let networkError: unknown = null
    try {
      res = await fetch(`${API}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json;charset=utf-8',
          'User-Agent': 'ListenTrueCrime-Shop',
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(20_000),
        cache: 'no-store',
      })
    } catch (err) {
      networkError = err
    }

    if (res?.ok) {
      const text = await res.text()
      return (text ? JSON.parse(text) : {}) as T
    }

    const status = res?.status ?? 0
    const text = res ? await res.text().catch(() => '') : String(networkError)
    // 429/502/503: Printify did not process the request (docs: 502 is safe to retry).
    // Network error, 500 and 504: the request may have been processed.
    const retryable = [429, 502, 503].includes(status)
    const ambiguous = !res || status === 500 || status === 504
    if ((retryable || (method === 'GET' && ambiguous)) && attempt < retries) {
      attempt++
      await sleep(500 * 2 ** attempt)
      continue
    }
    throw new PrintifyError(`Printify ${method} ${path} failed (${status || 'network'}): ${text.slice(0, 500)}`, status, text, retryable, ambiguous)
  }
}

// ─── Types (only the fields we use) ─────────────────────────────────────────
export interface PrintifyVariant {
  id: number
  sku?: string
  title: string
  price: number
  cost?: number
  is_enabled: boolean
  is_available?: boolean
  options: number[]
}
export interface PrintifyOptionValue { id: number; title: string; colors?: string[] }
export interface PrintifyOption { name: string; type: string; values: PrintifyOptionValue[] }
export interface PrintifyProduct {
  id: string
  title: string
  description?: string
  blueprint_id?: number
  print_provider_id?: number
  variants: PrintifyVariant[]
  options: PrintifyOption[]
  images: { src: string; variant_ids: number[]; position: string; is_default: boolean }[]
  visible?: boolean
}
export interface PrintifyShipment {
  carrier?: string
  number?: string
  url?: string
  delivered_at?: string | null
  shipped_at?: string | null
  line_item_ids?: string[]
}
export interface PrintifyOrder {
  id: string
  status: string
  total_price?: number
  total_shipping?: number
  total_tax?: number
  shipments?: PrintifyShipment[]
  sent_to_production_at?: string | null
  fulfilled_at?: string | null
  external_id?: string
  app_order_id?: string
}
export interface PrintifyAddress {
  first_name: string
  last_name: string
  email: string
  phone?: string
  country: string
  region?: string
  address1: string
  address2?: string
  city: string
  zip: string
}
export interface PrintifyLineItem { product_id: string; variant_id: number; quantity: number }
export interface ShippingCosts { standard?: number; express?: number; priority?: number; printify_express?: number; economy?: number }

// ─── Calls ───────────────────────────────────────────────────────────────────
export const getProduct = (productId: string) =>
  request<PrintifyProduct>('GET', `/shops/${creds().shopId}/products/${encodeURIComponent(productId)}.json`)

export const getOrder = (orderId: string) =>
  request<PrintifyOrder>('GET', `/shops/${creds().shopId}/orders/${encodeURIComponent(orderId)}.json`)

export const calculateShipping = (lineItems: PrintifyLineItem[], country: string) =>
  request<ShippingCosts>('POST', `/shops/${creds().shopId}/orders/shipping.json`, {
    line_items: lineItems,
    address_to: { country },
  })

/**
 * Creates the order. NOT retried in-process: if the request times out we cannot
 * tell whether Printify created it, and a blind retry could create a duplicate
 * (and a duplicate supplier charge). The caller records the outcome and decides.
 */
export const createOrder = (payload: {
  external_id: string
  label: string
  line_items: PrintifyLineItem[]
  shipping_method: number
  send_shipping_notification: boolean
  address_to: PrintifyAddress
}) => request<{ id: string }>('POST', `/shops/${creds().shopId}/orders.json`, payload, 0)

export const sendToProduction = (orderId: string) =>
  request<PrintifyOrder>('POST', `/shops/${creds().shopId}/orders/${encodeURIComponent(orderId)}/send_to_production.json`, {}, 1)

export const createWebhook = (topic: string, url: string, secret: string) =>
  request<{ id: string }>('POST', `/shops/${creds().shopId}/webhooks.json`, { topic, url, secret })
