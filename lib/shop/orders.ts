import type Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { notifyAdmin } from '@/lib/email/adminNotify'
import { BASE } from '@/lib/seo/config'
import {
  CURRENCY, MAX_FULFILMENT_ATTEMPTS, RETRY_BACKOFF_MINUTES, SUBMITTING_STALE_MINUTES, sendToProductionEnabled,
} from './config'
import { buildDispatchEmail, buildOrderConfirmationEmail, sendShopEmail } from './email'
import * as printify from './printify'
import { PrintifyError } from './printify'
import { getStripe } from './stripe'
import type { Quote } from './quote'
import type {
  FulfilmentStatus, ShippingAddress, ShopOrderItemRow, ShopOrderRow, ShopShipmentRow,
} from './types'

// All order state transitions live here. Rules that keep money safe:
//   • An order only reaches Printify after Stripe says it is paid AND the paid
//     amount equals what we quoted.
//   • Every transition is a conditional UPDATE (compare-and-swap), so replays and
//     concurrent workers cannot double-run a step.
//   • Anything ambiguous goes to `needs_review` for a human, never a blind retry.

type Level = 'info' | 'warn' | 'error'

export async function logEvent(orderId: string | null, level: Level, type: string, message: string, data?: Record<string, unknown>) {
  const admin = createAdminClient()
  const { error } = await admin.from('shop_events').insert({ order_id: orderId, level, type, message, data: data ?? null })
  if (error) console.error('shop_events insert failed:', error.message)
  if (level !== 'info') console[level === 'error' ? 'error' : 'warn'](`[shop] ${type}: ${message}`)
}

async function alertAdmin(order: Pick<ShopOrderRow, 'id' | 'order_number'> | null, subject: string, text: string) {
  try {
    const link = order ? `\n\nOrder: ${BASE}/admin/shop/orders/${order.id}` : ''
    await notifyAdmin(`[Shop] ${subject}`, `${text}${link}`)
  } catch (err) {
    console.error('Shop admin alert failed:', err)
  }
}

// ─── Creating the pending order ──────────────────────────────────────────────
export async function createPendingOrder(quote: Quote): Promise<{ order: ShopOrderRow; items: ShopOrderItemRow[] }> {
  if (quote.shippingPence == null || quote.totalPence == null) throw new Error('Cannot create an order without a priced delivery charge')
  const admin = createAdminClient()
  const { data: order, error } = await admin
    .from('shop_orders')
    .insert({
      currency: CURRENCY,
      subtotal_pence: quote.subtotalPence,
      shipping_pence: quote.shippingPence,
      total_pence: quote.totalPence,
      est_printify_shipping_minor: quote.shippingMinor,
    })
    .select('*')
    .single()
  if (error || !order) throw new Error(`Could not create order: ${error?.message}`)

  const { data: items, error: itemsError } = await admin
    .from('shop_order_items')
    .insert(quote.lines.map(l => ({
      order_id: order.id,
      variant_id: l.variantId,
      product_title: l.productTitle,
      colour: l.colour,
      size: l.size,
      quantity: l.quantity,
      unit_price_pence: l.unitPricePence,
      printify_product_id: l.printifyProductId,
      printify_variant_id: l.printifyVariantId,
      est_cost_minor: l.estCostMinor,
    })))
    .select('*')
  if (itemsError || !items) {
    await admin.from('shop_orders').delete().eq('id', order.id)
    throw new Error(`Could not create order items: ${itemsError?.message}`)
  }
  await logEvent(order.id, 'info', 'order.created', 'Pending order created, awaiting Stripe Checkout', { total_pence: quote.totalPence })
  return { order: order as ShopOrderRow, items: items as ShopOrderItemRow[] }
}

export async function attachCheckoutSession(orderId: string, sessionId: string) {
  const admin = createAdminClient()
  await admin.from('shop_orders').update({ stripe_checkout_session_id: sessionId }).eq('id', orderId)
}

