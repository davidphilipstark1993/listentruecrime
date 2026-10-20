import { createAdminClient } from '@/lib/supabase/admin'

export interface ShopSettings {
  printifyCostCurrency: string
  /** Multiply Printify minor units by this to get GBP pence. null = not configured. */
  printifyToGbpRate: number | null
  stripeFeePercent: number
  stripeFeeFixedPence: number
  vatPercent: number
}

export const SETTING_KEYS = [
  'printify_cost_currency',
  'printify_to_gbp_rate',
  'stripe_fee_percent',
  'stripe_fee_fixed_pence',
  'vat_percent',
] as const

const num = (v: string | null | undefined): number | null => {
  if (v == null || v.trim() === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export function parseSettings(rows: { key: string; value: string | null }[]): ShopSettings {
  const m = new Map(rows.map(r => [r.key, r.value]))
  return {
    printifyCostCurrency: (m.get('printify_cost_currency') || 'GBP').toUpperCase(),
    printifyToGbpRate: num(m.get('printify_to_gbp_rate')),
    stripeFeePercent: num(m.get('stripe_fee_percent')) ?? 1.5,
    stripeFeeFixedPence: num(m.get('stripe_fee_fixed_pence')) ?? 20,
    vatPercent: num(m.get('vat_percent')) ?? 0,
  }
}

export async function getShopSettings(): Promise<ShopSettings> {
  const admin = createAdminClient()
  const { data } = await admin.from('shop_settings').select('key, value')
  return parseSettings(data ?? [])
}

/**
 * Printify minor units → GBP pence. GBP stores need no rate; any other currency
 * needs an explicit rate so we never silently treat dollars as pounds.
 */
export function printifyToPence(minor: number, s: Pick<ShopSettings, 'printifyCostCurrency' | 'printifyToGbpRate'>): number | null {
  if (s.printifyCostCurrency === 'GBP') return minor
  if (s.printifyToGbpRate == null || s.printifyToGbpRate <= 0) return null
  return Math.round(minor * s.printifyToGbpRate)
}
