import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createFakeDb } from './test-utils/fake-supabase'

// ── mocks ────────────────────────────────────────────────────────────────────
const db = vi.hoisted(() => ({ current: null as any }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => db.current.client }))

const printify = vi.hoisted(() => ({
  printifyConfigured: vi.fn(() => true),
  createOrder: vi.fn(),
  sendToProduction: vi.fn(),
  getOrder: vi.fn(),
  PrintifyError: class PrintifyError extends Error {
    constructor(m: string, readonly status: number, readonly body: string, readonly retryable: boolean, readonly ambiguous = false) { super(m) }
  },
}))
vi.mock('./printify', () => printify)

const mail = vi.hoisted(() => ({ sendShopEmail: vi.fn(async () => {}) }))
vi.mock('./email', async () => ({ ...(await vi.importActual<any>('./email')), sendShopEmail: mail.sendShopEmail }))

const notify = vi.hoisted(() => ({ notifyAdmin: vi.fn(async () => {}) }))
vi.mock('@/lib/email/adminNotify', () => notify)

vi.mock('./stripe', () => ({
  getStripe: () => ({
    paymentIntents: { retrieve: async () => ({ latest_charge: { balance_transaction: { fee: 66, currency: 'gbp' } } }) },
    refunds: { create: async () => ({ id: 're_1' }) },
  }),
}))

import {
  fulfilOrder, handleCheckoutPaid, handleChargeRefunded, processDueRetries, refundOrder, retryFulfilment, syncFromPrintify,
} from './orders'
import { claimWebhookEvent } from './webhook-events'

// ── fixtures ─────────────────────────────────────────────────────────────────
function seedOrder(over: Record<string, any> = {}) {
  const id = 'order_1'
  db.current.tables.shop_orders = [{
    id, order_number: 'LTC-10001', payment_status: 'pending', fulfilment_status: 'awaiting_payment', fulfilment_attempts: 0,
    refunded_pence: 0, currency: 'gbp', subtotal_pence: 2500, shipping_pence: 400, total_pence: 2900,
    stripe_checkout_session_id: 'cs_test_1', printify_order_id: null, confirmation_email_sent_at: null,
    printify_sent_to_production_at: null, ...over,
  }]
  db.current.tables.shop_order_items = [{
    id: 'item_1', order_id: id, product_title: 'Tee', colour: 'Black', size: 'M', quantity: 1, unit_price_pence: 2500,
    printify_product_id: 'pf_1', printify_variant_id: 111, est_cost_minor: 1000,
  }]
  return id
}

const session = (over: Record<string, any> = {}): any => ({
  id: 'cs_test_1', payment_status: 'paid', amount_total: 2900, currency: 'gbp', payment_intent: 'pi_1',
  metadata: { order_id: 'order_1' },
  customer_details: { email: 'Fan@Example.com', name: 'Ada Lovelace', phone: '+447000000000' },
  collected_information: { shipping_details: { name: 'Ada Lovelace', address: { line1: '1 Baker St', line2: null, city: 'London', state: null, postal_code: 'NW1 6XE', country: 'GB' } } },
  ...over,
})

const order = () => db.current.tables.shop_orders[0]

beforeEach(() => {
  db.current = createFakeDb()
  vi.clearAllMocks()
  printify.printifyConfigured.mockReturnValue(true)
  printify.createOrder.mockResolvedValue({ id: 'pf_order_1' })
  delete process.env.SHOP_PRINTIFY_SEND_TO_PRODUCTION
  process.env.STRIPE_SECRET_KEY = 'sk_test_x'
})

