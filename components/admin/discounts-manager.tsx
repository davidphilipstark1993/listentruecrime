'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { formatGBP } from '@/lib/shop/money'
import type { CampaignRow, CodeRow } from '@/lib/discounts/types'
import type { CampaignRevenueRow, CodeStatus } from '@/lib/discounts/report'

type CodeWithStatus = CodeRow & { status: CodeStatus }

async function call(url: string, method: string, body: unknown) {
  const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error ?? 'Something went wrong')
  return data
}

const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—')
const STATUS_STYLE: Record<CodeStatus, string> = {
  live: 'text-emerald-400', used: 'text-stone-subtle', expired: 'text-stone-subtle', 'switched off': 'text-stone-subtle', 'not started': 'text-amber-300', 'over max': 'text-crimson',
}

export function DiscountsManager({ maxPercent, campaigns, codes, revenue }: {
  maxPercent: number
  campaigns: CampaignRow[]
  codes: CodeWithStatus[]
  revenue: CampaignRevenueRow[]
}) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [generated, setGenerated] = useState<{ campaign: string; codes: string[] } | null>(null)
  const [counts, setCounts] = useState<Record<string, string>>({})
  const [suffixes, setSuffixes] = useState<Record<string, string>>({})
  const [form, setForm] = useState({ prefix: '', name: '', type: 'unique', percent: '10', expiresAt: '', validDays: '', maxUses: '', notes: '' })

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key)
    try { await fn(); router.refresh() } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed') } finally { setBusy(null) }
  }

  const createCampaign = (e: React.FormEvent) => {
    e.preventDefault()
    run('create', async () => {
      await call('/api/admin/discounts/campaigns', 'POST', {
        prefix: form.prefix, name: form.name, type: form.type, discountPercent: Number(form.percent),
        expiresAt: form.expiresAt ? new Date(`${form.expiresAt}T23:59:59`).toISOString() : null,
        codeValidDays: form.validDays ? Number(form.validDays) : null,
        maxUsesPerCode: form.type === 'public' && form.maxUses ? Number(form.maxUses) : null,
        notes: form.notes || null,
      })
      toast.success('Campaign created')
      setForm({ prefix: '', name: '', type: 'unique', percent: '10', expiresAt: '', validDays: '', maxUses: '', notes: '' })
    })
  }

  const generate = (c: CampaignRow) =>
    run(`gen-${c.id}`, async () => {
      const data = await call(`/api/admin/discounts/campaigns/${c.id}/codes`, 'POST',
        c.type === 'public' ? { suffix: suffixes[c.id] || undefined } : { count: Number(counts[c.id] || 1) })
      setGenerated({ campaign: c.prefix, codes: (data.codes as CodeRow[]).map(x => x.code) })
      toast.success(`${data.codes.length} code${data.codes.length === 1 ? '' : 's'} created`)
    })

  const field = 'input-base py-2 text-sm'
  const label = 'mb-1 block text-xs font-medium text-stone-muted'
  const th = 'px-4 py-3 text-left text-xs font-medium text-stone-subtle'

  return (
    <div className="space-y-8">
      {/* Revenue per campaign */}
      <section>
        <h2 className="mb-2 font-serif text-lg text-stone">Revenue per campaign</h2>
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-white/[0.06]">{['Campaign', 'Paid orders', 'Revenue (incl. delivery)', 'Discount given', 'Avg order'].map(h => <th key={h} className={th}>{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-white/[0.04]">
              {revenue.map(r => (
                <tr key={r.prefix ?? 'none'}>
                  <td className="px-4 py-3 font-mono text-xs">{r.prefix ?? 'No code used'}</td>
                  <td className="px-4 py-3 tabular-nums">{r.orders}</td>
                  <td className="px-4 py-3 tabular-nums">{formatGBP(r.revenuePence)}</td>
                  <td className="px-4 py-3 tabular-nums text-stone-muted">{r.prefix ? formatGBP(r.discountPence) : '—'}</td>
                  <td className="px-4 py-3 tabular-nums text-stone-muted">{formatGBP(r.averageOrderPence)}</td>
                </tr>
              ))}
              {revenue.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-stone-subtle">No paid orders yet.</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="mt-1 text-2xs text-stone-subtle">Revenue is net of refunds. Unpaid, expired and failed checkouts are not counted. The code used on each order is also shown on the order page.</p>
      </section>

      {/* Campaigns */}
      <section>
        <h2 className="mb-2 font-serif text-lg text-stone">Campaigns</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {campaigns.map(c => {
            const own = codes.filter(x => x.campaign_id === c.id)
            const live = own.filter(x => x.status === 'live').length
            return (
              <div key={c.id} className="card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-sm text-stone">{c.prefix} <span className="font-sans text-stone-muted">{c.name}</span></p>
                    <p className="mt-1 text-xs text-stone-subtle">
                      {c.type === 'unique' ? 'Unique single-use codes' : 'One public shared code'} · {c.discount_percent}% off
                      {c.expires_at ? ` · ends ${fmtDate(c.expires_at)}` : ''}
                      {c.code_valid_days ? ` · each code valid ${c.code_valid_days} days` : ''}
                      {c.max_uses_per_code ? ` · max ${c.max_uses_per_code} uses` : ''}
                    </p>
                    {c.notes && <p className="mt-1 text-2xs text-stone-subtle">{c.notes}</p>}
                  </div>
                  <button
                    disabled={busy === `act-${c.id}`}
                    onClick={() => run(`act-${c.id}`, async () => { await call(`/api/admin/discounts/campaigns/${c.id}`, 'PATCH', { isActive: !c.is_active }) })}
                    className={`tag shrink-0 px-3 py-1 ${c.is_active ? 'border-emerald-400/40 text-emerald-400' : ''}`}
                    aria-label={`${c.prefix} campaign is ${c.is_active ? 'on' : 'off'}. Click to switch ${c.is_active ? 'off' : 'on'}.`}
                  >{c.is_active ? 'On' : 'Off'}</button>
                </div>
                <p className="mt-3 text-xs text-stone-muted">{own.length} codes · {live} live</p>
                <div className="mt-3 flex flex-wrap items-end gap-2">
                  {c.type === 'unique' ? (
                    <>
                      <div><label className={label} htmlFor={`n-${c.id}`}>How many codes</label><input id={`n-${c.id}`} className={`${field} w-24`} inputMode="numeric" placeholder="1" value={counts[c.id] ?? ''} onChange={e => setCounts(p => ({ ...p, [c.id]: e.target.value }))} /></div>
                      <button className="btn-outline py-2 text-sm" disabled={busy === `gen-${c.id}`} onClick={() => generate(c)}>Generate</button>
                    </>
                  ) : (
                    <>
                      <div><label className={label} htmlFor={`s-${c.id}`}>Code ending (optional)</label><input id={`s-${c.id}`} className={`${field} w-44 font-mono uppercase`} placeholder="BLACKFRIDAY" value={suffixes[c.id] ?? ''} onChange={e => setSuffixes(p => ({ ...p, [c.id]: e.target.value }))} /></div>
                      <button className="btn-outline py-2 text-sm" disabled={busy === `gen-${c.id}`} onClick={() => generate(c)}>Create public code</button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        {generated && (
          <div className="card mt-4 p-4">
            <p className="mb-2 text-xs text-stone-muted">New {generated.campaign} codes (copy them now; they are also listed below):</p>
            <textarea readOnly aria-label="New codes" className="input-base h-32 w-full font-mono text-xs" value={generated.codes.join('\n')} onFocus={e => e.currentTarget.select()} />
          </div>
        )}
      </section>

      {/* Create a campaign */}
      <section>
        <h2 className="mb-2 font-serif text-lg text-stone">New campaign</h2>
        <form onSubmit={createCampaign} className="card grid max-w-3xl gap-4 p-5 sm:grid-cols-2">
          <div><label className={label} htmlFor="c-prefix">Prefix</label><input id="c-prefix" required className={`${field} font-mono uppercase`} placeholder="BF26" value={form.prefix} onChange={e => setForm({ ...form, prefix: e.target.value })} /><p className="mt-1 text-2xs text-stone-subtle">Letters/digits, e.g. BF26, LOYAL, WELCOME. A &quot;-&quot; is added.</p></div>
          <div><label className={label} htmlFor="c-name">Name</label><input id="c-name" required className={field} placeholder="Black Friday 2026" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
          <div>
            <label className={label} htmlFor="c-type">Type</label>
            <select id="c-type" className={field} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
              <option value="unique">Unique single-use codes (personal rewards)</option>
              <option value="public">One public shared code (campaigns)</option>
            </select>
          </div>
          <div><label className={label} htmlFor="c-pct">Discount % (max {maxPercent})</label><input id="c-pct" required type="number" min={1} max={maxPercent} className={field} value={form.percent} onChange={e => setForm({ ...form, percent: e.target.value })} /></div>
          <div><label className={label} htmlFor="c-end">Ends on (optional)</label><input id="c-end" type="date" className={field} value={form.expiresAt} onChange={e => setForm({ ...form, expiresAt: e.target.value })} /></div>
          <div><label className={label} htmlFor="c-days">Each code valid for (days, optional)</label><input id="c-days" type="number" min={1} className={field} value={form.validDays} onChange={e => setForm({ ...form, validDays: e.target.value })} /></div>
          {form.type === 'public' && <div><label className={label} htmlFor="c-max">Max total uses (optional)</label><input id="c-max" type="number" min={1} className={field} placeholder="unlimited" value={form.maxUses} onChange={e => setForm({ ...form, maxUses: e.target.value })} /></div>}
          <div className="sm:col-span-2"><label className={label} htmlFor="c-notes">Notes (optional)</label><input id="c-notes" className={field} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
          <p className="text-2xs text-stone-subtle sm:col-span-2">Every code needs an expiry: set an end date, a number of days, or both (the earlier one wins). New campaigns start switched on.</p>
          <div className="sm:col-span-2"><button className="btn-primary" disabled={busy === 'create'}>{busy === 'create' ? 'Creating…' : 'Create campaign'}</button></div>
        </form>
      </section>

      {/* Codes */}
      <section>
        <h2 className="mb-2 font-serif text-lg text-stone">Latest codes</h2>
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-white/[0.06]">{['Code', '%', 'Status', 'Expires', 'Uses', ''].map((h, i) => <th key={i} className={th}>{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-white/[0.04]">
              {codes.slice(0, 200).map(c => (
                <tr key={c.id}>
                  <td className="px-4 py-2 font-mono text-xs">{c.code}{c.owner_subscriber_id && <span className="ml-2 font-sans text-2xs text-stone-subtle">referral tier {c.reward_tier}</span>}</td>
                  <td className="px-4 py-2 tabular-nums">{c.discount_percent}%</td>
                  <td className={`px-4 py-2 text-xs ${STATUS_STYLE[c.status]}`}>{c.status}</td>
                  <td className="px-4 py-2 text-xs text-stone-muted">{fmtDate(c.expires_at)}</td>
                  <td className="px-4 py-2 text-xs tabular-nums text-stone-muted">{c.max_uses == null ? 'unlimited' : `${c.use_count}/${c.max_uses}`}</td>
                  <td className="px-4 py-2 text-right text-xs">
                    <button className="text-stone-subtle hover:text-stone" disabled={busy === `code-${c.id}`} onClick={() => run(`code-${c.id}`, async () => { await call(`/api/admin/discounts/codes/${c.id}`, 'PATCH', { isActive: !c.is_active }) })}>{c.is_active ? 'Switch off' : 'Switch on'}</button>
                    {c.owner_subscriber_id && <button className="ml-3 text-stone-subtle hover:text-stone" disabled={busy === `mail-${c.id}`} onClick={() => run(`mail-${c.id}`, async () => { await call(`/api/admin/discounts/codes/${c.id}`, 'PATCH', { resendEmail: true }); toast.success('Email sent') })}>{c.email_sent_at ? 'Resend email' : 'Send email'}</button>}
                  </td>
                </tr>
              ))}
              {codes.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-stone-subtle">No codes yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