export async function getOrderWithItems(orderId: string) {
  const admin = createAdminClient()
  const [{ data: order }, { data: items }, { data: shipments }] = await Promise.all([
    admin.from('shop_orders').select('*').eq('id', orderId).maybeSingle(),
    admin.from('shop_order_items').select('*').eq('order_id', orderId),
    admin.from('shop_shipments').select('*').eq('order_id', orderId).order('created_at'),
  ])
  return { order: order as ShopOrderRow | null, items: (items ?? []) as ShopOrderItemRow[], shipments: (shipments ?? []) as ShopShipmentRow[] }
}

// ─── Stripe: payment completed ───────────────────────────────────────────────
function addressFromSession(session: Stripe.Checkout.Session): ShippingAddress | null {
  // Newer Stripe API versions put the address in collected_information; older
  // ones (a webhook destination pinned to an older version) use shipping_details.
  const legacy = (session as unknown as { shipping_details?: Stripe.Checkout.Session.CollectedInformation.ShippingDetails | null }).shipping_details
  const d = session.collected_information?.shipping_details ?? legacy
  if (!d?.address) return null
  return {
    name: d.name ?? null,
    line1: d.address.line1 ?? null,
    line2: d.address.line2 ?? null,
    city: d.address.city ?? null,
    state: d.address.state ?? null,
    postal_code: d.address.postal_code ?? null,
    country: d.address.country ?? null,
  }
}

async function fetchStripeFee(paymentIntentId: string): Promise<number | null> {
  try {
    const pi = await getStripe().paymentIntents.retrieve(paymentIntentId, { expand: ['latest_charge.balance_transaction'] })
    const charge = pi.latest_charge as Stripe.Charge | null
    const bt = charge && typeof charge !== 'string' ? (charge.balance_transaction as Stripe.BalanceTransaction | null) : null
    // Only trust the fee when it is already in GBP; otherwise leave unknown
    // (the estimate is used and the profit stays "estimated").
    return bt && typeof bt !== 'string' && bt.currency === CURRENCY ? bt.fee : null
  } catch (err) {
    console.error('Stripe fee lookup failed:', err)
    return null
  }
}

/**
 * Handles checkout.session.completed / async_payment_succeeded. Safe to call any
 * number of times for the same session: the paid transition is a conditional
 * update, the email is claimed atomically, and fulfilment has its own claim.
 */
