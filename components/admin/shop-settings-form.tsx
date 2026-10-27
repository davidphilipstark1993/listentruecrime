'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import type { ShopSettings } from '@/lib/shop/settings'

export function ShopSettingsForm({ settings }: { settings: ShopSettings }) {
  const router = useRouter()
  const [s, setS] = useState({
    printify_cost_currency: settings.printifyCostCurrency,
    printify_to_gbp_rate: settings.printifyToGbpRate != null ? String(settings.printifyToGbpRate) : '',
    stripe_fee_percent: String(settings.stripeFeePercent),
    stripe_fee_fixed_pence: String(settings.stripeFeeFixedPence),
    vat_percent: String(settings.vatPercent),
  })
  const [saving, setSaving] = useState(false)
  const input = (k: keyof typeof s) => <input className="input-base" value={s[k]} onChange={e => setS(prev => ({ ...prev, [k]: e.target.value }))} />

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/shop/settings', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          printify_cost_currency: s.printify_cost_currency,
          printify_to_gbp_rate: s.printify_to_gbp_rate.trim() ? Number(s.printify_to_gbp_rate) : null,
          stripe_fee_percent: Number(s.stripe_fee_percent), stripe_fee_fixed_pence: Number(s.stripe_fee_fixed_pence), vat_percent: Number(s.vat_percent),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Save failed')
      toast.success('Settings saved'); router.refresh()
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Save failed') } finally { setSaving(false) }
  }

  return (
    <div className="card max-w-2xl space-y-5 p-6">
      <div>
        <label className="mb-1 block text-xs font-medium text-stone-muted">Printify billing currency</label>{input('printify_cost_currency')}
        <p className="mt-1 text-2xs text-stone-subtle">The currency Printify charges you in (check your Printify account billing). Printify returns costs in minor units of this currency. Do not guess.</p>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-stone-muted">Printify currency → GBP rate</label>{input('printify_to_gbp_rate')}
        <p className="mt-1 text-2xs text-stone-subtle">Needed unless your currency is GBP. e.g. 0.78 means 1 USD = £0.78. Used to turn Printify&apos;s delivery quote into the GBP delivery charge (rounded up) and to estimate profit. Until set, delivery cannot be priced and checkout refuses.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className="mb-1 block text-xs font-medium text-stone-muted">Stripe fee % (estimate)</label>{input('stripe_fee_percent')}</div>
        <div><label className="mb-1 block text-xs font-medium text-stone-muted">Stripe fixed fee, pence (estimate)</label>{input('stripe_fee_fixed_pence')}</div>
      </div>
      <p className="-mt-2 text-2xs text-stone-subtle">Check these against your Stripe pricing. They only drive <em>estimated</em> profit; the real fee replaces them automatically once Stripe reports it.</p>
      <div>
        <label className="mb-1 block text-xs font-medium text-stone-muted">VAT % (0 if not VAT registered)</label>{input('vat_percent')}
        <p className="mt-1 text-2xs text-stone-subtle">Prices are treated as VAT-inclusive; this share of revenue is deducted in profit figures. Confirm with your accountant.</p>
      </div>
      <button onClick={save} disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Save settings'}</button>
    </div>
  )
}
