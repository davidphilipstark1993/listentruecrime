import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

interface SubRow { id: string; email: string; first_name: string | null; referral_code: string; status: string }
interface RefRow { referrer_id: string; status: 'pending' | 'confirmed' }
interface RewardRow { owner_subscriber_id: string; reward_tier: number | null; discount_percent: number; code: string; use_count: number; email_sent_at: string | null }

export default async function ReferralsPage() {
  const admin = createAdminClient()
  const [{ data: refs }, { data: rewards }] = await Promise.all([
    admin.from('referrals').select('referrer_id, status').limit(50000),
    admin.from('discount_codes').select('owner_subscriber_id, reward_tier, discount_percent, code, use_count, email_sent_at').not('owner_subscriber_id', 'is', null).limit(50000),
  ])
  const referrals = (refs ?? []) as RefRow[]
  const rewardRows = (rewards ?? []) as RewardRow[]

  const counts = new Map<string, { confirmed: number; pending: number }>()
  for (const r of referrals) {
    const c = counts.get(r.referrer_id) ?? { confirmed: 0, pending: 0 }
    c[r.status] += 1
    counts.set(r.referrer_id, c)
  }
  const ids = Array.from(counts.keys())
  const { data: subs } = ids.length
    ? await admin.from('newsletter_subscribers').select('id, email, first_name, referral_code, status').in('id', ids)
    : { data: [] }
  const subById = new Map(((subs ?? []) as SubRow[]).map(s => [s.id, s]))

  const rows = ids
    .map(id => ({ id, sub: subById.get(id), ...(counts.get(id) as { confirmed: number; pending: number }) }))
    .sort((a, b) => b.confirmed - a.confirmed || b.pending - a.pending)

  const rewardsFor = (id: string) => rewardRows.filter(w => w.owner_subscriber_id === id).sort((a, b) => (a.reward_tier ?? 0) - (b.reward_tier ?? 0))

  const totalConfirmed = referrals.filter(r => r.status === 'confirmed').length
  const totalPending = referrals.length - totalConfirmed

  return (
    <div className="p-8">
      <h1 className="heading-display mb-1 text-2xl">Referrals</h1>
      <p className="mb-6 max-w-3xl text-sm text-stone-subtle">
        A referral counts once the new subscriber has confirmed their email. Pending = signed up with a code but not yet confirmed.
        Only the referrer is listed here; the people they referred are never shown or emailed.
      </p>
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {[['Confirmed referrals', totalConfirmed], ['Awaiting confirmation', totalPending], ['Reward codes issued', rewardRows.length]].map(([k, v]) => (
          <div key={k as string} className="card p-5"><p className="text-xs text-stone-subtle">{k}</p><p className="mt-1 font-serif text-3xl text-stone tabular-nums">{v}</p></div>
        ))}
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              {['Referrer', 'Their code', 'Confirmed', 'Pending', 'Rewards'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-stone-subtle">{h}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {rows.map(r => (
              <tr key={r.id} className="hover:bg-white/[0.02]">
                <td className="px-4 py-3 text-xs text-stone-muted">{r.sub?.first_name ?? '—'}<br /><span className="text-stone-subtle">{r.sub?.email ?? 'deleted subscriber'}</span></td>
                <td className="px-4 py-3 font-mono text-xs">{r.sub?.referral_code ?? '—'}</td>
                <td className="px-4 py-3 tabular-nums">{r.confirmed}</td>
                <td className="px-4 py-3 tabular-nums text-stone-subtle">{r.pending}</td>
                <td className="px-4 py-3 text-xs text-stone-muted">
                  {rewardsFor(r.id).length === 0 ? '—' : rewardsFor(r.id).map(w => (
                    <div key={w.code}><span className="font-mono">{w.code}</span> · {w.discount_percent}% · {w.use_count > 0 ? 'used' : 'unused'}{w.email_sent_at ? '' : ' · not emailed'}</div>
                  ))}
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-stone-subtle">No referrals yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