describe('payment → Printify', () => {
  it('creates exactly one Printify order and one confirmation email for a paid session', async () => {
    seedOrder()
    await handleCheckoutPaid(session())
    expect(order()).toMatchObject({ payment_status: 'paid', fulfilment_status: 'created', printify_order_id: 'pf_order_1', customer_email: 'fan@example.com', stripe_fee_pence: 66 })
    expect(printify.createOrder).toHaveBeenCalledTimes(1)
    expect(mail.sendShopEmail).toHaveBeenCalledTimes(1)
    const payload = printify.createOrder.mock.calls[0][0]
    expect(payload).toMatchObject({ external_id: 'LTC-10001', shipping_method: 1, send_shipping_notification: false })
    expect(payload.line_items).toEqual([{ product_id: 'pf_1', variant_id: 111, quantity: 1 }])
    expect(payload.address_to).toMatchObject({ first_name: 'Ada', last_name: 'Lovelace', country: 'GB', zip: 'NW1 6XE', email: 'fan@example.com' })
  })

  it('a replayed paid event creates no second Printify order and no second email', async () => {
    seedOrder()
    await handleCheckoutPaid(session())
    await handleCheckoutPaid(session())
    await handleCheckoutPaid(session())
    expect(printify.createOrder).toHaveBeenCalledTimes(1)
    expect(mail.sendShopEmail).toHaveBeenCalledTimes(1)
  })

  it('concurrent deliveries still create only one Printify order', async () => {
    seedOrder()
    await Promise.all([handleCheckoutPaid(session()), handleCheckoutPaid(session()), handleCheckoutPaid(session())])
    expect(printify.createOrder).toHaveBeenCalledTimes(1)
    expect(mail.sendShopEmail).toHaveBeenCalledTimes(1)
  })

  it('never sends an unpaid session to Printify', async () => {
    seedOrder()
    await handleCheckoutPaid(session({ payment_status: 'unpaid' }))
    expect(printify.createOrder).not.toHaveBeenCalled()
    expect(order().payment_status).toBe('pending')
    await fulfilOrder('order_1') // even a direct call is refused for an unpaid order
    expect(printify.createOrder).not.toHaveBeenCalled()
  })

  it('refuses to fulfil when the paid amount differs from the quoted total', async () => {
    seedOrder()
    await handleCheckoutPaid(session({ amount_total: 100 }))
    expect(printify.createOrder).not.toHaveBeenCalled()
    expect(order().fulfilment_status).toBe('needs_review')
    expect(notify.notifyAdmin).toHaveBeenCalled()
  })

  it('alerts the admin for a paid session that matches no order', async () => {
    await handleCheckoutPaid(session({ id: 'cs_unknown', metadata: {} }))
    expect(notify.notifyAdmin).toHaveBeenCalled()
    expect(printify.createOrder).not.toHaveBeenCalled()
  })

  it('does not send to production while Stripe is in test mode, even if the flag is on', async () => {
    process.env.SHOP_PRINTIFY_SEND_TO_PRODUCTION = 'true'
    seedOrder()
    await handleCheckoutPaid(session())
    expect(printify.sendToProduction).not.toHaveBeenCalled()
    expect(order().fulfilment_status).toBe('created')
  })

  it('sends to production only with a live key AND the flag', async () => {
    process.env.SHOP_PRINTIFY_SEND_TO_PRODUCTION = 'true'
    process.env.STRIPE_SECRET_KEY = 'sk_live_x'
    printify.sendToProduction.mockResolvedValue({})
    seedOrder()
    await handleCheckoutPaid(session())
    expect(printify.sendToProduction).toHaveBeenCalledWith('pf_order_1')
    expect(order().fulfilment_status).toBe('in_production')
  })
})