export async function handleCheckoutPaid(session: Stripe.Checkout.Session): Promise<void> {
  const admin = createAdminClient()

  const { data: found } = await admin.from('shop_orders').select('*').eq('stripe_checkout_session_id', session.id).maybeSingle()
  let order = found as ShopOrderRow | null
  if (!order && session.metadata?.order_id) {
    const { data } = await admin.from('shop_orders').select('*').eq('id', session.metadata.order_id).maybeSingle()
    order = data as ShopOrderRow | null
  }
  if (!order) {
    await logEvent(null, 'error', 'stripe.unknown_session', `Paid Stripe session ${session.id} has no matching order`, { session: session.id })
    await alertAdmin(null, 'Payment received for an unknown order', `Stripe session ${session.id} was paid (${session.amount_total} ${session.currency}) but no matching shop order exists. Check Stripe and refund or reconcile manually.`)
    return
  }

  if (session.payment_status !== 'paid') {
    // Delayed payment method still pending. async_payment_succeeded will call us again.
    await logEvent(order.id, 'info', 'stripe.not_yet_paid', `Session completed with payment_status=${session.payment_status}`)
    return
  }

  // Never fulfil an order whose paid amount differs from what we quoted.
  if (session.amount_total !== order.total_pence || session.currency !== order.currency) {
    await admin.from('shop_orders').update({ fulfilment_status: 'needs_review', last_error: `Paid amount ${session.amount_total} ${session.currency} does not match order total ${order.total_pence}` }).eq('id', order.id)
    await logEvent(order.id, 'error', 'stripe.amount_mismatch', 'Paid amount does not match the order total; not sending to Printify', { paid: session.amount_total, expected: order.total_pence })
    await alertAdmin(order, `Amount mismatch on ${order.order_number}`, `Stripe reports ${session.amount_total} ${session.currency} paid; order total is ${order.total_pence}. The order has NOT been sent to Printify.`)
    return
  }

  const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id ?? null
  const address = addressFromSession(session)
  const email = session.customer_details?.email ?? null
  if (!address?.line1 || !email) {
    await admin.from('shop_orders').update({ payment_status: 'paid', paid_at: new Date().toISOString(), stripe_payment_intent_id: paymentIntentId, fulfilment_status: 'needs_review', last_error: 'Stripe did not return a delivery address and/or email' }).eq('id', order.id).eq('payment_status', 'pending')
    await logEvent(order.id, 'error', 'stripe.missing_customer_details', 'Paid session had no delivery address or email')
    await alertAdmin(order, `Paid order ${order.order_number} has no delivery details`, 'Stripe did not return a delivery address and/or email for a paid session. Contact the customer via Stripe.')
    return
  }

  const fee = paymentIntentId ? await fetchStripeFee(paymentIntentId) : null

  // The idempotent step: only the first caller flips pending → paid.
  const { data: flipped } = await admin
    .from('shop_orders')
    .update({
      payment_status: 'paid',
      paid_at: new Date().toISOString(),
      stripe_payment_intent_id: paymentIntentId,
      stripe_fee_pence: fee,
      customer_email: email.toLowerCase(),
      customer_name: session.customer_details?.name ?? address.name ?? null,
      customer_phone: session.customer_details?.phone ?? null,
      shipping_address: address,
      fulfilment_status: 'queued',
    })
    .eq('id', order.id)
    .eq('payment_status', 'pending')
    .select('id')
  if (flipped?.length) await logEvent(order.id, 'info', 'payment.paid', `Payment confirmed (${session.amount_total} ${session.currency})`)
  else await logEvent(order.id, 'info', 'payment.duplicate', 'Paid notification replayed; order already marked paid')

  await sendConfirmationOnce(order.id)
  await fulfilOrder(order.id)
}

async function sendConfirmationOnce(orderId: string) {
  const admin = createAdminClient()
  // Claim first, send second: a replayed webhook finds the claim and does nothing.
  const { data: claimed } = await admin
    .from('shop_orders')
    .update({ confirmation_email_sent_at: new Date().toISOString() })
    .eq('id', orderId)
    .eq('payment_status', 'paid')
    .is('confirmation_email_sent_at', null)
    .select('id')
  if (!claimed?.length) return

  const { order, items } = await getOrderWithItems(orderId)
  if (!order?.customer_email) return
  try {
    await sendShopEmail({ to: order.customer_email, ...buildOrderConfirmationEmail(order, items) })
    await logEvent(orderId, 'info', 'email.confirmation', 'Order confirmation sent')
  } catch (err) {
    // Release the claim so the next replay/admin action can retry the email.
    await admin.from('shop_orders').update({ confirmation_email_sent_at: null }).eq('id', orderId)
    await logEvent(orderId, 'error', 'email.confirmation_failed', err instanceof Error ? err.message : String(err))
    await alertAdmin(order, `Confirmation email failed for ${order.order_number}`, `Could not email ${order.customer_email}: ${err instanceof Error ? err.message : err}`)
  }
}

export const resendConfirmation = sendConfirmationOnce

