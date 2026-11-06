import Link from 'next/link'
import { Plus } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'
import { adImageUrl } from '@/lib/ads/config'
import { getPlacement } from '@/lib/ads/placements'
import { adStatus, type AdStatus } from '@/lib/ads/schedule'
import { RANGES, formatCtr, getAdStats, parseRange } from '@/lib/ads/stats'
import { AdBarChart } from '@/components/admin/ad-bar-chart'
import { AdRowActions } from '@/components/admin/ad-row-actions'
import type { Ad } from '@/lib/ads/types'

export const dynamic = 'force-dynamic'

const STATUS_STYLE: Record<AdStatus, string> = {
  live: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  scheduled: 'bg-sky-500/10 text-sky-300 border-sky-500/20',
  expired: 'bg-white/[0.04] text-stone-subtle border-white/10',
  inactive: 'bg-gold/10 text-gold-light border-gold/20',
  archived: 'bg-white/[0.04] text-stone-subtle border-white/10',
}
const STATUS_LABEL: Record<AdStatus, string> = { live: 'Live', scheduled: 'Scheduled', expired: 'Expired', inactive: 'Draft / paused', archived: 'Archived' }

const fmt = (n: number) => n.toLocaleString('en-GB')
const dateFmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' }) : null

export default async function AdminAdsPage({ searchParams }: { searchParams: { range?: string; show?: string } }) {
  const range = parseRange(searchParams.range)
  const showArchived = searchParams.show === 'archived'

  const admin = createAdminClient()
  const [{ data, error }, stats] = await Promise.all([
    admin.from('ads').select('*').order('sort_order', { ascending: true }).order('created_at', { ascending: false }),
    getAdStats(range.days),
  ])

  const missingTable = Boolean(error)
  const all = (data ?? []) as Ad[]
  const now = new Date()
  const ads = all.filter(a => (showArchived ? !!a.archived_at : !a.archived_at))
  const archivedCount = all.filter(a => a.archived_at).length

  const s = stats.ok ? stats : null
  const totals = s?.totals ?? { impressions: 0, clicks: 0 }

  return (
    <div className="p-6 lg:p-8 max-w-6xl">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="heading-display text-2xl">Advertisements</h1>
          <p className="text-sm text-stone-muted mt-1">Cross-promotion for your other sites. Upload artwork, choose where it appears, publish.</p>
        </div>
        <Link href="/admin/ads/new" className="btn-primary"><Plus size={15} /> New advert</Link>
      </div>

      {(missingTable || !stats.ok) && (
        <div className="card p-5 mb-6 border-crimson/30">
          <p className="text-sm text-stone font-medium mb-1">The advertising tables aren&apos;t set up yet</p>
          <p className="text-xs text-stone-muted">Run <code className="text-stone">supabase/migrations/021_ad_network.sql</code> in the Supabase SQL editor, then reload this page.</p>
        </div>
      )}

      {/* Range */}
      <nav className="flex gap-2 mb-5" aria-label="Date range">
        {RANGES.map(r => (
          <Link key={r.value} href={`/admin/ads?range=${r.value}${showArchived ? '&show=archived' : ''}`}
            className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${range.value === r.value ? 'border-crimson/50 text-stone bg-crimson/10' : 'border-white/10 text-stone-muted hover:text-stone'}`}>
            {r.label}
          </Link>
        ))}
      </nav>

      {/* Totals */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          ['Impressions', fmt(totals.impressions)],
          ['Clicks', fmt(totals.clicks)],
          ['Click-through rate', formatCtr(totals)],
        ].map(([k, v]) => (
          <div key={k} className="card p-5">
            <p className="text-xs text-stone-muted mb-1">{k}</p>
            <p className="font-serif text-2xl sm:text-3xl text-stone tabular-nums">{v}</p>
            <p className="text-2xs text-stone-subtle mt-1">{range.label.toLowerCase()}</p>
          </div>
        ))}
      </div>

      {/* Over time */}
      {s && (
        <div className="grid lg:grid-cols-2 gap-4 mb-3">
          <AdBarChart title="Impressions per day" data={s.daily} field="impressions" />
          <AdBarChart title="Clicks per day" data={s.daily} field="clicks" />
        </div>
      )}
      {s && (
        <details className="mb-8 text-xs text-stone-muted">
          <summary className="cursor-pointer hover:text-stone">Show daily figures as a table</summary>
          <div className="card mt-3 max-h-72 overflow-auto">
            <table className="w-full text-xs">
              <thead className="text-left text-stone-subtle sticky top-0 bg-ink-800"><tr><th className="p-3">Day</th><th className="p-3 text-right">Impressions</th><th className="p-3 text-right">Clicks</th><th className="p-3 text-right">CTR</th></tr></thead>
              <tbody>
                {[...s.daily].reverse().map(d => (
                  <tr key={d.day} className="border-t border-white/[0.05]"><td className="p-3">{d.day}</td><td className="p-3 text-right tabular-nums">{fmt(d.impressions)}</td><td className="p-3 text-right tabular-nums">{fmt(d.clicks)}</td><td className="p-3 text-right tabular-nums">{formatCtr(d)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}

      {/* By placement */}
      <section className="card mb-8 overflow-x-auto">
        <h2 className="text-sm font-medium text-stone p-5 pb-3">Performance by placement</h2>
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-stone-subtle"><tr><th className="px-5 py-2">Placement</th><th className="px-5 py-2 text-right">Impressions</th><th className="px-5 py-2 text-right">Clicks</th><th className="px-5 py-2 text-right">CTR</th></tr></thead>
          <tbody>
            {(s?.byPlacement ?? []).length === 0 && <tr><td colSpan={4} className="px-5 py-4 text-xs text-stone-subtle border-t border-white/[0.05]">No activity in this period yet.</td></tr>}
            {[...(s?.byPlacement ?? [])].sort((a, b) => b.impressions - a.impressions).map(p => (
              <tr key={p.placement} className="border-t border-white/[0.05]">
                <td className="px-5 py-3 text-stone-muted">{getPlacement(p.placement)?.label ?? p.placement}</td>
                <td className="px-5 py-3 text-right tabular-nums text-stone">{fmt(p.impressions)}</td>
                <td className="px-5 py-3 text-right tabular-nums text-stone">{fmt(p.clicks)}</td>
                <td className="px-5 py-3 text-right tabular-nums text-stone">{formatCtr(p)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Adverts */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium text-stone">{showArchived ? 'Archived adverts' : 'Your adverts'}</h2>
        <Link href={`/admin/ads?range=${range.value}${showArchived ? '' : '&show=archived'}`} className="text-xs text-stone-muted hover:text-stone">
          {showArchived ? '← Back to adverts' : `Archived (${archivedCount})`}
        </Link>
      </div>

      {ads.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-stone-muted text-sm mb-4">{showArchived ? 'Nothing archived.' : 'No adverts yet. Create your first one to start promoting your other sites.'}</p>
          {!showArchived && <Link href="/admin/ads/new" className="btn-primary"><Plus size={15} /> New advert</Link>}
        </div>
      ) : (
        <ul className="space-y-3">
          {ads.map(ad => {
            const status = adStatus(ad, now)
            const c = s?.byAd.get(ad.id) ?? { impressions: 0, clicks: 0 }
            return (
              <li key={ad.id} className="card p-4 flex flex-col sm:flex-row gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={adImageUrl(ad.image_path)} alt="" className="w-full sm:w-44 aspect-video object-cover rounded-md border border-white/10 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="text-stone font-medium truncate">{ad.title}</h3>
                    <span className={`px-2 py-0.5 rounded-full border text-2xs font-semibold uppercase tracking-wide ${STATUS_STYLE[status]}`}>{STATUS_LABEL[status]}</span>
                  </div>
                  <a href={ad.destination_url} target="_blank" rel="noopener noreferrer" className="text-xs text-stone-subtle hover:text-stone break-all">{ad.destination_url}</a>
                  <p className="text-xs text-stone-muted mt-1.5">{ad.placements.map(k => getPlacement(k)?.label ?? k).join(' · ')}</p>
                  <p className="text-2xs text-stone-subtle mt-1">
                    Order {ad.sort_order}
                    {ad.starts_at && ` · starts ${dateFmt(ad.starts_at)}`}
                    {ad.ends_at && ` · ends ${dateFmt(ad.ends_at)}`}
                  </p>
                  <div className="mt-3"><AdRowActions id={ad.id} title={ad.title} status={status} isActive={ad.is_active} /></div>
                </div>
                <dl className="grid grid-cols-3 sm:grid-cols-1 gap-x-4 gap-y-1 text-xs sm:text-right sm:w-28 shrink-0">
                  <div><dt className="text-stone-subtle">Impressions</dt><dd className="text-stone tabular-nums">{fmt(c.impressions)}</dd></div>
                  <div><dt className="text-stone-subtle">Clicks</dt><dd className="text-stone tabular-nums">{fmt(c.clicks)}</dd></div>
                  <div><dt className="text-stone-subtle">CTR</dt><dd className="text-stone tabular-nums">{formatCtr(c)}</dd></div>
                </dl>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
