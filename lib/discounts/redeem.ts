import type { SupabaseClient } from '@supabase/supabase-js'
import type { CodeFailure, CodeRow } from './types'
import { evaluateCode, loadCodeWithCampaign } from './validate'

// A customer pays on Stripe's page some time after we price the basket, so a single-use
// code is RESERVED when checkout starts and given back if that checkout never completes.
// Without this, two people could both hold the same single-use code and both get it.
//
// The counter uses compare-and-swap (UPDATE ... WHERE use_count = <value we read>), the
// same technique the shop uses for order state, so concurrent checkouts cannot both win.
// Codes with no usage cap (public campaigns) skip the counter entirely, so a busy Black
// Friday code never contends on one row; their usage is counted from orders instead.

const MAX_CAS_ATTEMPTS = 6
/** An unpaid order that still has no Stripe session after this long never will (its request died). */
const ORPHAN_AFTER_MS = 10 * 60 * 1000

type ReserveResult = { ok: true } | { ok: false; reason: CodeFailure }

async function adjustUseCount(admin: SupabaseClient, codeId: string, delta: 1 | -1, cap: number | null): Promise<boolean> {
  for (let attempt = 0; attempt < MAX_CAS_ATTEMPTS; attempt++) {
    const { data: row } = await admin.from('discount_codes').select('use_count, max_uses').eq('id', codeId).maybeSingle()
    if (!row) return false
    const current = (row as Pick<CodeRow, 'use_count'>).use_count
    if (delta === 1 && cap != null && current >= cap) return false
    if (delta === -1 && current <= 0) return true // nothing to give back
    const { data: won } = await admin
      .from('discount_codes')
      .update({ use_count: current + delta })
      .eq('id', codeId)
      .eq('use_count', current)
      .select('id')
    if (won?.length) return true
  }
  return false
}

/** Re-checks every rule against fresh data, then takes one use of the code. */
export async function reserveCode(admin: SupabaseClient, codeValue: string, now = new Date()): Promise<ReserveResult & { code?: CodeRow }> {
  const found = await loadCodeWithCampaign(admin, codeValue)
  const verdict = evaluateCode(found?.code ?? null, found?.campaign ?? null, now)
  if (!verdict.ok || !found) return { ok: false, reason: verdict.ok ? 'not_found' : verdict.reason }

  if (found.code.max_uses == null) return { ok: true, code: found.code }
  const taken = await adjustUseCount(admin, found.code.id, 1, found.code.max_uses)
  return taken ? { ok: true, code: found.code } : { ok: false, reason: 'used' }
}

/**
 * Gives an unpaid order's reservation back exactly once (guarded by discount_released_at).
 * Safe to call from any number of places: the expiry webhook, a failed payment, or a
 * checkout that errored half way. Does nothing for orders that are paid or had no code.
 */
export async function releaseDiscountForOrder(admin: SupabaseClient, orderId: string): Promise<boolean> {
  const { data: order } = await admin.from('shop_orders').select('id, discount_code_id, payment_status, discount_released_at').eq('id', orderId).maybeSingle()
  const o = order as { discount_code_id: string | null; payment_status: string; discount_released_at: string | null } | null
  if (!o?.discount_code_id || o.discount_released_at || o.payment_status === 'paid') return false

  // Claim the release first so a replay can't give the use back twice.
  const { data: claimed } = await admin
    .from('shop_orders')
    .update({ discount_released_at: new Date().toISOString() })
    .eq('id', orderId)
    .is('discount_released_at', null)
    .neq('payment_status', 'paid')
    .select('id')
  if (!claimed?.length) return false

  const { data: code } = await admin.from('discount_codes').select('max_uses').eq('id', o.discount_code_id).maybeSingle()
  if ((code as { max_uses: number | null } | null)?.max_uses != null) await adjustUseCount(admin, o.discount_code_id, -1, null)
  return true
}

export interface ReserveForOrderInput { orderId: string; code: string }
export interface ReserveDeps {
  /** Expires a Stripe Checkout Session. Throws if the session can no longer be expired (already paid). */
  expireSession: (sessionId: string) => Promise<void>
  now?: Date
}

/**
 * Reserves `code` for a freshly created pending order.
 *
 * Common case worth handling: a customer starts checkout with a single-use code, backs out
 * of Stripe's page, and tries again within the hour. The first (unpaid) checkout still holds
 * the code, so we expire that Stripe session (making it impossible to pay) and take the
 * code over. If the old session can't be expired, because it was just paid, we refuse.
 */
export async function reserveDiscountForOrder(admin: SupabaseClient, input: ReserveForOrderInput, deps: ReserveDeps): Promise<ReserveResult> {
  let result = await reserveCode(admin, input.code, deps.now)
  if (result.ok || result.reason !== 'used') return result

  const found = await loadCodeWithCampaign(admin, input.code)
  if (!found || found.code.max_uses !== 1) return result

  const { data: holders } = await admin
    .from('shop_orders')
    .select('id, stripe_checkout_session_id, created_at')
    .eq('discount_code_id', found.code.id)
    .eq('payment_status', 'pending')
    .is('discount_released_at', null)
    .neq('id', input.orderId)

  let freed = false
  const now = (deps.now ?? new Date()).getTime()
  for (const holder of (holders ?? []) as { id: string; stripe_checkout_session_id: string | null; created_at: string }[]) {
    if (holder.stripe_checkout_session_id) {
      try {
        await deps.expireSession(holder.stripe_checkout_session_id)
      } catch {
        continue // that checkout may be completing right now: leave it alone
      }
    } else if (now - new Date(holder.created_at).getTime() < ORPHAN_AFTER_MS) {
      // No Stripe session yet: that request is probably still being set up (and will create one),
      // so it can't be expired. Only an order stuck this way for minutes is dead and can be reclaimed.
      continue
    }
    // Close the superseded order the same way the "session expired" webhook would.
    await admin.from('shop_orders').update({ payment_status: 'expired', fulfilment_status: 'cancelled' }).eq('id', holder.id).eq('payment_status', 'pending')
    if (await releaseDiscountForOrder(admin, holder.id)) freed = true
  }
  if (!freed) return result

  result = await reserveCode(admin, input.code, deps.now)
  return result
}