// ─── Fulfilment ──────────────────────────────────────────────────────────────
function splitName(full: string | null | undefined): { first: string; last: string } {
  const parts = (full ?? '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return { first: 'Customer', last: '-' }
  if (parts.length === 1) return { first: parts[0], last: '-' }
  return { first: parts.slice(0, -1).join(' '), last: parts[parts.length - 1] }
}

export function buildPrintifyPayload(order: ShopOrderRow, items: ShopOrderItemRow[]) {
  const a = order.shipping_address
  if (!a?.line1 || !a.city || !a.postal_code || !a.country || !order.customer_email) {
    throw new Error('Order is missing delivery details')
  }
  const { first, last } = splitName(a.name ?? order.customer_name)
  return {
    // external_id lets us find the order in Printify's dashboard by our number.
    external_id: order.order_number,
    label: order.order_number,
    line_items: items.map(i => ({ product_id: i.printify_product_id, variant_id: i.printify_variant_id, quantity: i.quantity })),
    shipping_method: 1, // standard
    // We send our own dispatch email; stop Printify sending a second one.
    send_shipping_notification: false,
    address_to: {
      first_name: first,
      last_name: last,
      email: order.customer_email,
      ...(order.customer_phone ? { phone: order.customer_phone } : {}),
      country: a.country,
      region: a.state ?? '',
      address1: a.line1,
      ...(a.line2 ? { address2: a.line2 } : {}),
      city: a.city,
      zip: a.postal_code,
    },
  }
}

export type FulfilResult = 'created' | 'in_production' | 'skipped' | 'failed' | 'needs_review'

function nextRetryAt(attempts: number): string {
  const mins = RETRY_BACKOFF_MINUTES[Math.min(attempts - 1, RETRY_BACKOFF_MINUTES.length - 1)]
  return new Date(Date.now() + mins * 60_000).toISOString()
}

/**
 * Creates the Printify order for a PAID order, exactly once.
 *
 * Idempotency, in layers:
 *  1. Only `paid` orders in `queued`/`failed` with no Printify id can be claimed.
 *  2. The claim is a compare-and-swap on fulfilment_attempts, so two workers
 *     racing cannot both win.
 *  3. The Printify id is saved immediately on success and the claim excludes any
 *     order that has one.
 *  4. An ambiguous outcome (timeout after sending) → `needs_review`, not a retry,
 *     because retrying could create a second supplier order and a second charge.
 */
export async function fulfilOrder(orderId: string): Promise<FulfilResult> {
  const admin = createAdminClient()
  const { data: cur } = await admin.from('shop_orders').select('*').eq('id', orderId).maybeSingle()
  const current = cur as ShopOrderRow | null
  if (!current || current.payment_status !== 'paid' || current.printify_order_id) return 'skipped'
  if (!['queued', 'failed'].includes(current.fulfilment_status)) return 'skipped'

  if (!printify.printifyConfigured()) {
    await admin.from('shop_orders').update({ fulfilment_status: 'failed', last_error: 'Printify is not configured', next_retry_at: nextRetryAt(1) }).eq('id', orderId)
    await logEvent(orderId, 'error', 'printify.not_configured', 'PRINTIFY_API_TOKEN / PRINTIFY_SHOP_ID missing')
    await alertAdmin(current, `Paid order ${current.order_number} cannot be sent to Printify`, 'Printify credentials are not configured.')
    return 'failed'
  }

  const attempts = current.fulfilment_attempts + 1
  const { data: claimed } = await admin
    .from('shop_orders')
    .update({ fulfilment_status: 'submitting', submitting_since: new Date().toISOString(), fulfilment_attempts: attempts, next_retry_at: null })
    .eq('id', orderId)
    .eq('payment_status', 'paid')
    .eq('fulfilment_attempts', current.fulfilment_attempts)
    .in('fulfilment_status', ['queued', 'failed'])
    .is('printify_order_id', null)
    .select('*')
  if (!claimed?.length) return 'skipped'
  const order = claimed[0] as ShopOrderRow

  const { items } = await getOrderWithItems(orderId)
  await logEvent(orderId, 'info', 'printify.submitting', `Creating Printify order (attempt ${attempts})`)

  let payload
  try {
    payload = buildPrintifyPayload(order, items)
  } catch (err) {
    return markNeedsReview(order, err instanceof Error ? err.message : String(err))
  }

  let created: { id: string }
  try {
    created = await printify.createOrder(payload)
  } catch (err) {
    const e = err as PrintifyError
    const message = err instanceof Error ? err.message : String(err)
    if (e instanceof PrintifyError && e.ambiguous) {
      // Timeout / network drop / 500 / 504: Printify may or may not have created it.
      return markNeedsReview(order, `Printify's answer was unclear (${message}). It may have created the order — check Printify for ${order.order_number} before retrying.`)
    }
    if (e instanceof PrintifyError && e.retryable && attempts < MAX_FULFILMENT_ATTEMPTS) {
      await admin.from('shop_orders').update({ fulfilment_status: 'failed', submitting_since: null, last_error: message, next_retry_at: nextRetryAt(attempts) }).eq('id', orderId)
      await logEvent(orderId, 'warn', 'printify.retry_scheduled', message, { attempts })
      if (attempts === 1) await alertAdmin(order, `Printify order for ${order.order_number} failed (will retry)`, message)
      return 'failed'
    }
    return markNeedsReview(order, message)
  }

  await admin.from('shop_orders').update({
    printify_order_id: created.id,
    printify_status: 'created',
    fulfilment_status: 'created',
    submitting_since: null,
    last_error: null,
  }).eq('id', orderId)
  await logEvent(orderId, 'info', 'printify.created', `Printify order ${created.id} created`)

  if (!sendToProductionEnabled()) {
    await logEvent(orderId, 'info', 'printify.held', 'Order left unsent in Printify (SHOP_PRINTIFY_SEND_TO_PRODUCTION is off or Stripe is in test mode)')
    return 'created'
  }
  return (await sendOrderToProduction(orderId)) ? 'in_production' : 'created'
}

async function markNeedsReview(order: ShopOrderRow, reason: string): Promise<FulfilResult> {
  const admin = createAdminClient()
  await admin.from('shop_orders').update({ fulfilment_status: 'needs_review', submitting_since: null, last_error: reason, next_retry_at: null }).eq('id', order.id)
  await logEvent(order.id, 'error', 'printify.needs_review', reason)
  await alertAdmin(order, `Order ${order.order_number} needs attention`, `Payment succeeded but the order could not be submitted to Printify.\n\n${reason}\n\nFix the cause (or confirm in Printify that no order exists) and use "Retry fulfilment" in the admin.`)
  return 'needs_review'
}

/** Explicit second step: approve an already-created Printify order for production. */
export async function sendOrderToProduction(orderId: string): Promise<boolean> {
  const admin = createAdminClient()
  const { data } = await admin.from('shop_orders').select('*').eq('id', orderId).maybeSingle()
  const order = data as ShopOrderRow | null
  if (!order?.printify_order_id || order.payment_status !== 'paid' || order.printify_sent_to_production_at) return false
  try {
    await printify.sendToProduction(order.printify_order_id)
    await admin.from('shop_orders').update({ fulfilment_status: 'in_production', printify_sent_to_production_at: new Date().toISOString(), last_error: null }).eq('id', orderId)
    await logEvent(orderId, 'info', 'printify.sent_to_production', 'Sent to production')
    return true
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await admin.from('shop_orders').update({ last_error: message }).eq('id', orderId)
    await logEvent(orderId, 'error', 'printify.send_failed', message)
    await alertAdmin(order, `Could not send ${order.order_number} to production`, `The Printify order ${order.printify_order_id} exists but sending it to production failed:\n${message}`)
    return false
  }
}

/** Admin override: link an order that was created in Printify by hand / after an ambiguous failure. */
export async function linkExistingPrintifyOrder(orderId: string, printifyOrderId: string) {
  const admin = createAdminClient()
  const { error } = await admin.from('shop_orders').update({
    printify_order_id: printifyOrderId, fulfilment_status: 'created', printify_status: 'linked', last_error: null, next_retry_at: null,
  }).eq('id', orderId).is('printify_order_id', null)
  if (error) throw new Error(error.message)
  await logEvent(orderId, 'info', 'printify.linked', `Linked existing Printify order ${printifyOrderId}`)
  await syncFromPrintify(orderId)
}

/** Admin "Retry fulfilment": puts a stuck order back in the queue, then runs it. */
export async function retryFulfilment(orderId: string): Promise<FulfilResult> {
  const admin = createAdminClient()
  const { data: reset } = await admin
    .from('shop_orders')
    .update({ fulfilment_status: 'queued', last_error: null, next_retry_at: null })
    .eq('id', orderId)
    .eq('payment_status', 'paid')
    .is('printify_order_id', null)
    .in('fulfilment_status', ['failed', 'needs_review'])
    .select('id')
  if (!reset?.length) return 'skipped'
  await logEvent(orderId, 'info', 'admin.retry', 'Fulfilment retried from the admin')
  return fulfilOrder(orderId)
}

/** Called on a schedule: retries due failures and flags orders stuck mid-submit. */
export async function processDueRetries(): Promise<{ retried: number; stale: number }> {
  const admin = createAdminClient()
  const now = new Date().toISOString()

  const staleBefore = new Date(Date.now() - SUBMITTING_STALE_MINUTES * 60_000).toISOString()
  const { data: stale } = await admin.from('shop_orders').select('*').eq('fulfilment_status', 'submitting').lt('submitting_since', staleBefore)
  for (const o of (stale ?? []) as ShopOrderRow[]) {
    await markNeedsReview(o, 'A fulfilment attempt stopped part-way through. Check Printify for this order number before retrying so it is not created twice.')
  }

  const { data: due } = await admin
    .from('shop_orders').select('id')
    .eq('fulfilment_status', 'failed').eq('payment_status', 'paid').is('printify_order_id', null)
    .lte('next_retry_at', now).limit(10)
  let retried = 0
  for (const o of due ?? []) {
    const r = await fulfilOrder(o.id)
    if (r !== 'skipped') retried++
  }

  // Orders created in Printify but not yet sent, now that sending is enabled.
  if (sendToProductionEnabled()) {
    const { data: held } = await admin
      .from('shop_orders').select('id')
      .eq('fulfilment_status', 'created').eq('payment_status', 'paid')
      .not('printify_order_id', 'is', null).is('printify_sent_to_production_at', null).limit(10)
    for (const o of held ?? []) if (await sendOrderToProduction(o.id)) retried++
  }
  return { retried, stale: stale?.length ?? 0 }
}

// ─── Printify → us: status, costs, tracking ─────────────────────────────────
const PROBLEM_STATUSES = new Set(['has-issues', 'unfulfillable', 'payment-not-received', 'source-check-failed'])

export function mapPrintifyStatus(status: string): FulfilmentStatus | null {
  switch (status) {
    case 'pending': case 'on-hold': case 'cost-calculation': return 'created'
    case 'sending-to-production': case 'in-production':
    case 'sending_to_production_delegate': case 'sending_to_production_delegate_sync': return 'in_production'
    case 'fulfilled': case 'partially-fulfilled': return 'shipped'
    case 'canceled': return 'cancelled'
    default: return PROBLEM_STATUSES.has(status) ? 'needs_review' : null
  }
}

const RANK: Record<string, number> = { created: 1, in_production: 2, shipped: 3, delivered: 4 }

/**
 * Pulls the authoritative order from Printify and reconciles our record:
 * status, real charges (which make profit "confirmed"), and shipments (which
 * trigger one dispatch email per new tracking number). Webhooks only tell us
 * *which* order to refresh, so a missing or odd webhook payload can't corrupt state.
 */
export async function syncFromPrintify(orderId: string): Promise<void> {
  const admin = createAdminClient()
  const { order } = await getOrderWithItems(orderId)
  if (!order?.printify_order_id) return

  const remote = await printify.getOrder(order.printify_order_id)
  const mapped = mapPrintifyStatus(remote.status)
  const shipments = (remote.shipments ?? []).filter(s => s.number)
  const allDelivered = shipments.length > 0 && shipments.every(s => s.delivered_at)

  let next: FulfilmentStatus = order.fulfilment_status
  if (mapped === 'needs_review' || mapped === 'cancelled') next = mapped
  else if (mapped) {
    const target: FulfilmentStatus = allDelivered && mapped === 'shipped' ? 'delivered' : mapped
    // Never move an order backwards (e.g. a late 'pending' update after dispatch).
    if ((RANK[target] ?? 0) >= (RANK[order.fulfilment_status] ?? 0) || order.fulfilment_status === 'needs_review') next = target
  }

  const update: Record<string, unknown> = {
    printify_status: remote.status,
    fulfilment_status: next,
    ...(typeof remote.total_price === 'number' ? { printify_cost_minor: remote.total_price } : {}),
    ...(typeof remote.total_shipping === 'number' ? { printify_shipping_minor: remote.total_shipping } : {}),
    ...(typeof remote.total_tax === 'number' ? { printify_tax_minor: remote.total_tax } : {}),
    ...(remote.sent_to_production_at && !order.printify_sent_to_production_at ? { printify_sent_to_production_at: remote.sent_to_production_at } : {}),
  }
  await admin.from('shop_orders').update(update).eq('id', orderId)

  if (next !== order.fulfilment_status) await logEvent(orderId, next === 'needs_review' ? 'error' : 'info', 'printify.status', `Printify status ${remote.status} → ${next}`)
  if (next === 'needs_review' && order.fulfilment_status !== 'needs_review') {
    await alertAdmin(order, `Printify flagged ${order.order_number}: ${remote.status}`, `Printify reports status "${remote.status}" for order ${order.printify_order_id}. Open it in Printify to resolve (for example an artwork, address or payment problem).`)
  }
  if (next === 'cancelled' && order.fulfilment_status !== 'cancelled') {
    await alertAdmin(order, `${order.order_number} was cancelled in Printify`, 'Printify reports this order as cancelled. If the customer has paid, a refund likely needs to be issued.')
  }

  for (const s of shipments) {
    await admin.from('shop_shipments').upsert(
      {
        order_id: orderId,
        carrier: s.carrier ?? null,
        tracking_number: s.number as string,
        tracking_url: s.url ?? null,
        shipped_at: s.shipped_at ?? null,
        delivered_at: s.delivered_at ?? null,
      },
      { onConflict: 'order_id,tracking_number' },
    )
  }
  await sendDispatchEmails(orderId)
}

async function sendDispatchEmails(orderId: string) {
  const admin = createAdminClient()
  const { order, shipments } = await getOrderWithItems(orderId)
  if (!order?.customer_email) return
  for (const s of shipments.filter(x => !x.email_sent_at)) {
    const { data: claimed } = await admin.from('shop_shipments').update({ email_sent_at: new Date().toISOString() }).eq('id', s.id).is('email_sent_at', null).select('id')
    if (!claimed?.length) continue
    try {
      await sendShopEmail({ to: order.customer_email, ...buildDispatchEmail(order, s) })
      await logEvent(orderId, 'info', 'email.dispatch', `Dispatch email sent (${s.tracking_number})`)
    } catch (err) {
      await admin.from('shop_shipments').update({ email_sent_at: null }).eq('id', s.id)
      await logEvent(orderId, 'error', 'email.dispatch_failed', err instanceof Error ? err.message : String(err))
      await alertAdmin(order, `Dispatch email failed for ${order.order_number}`, `Could not email ${order.customer_email}: ${err instanceof Error ? err.message : err}`)
    }
  }
}

export async function findOrderByPrintifyId(printifyOrderId: string): Promise<ShopOrderRow | null> {
  const admin = createAdminClient()
  const { data } = await admin.from('shop_orders').select('*').eq('printify_order_id', printifyOrderId).maybeSingle()
  return data as ShopOrderRow | null
}

// ─── Stripe: expiry, refunds, disputes ──────────────────────────────────────
export async function handleCheckoutExpired(session: Stripe.Checkout.Session) {
  const admin = createAdminClient()
  const { data } = await admin.from('shop_orders').update({ payment_status: 'expired', fulfilment_status: 'cancelled' })
    .eq('stripe_checkout_session_id', session.id).eq('payment_status', 'pending').select('id')
  if (data?.length) await logEvent(data[0].id, 'info', 'stripe.expired', 'Checkout session expired unpaid')
}

export async function handleAsyncPaymentFailed(session: Stripe.Checkout.Session) {
  const admin = createAdminClient()
  const { data } = await admin.from('shop_orders').update({ payment_status: 'failed', fulfilment_status: 'cancelled' })
    .eq('stripe_checkout_session_id', session.id).eq('payment_status', 'pending').select('*')
  if (data?.length) await logEvent(data[0].id, 'warn', 'stripe.async_failed', 'Delayed payment failed')
}

/** Mirrors refunds made anywhere (our admin or the Stripe dashboard) onto the order. */
export async function handleChargeRefunded(charge: Stripe.Charge) {
  const pi = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id
  if (!pi) return
  const admin = createAdminClient()
  const { data } = await admin.from('shop_orders').select('*').eq('stripe_payment_intent_id', pi).maybeSingle()
  const order = data as ShopOrderRow | null
  if (!order) return
  const refunded = charge.amount_refunded
  if (refunded === order.refunded_pence) return
  const status = refunded >= order.total_pence ? 'refunded' : refunded > 0 ? 'partially_refunded' : 'paid'
  await admin.from('shop_orders').update({ refunded_pence: refunded, payment_status: status }).eq('id', order.id)
  await logEvent(order.id, 'warn', 'stripe.refunded', `Refunded ${refunded} of ${order.total_pence} pence`)
  if (order.fulfilment_status !== 'delivered' && order.fulfilment_status !== 'shipped') {
    await alertAdmin(order, `Refund on ${order.order_number} — check fulfilment`, `A refund of ${refunded}p was recorded and the order has not shipped yet (fulfilment: ${order.fulfilment_status}). If Printify has not started production, cancel/stop it in Printify; Printify's API can only cancel unpaid orders.`)
  }
}

export async function handleDispute(dispute: Stripe.Dispute) {
  const pi = typeof dispute.payment_intent === 'string' ? dispute.payment_intent : dispute.payment_intent?.id
  const admin = createAdminClient()
  const { data } = pi ? await admin.from('shop_orders').select('*').eq('stripe_payment_intent_id', pi).maybeSingle() : { data: null }
  const order = data as ShopOrderRow | null
  await logEvent(order?.id ?? null, 'error', 'stripe.dispute', `Dispute ${dispute.id} opened (${dispute.reason})`)
  await alertAdmin(order, 'Stripe dispute opened', `Dispute ${dispute.id} (${dispute.reason}) for ${dispute.amount}p${order ? ` on order ${order.order_number}` : ''}. Respond in the Stripe dashboard before the deadline.`)
}

/** Admin-initiated refund. The idempotency key stops a double-click refunding twice. */
export async function refundOrder(orderId: string, amountPence: number | null): Promise<{ refundedPence: number }> {
  const { order } = await getOrderWithItems(orderId)
  if (!order || !order.stripe_payment_intent_id || order.payment_status === 'pending') throw new Error('This order has no payment to refund')
  const remaining = order.total_pence - order.refunded_pence
  const amount = amountPence ?? remaining
  if (!Number.isInteger(amount) || amount < 1 || amount > remaining) throw new Error(`Refund must be between 1p and ${remaining}p`)

  const refund = await getStripe().refunds.create(
    { payment_intent: order.stripe_payment_intent_id, amount, metadata: { order_id: order.id, order_number: order.order_number } },
    { idempotencyKey: `shop-refund-${order.id}-${order.refunded_pence}-${amount}` },
  )
  const refundedTotal = order.refunded_pence + amount
  const admin = createAdminClient()
  await admin.from('shop_orders').update({
    refunded_pence: refundedTotal,
    payment_status: refundedTotal >= order.total_pence ? 'refunded' : 'partially_refunded',
  }).eq('id', orderId)
  await logEvent(orderId, 'warn', 'admin.refund', `Refunded ${amount}p (Stripe refund ${refund.id})`)
  return { refundedPence: refundedTotal }
}
