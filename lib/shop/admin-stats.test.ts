import { describe, expect, it } from 'vitest'
import { summarise } from './admin-stats'
import { parseSettings } from './settings'
import type { ShopOrderRow } from './types'

const settings = parseSettings([{ key: 'printify_cost_currency', value: 'GBP' }])
const o = (over: Partial<ShopOrderRow>): ShopOrderRow => ({
  id: 'x', created_at: '', updated_at: '', order_number: 'LTC-1', payment_status: 'paid', currency: 'gbp', subtotal_pence: 2000, shipping_pence: 780,
  total_pence: 2780, refunded_pence: 0, stripe_checkout_session_id: null, stripe_payment_intent_id: null, stripe_fee_pence: null, paid_at: null,
  customer_email: null, customer_name: null, customer_phone: null, shipping_address: null, fulfilment_status: 'created', printify_order_id: 'p', printify_status: null,
  printify_sent_to_production_at: null, printify_cost_minor: null, printify_shipping_minor: null, printify_tax_minor: null, est_printify_shipping_minor: null,
  fulfilment_attempts: 1, next_retry_at: null, last_error: null, submitting_since: null, send_attempts: 0, next_send_retry_at: null, printify_synced_at: null,
  confirmation_email_sent_at: null, admin_alerted_at: null, notes: null, ...over,
})

describe('summarise: failed / pending counters', () => {
  it('counts a paid order stuck in created with an error as needing attention, not as pending', () => {
    const s = summarise([o({ fulfilment_status: 'created', last_error: 'send_to_production failed (400) code 8502' })], [], settings)
    expect(s.failed).toBe(1)
    expect(s.pending).toBe(0)
  })
  it('counts Printify-cancelled paid orders as failed', () => {
    expect(summarise([o({ fulfilment_status: 'printify_canceled' })], [], settings).failed).toBe(1)
  })
  it('keeps healthy orders in their own buckets and ignores unpaid ones', () => {
    const s = summarise([
      o({ id: 'a', fulfilment_status: 'created' }), o({ id: 'b', fulfilment_status: 'in_production' }), o({ id: 'c', fulfilment_status: 'shipped' }),
      o({ id: 'd', payment_status: 'pending', fulfilment_status: 'awaiting_payment' }),
    ], [], settings)
    expect(s).toMatchObject({ totalOrders: 3, pending: 2, fulfilled: 1, failed: 0 })
  })
})