describe('failed fulfilment', () => {
  it('schedules a retry for a transient Printify error and tells the admin once', async () => {
    printify.createOrder.mockRejectedValueOnce(new printify.PrintifyError('503', 503, '', true, false))
    seedOrder()
    await handleCheckoutPaid(session())
    expect(order()).toMatchObject({ fulfilment_status: 'failed', fulfilment_attempts: 1, printify_order_id: null })
    expect(order().next_retry_at).toBeTruthy()
    expect(notify.notifyAdmin).toHaveBeenCalledTimes(1)
    expect(mail.sendShopEmail).toHaveBeenCalledTimes(1) // customer still got their confirmation
  })

  it('the retry job picks it up once due and succeeds without duplicating', async () => {
    printify.createOrder.mockRejectedValueOnce(new printify.PrintifyError('503', 503, '', true, false))
    seedOrder()
    await handleCheckoutPaid(session())
    order().next_retry_at = new Date(Date.now() - 1000).toISOString()
    const r = await processDueRetries()
    expect(r.retried).toBe(1)
    expect(order()).toMatchObject({ fulfilment_status: 'created', printify_order_id: 'pf_order_1', fulfilment_attempts: 2 })
    await processDueRetries()
    expect(printify.createOrder).toHaveBeenCalledTimes(2) // 1 failure + 1 success, no third
  })

  it('does not retry before the backoff time', async () => {
    printify.createOrder.mockRejectedValueOnce(new printify.PrintifyError('503', 503, '', true, false))
    seedOrder()
    await handleCheckoutPaid(session())
    expect((await processDueRetries()).retried).toBe(0)
  })

  it('a rejected order (4xx) goes straight to needs_review and alerts', async () => {
    printify.createOrder.mockRejectedValueOnce(new printify.PrintifyError('422 bad address', 422, '', false, false))
    seedOrder()
    await handleCheckoutPaid(session())
    expect(order().fulfilment_status).toBe('needs_review')
    expect(notify.notifyAdmin).toHaveBeenCalled()
  })

  it('an ambiguous failure (timeout) is NOT auto-retried: it could have created the order', async () => {
    printify.createOrder.mockRejectedValueOnce(new printify.PrintifyError('timeout', 0, 'timeout', false, true))
    seedOrder()
    await handleCheckoutPaid(session())
    expect(order().fulfilment_status).toBe('needs_review')
    order().next_retry_at = new Date(Date.now() - 1000).toISOString()
    await processDueRetries()
    expect(printify.createOrder).toHaveBeenCalledTimes(1)
  })

  it('admin retry works from needs_review and creates the order once', async () => {
    printify.createOrder.mockRejectedValueOnce(new printify.PrintifyError('422', 422, '', false, false))
    seedOrder()
    await handleCheckoutPaid(session())
    expect(await retryFulfilment('order_1')).toBe('created')
    expect(await retryFulfilment('order_1')).toBe('skipped') // already has a Printify order
    expect(printify.createOrder).toHaveBeenCalledTimes(2)
  })

  it('flags a submission that died mid-flight instead of retrying blind', async () => {
    seedOrder({ payment_status: 'paid', fulfilment_status: 'submitting', submitting_since: new Date(Date.now() - 60 * 60_000).toISOString() })
    await processDueRetries()
    expect(order().fulfilment_status).toBe('needs_review')
    expect(printify.createOrder).not.toHaveBeenCalled()
  })

  it('gives up after the maximum attempts and asks for a human', async () => {
    printify.createOrder.mockRejectedValue(new printify.PrintifyError('503', 503, '', true, false))
    seedOrder({ payment_status: 'paid', fulfilment_status: 'queued', fulfilment_attempts: 4 })
    expect(await fulfilOrder('order_1')).toBe('needs_review')
  })
})

describe('Printify updates', () => {
  it('records tracking, sends one dispatch email per parcel, and ignores replays', async () => {
    seedOrder({ payment_status: 'paid', fulfilment_status: 'in_production', printify_order_id: 'pf_order_1', customer_email: 'fan@example.com', customer_name: 'Ada' })
    printify.getOrder.mockResolvedValue({
      id: 'pf_order_1', status: 'fulfilled', total_price: 1100, total_shipping: 450, total_tax: 0,
      shipments: [{ carrier: 'royal-mail', number: 'RM123', url: 'https://track/RM123', delivered_at: null }],
    })
    await syncFromPrintify('order_1')
    await syncFromPrintify('order_1')
    expect(db.current.tables.shop_shipments).toHaveLength(1)
    expect(mail.sendShopEmail).toHaveBeenCalledTimes(1)
    expect(order()).toMatchObject({ fulfilment_status: 'shipped', printify_cost_minor: 1100, printify_shipping_minor: 450 })
  })

  it('sends a second dispatch email for a second parcel', async () => {
    seedOrder({ payment_status: 'paid', fulfilment_status: 'in_production', printify_order_id: 'pf_order_1', customer_email: 'fan@example.com' })
    printify.getOrder.mockResolvedValueOnce({ id: 'x', status: 'partially-fulfilled', shipments: [{ number: 'A1', url: 'u1' }] })
    await syncFromPrintify('order_1')
    printify.getOrder.mockResolvedValueOnce({ id: 'x', status: 'fulfilled', shipments: [{ number: 'A1', url: 'u1' }, { number: 'B2', url: 'u2' }] })
    await syncFromPrintify('order_1')
    expect(mail.sendShopEmail).toHaveBeenCalledTimes(2)
  })

  it('never moves an order backwards and alerts on problem statuses', async () => {
    seedOrder({ payment_status: 'paid', fulfilment_status: 'shipped', printify_order_id: 'pf_order_1', customer_email: 'a@b.co' })
    printify.getOrder.mockResolvedValueOnce({ id: 'x', status: 'pending', shipments: [] })
    await syncFromPrintify('order_1')
    expect(order().fulfilment_status).toBe('shipped')
    printify.getOrder.mockResolvedValueOnce({ id: 'x', status: 'has-issues', shipments: [] })
    await syncFromPrintify('order_1')
    expect(order().fulfilment_status).toBe('needs_review')
    expect(notify.notifyAdmin).toHaveBeenCalled()
  })

  it('marks delivered when every parcel is delivered', async () => {
    seedOrder({ payment_status: 'paid', fulfilment_status: 'shipped', printify_order_id: 'pf_order_1', customer_email: 'a@b.co' })
    printify.getOrder.mockResolvedValue({ id: 'x', status: 'fulfilled', shipments: [{ number: 'A1', delivered_at: '2026-10-25T10:00:00Z' }] })
    await syncFromPrintify('order_1')
    expect(order().fulfilment_status).toBe('delivered')
  })
})

describe('refunds', () => {
  it('records a partial then full refund and blocks over-refunding', async () => {
    seedOrder({ payment_status: 'paid', stripe_payment_intent_id: 'pi_1', fulfilment_status: 'delivered' })
    await refundOrder('order_1', 1000)
    expect(order()).toMatchObject({ payment_status: 'partially_refunded', refunded_pence: 1000 })
    await expect(refundOrder('order_1', 5000)).rejects.toThrow(/between/)
    await refundOrder('order_1', null)
    expect(order()).toMatchObject({ payment_status: 'refunded', refunded_pence: 2900 })
  })

  it('mirrors a refund made in the Stripe dashboard and alerts if unshipped', async () => {
    seedOrder({ payment_status: 'paid', stripe_payment_intent_id: 'pi_1', fulfilment_status: 'in_production' })
    await handleChargeRefunded({ payment_intent: 'pi_1', amount_refunded: 2900 } as any)
    expect(order()).toMatchObject({ payment_status: 'refunded', refunded_pence: 2900 })
    expect(notify.notifyAdmin).toHaveBeenCalled()
  })
})

describe('webhook de-duplication', () => {
  it('classifies new, retry and duplicate deliveries', async () => {
    expect(await claimWebhookEvent('stripe', 'evt_1', 'x')).toBe('new')
    expect(await claimWebhookEvent('stripe', 'evt_1', 'x')).toBe('retry') // seen, never finished
    db.current.tables.shop_webhook_events[0].processed_at = new Date().toISOString()
    expect(await claimWebhookEvent('stripe', 'evt_1', 'x')).toBe('duplicate')
    expect(await claimWebhookEvent('printify', 'evt_1', 'x')).toBe('new') // separate namespace
  })
})
