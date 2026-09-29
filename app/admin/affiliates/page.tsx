import { createAdminClient } from '@/lib/supabase/admin'
import { AffiliateManager } from '@/components/admin/affiliate-manager'
import { getAffiliateProvider } from '@/lib/affiliates/providers'
import { extractAffiliateSlugs } from '@/lib/affiliates/mdx'
import { getAllPosts } from '@/lib/blog'
import type { AffiliatePlacement, AffiliateProduct, AffiliateProductClickStats } from '@/lib/types/database'

export const dynamic = 'force-dynamic'

interface RecentClick {
  id: number
  created_at: string
  product_slug: string | null
  provider: string
  page_path: string
  placement: string | null
}

// Which articles reference each product inline (<FurtherReading> /
// <AffiliateProduct> in their MDX) — those placements live in the article
// text rather than the placements table.
function getInlineUsage(): Record<string, string[]> {
  const usage: Record<string, string[]> = {}
  for (const post of getAllPosts()) {
    for (const slug of extractAffiliateSlugs(post.content)) (usage[slug] ??= []).push(post.slug)
  }
  return usage
}

type Row = { label: string; href?: string; clicks: number }

function tally<T>(items: T[], key: (item: T) => string): [string, number][] {
  const counts = new Map<string, number>()
  for (const item of items) counts.set(key(item), (counts.get(key(item)) ?? 0) + 1)
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])
}

function ClickTable({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <div className="card p-5">
      <h3 className="text-sm font-medium text-stone mb-3">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-xs text-stone-subtle">No clicks in the last 30 days.</p>
      ) : (
        <ul className="space-y-1.5">
          {rows.slice(0, 10).map(r => (
            <li key={r.label} className="flex justify-between gap-3 text-xs">
              {r.href ? <a href={r.href} className="text-stone-muted hover:text-stone truncate">{r.label}</a> : <span className="text-stone-muted truncate">{r.label}</span>}
              <span className="text-stone tabular-nums">{r.clicks}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

async function getData() {
  const admin = createAdminClient()
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const [products, placements, stats, clicks, recent] = await Promise.all([
    admin.from('affiliate_products').select('*').order('created_at', { ascending: false }),
    admin.from('affiliate_placements').select('*').order('position', { ascending: true }),
    admin.from('affiliate_product_click_stats').select('*'),
    admin.from('affiliate_clicks').select('id, created_at, product_slug, provider, page_path, placement').order('created_at', { ascending: false }).limit(50),
    admin.from('affiliate_clicks').select('product_slug, provider, page_path').gte('created_at', since).limit(10000),
  ])
  return {
    products: (products.data ?? []) as AffiliateProduct[],
    placements: (placements.data ?? []) as AffiliatePlacement[],
    stats: (stats.data ?? []) as AffiliateProductClickStats[],
    clicks: (clicks.data ?? []) as RecentClick[],
    last30: (recent.data ?? []) as Pick<RecentClick, 'product_slug' | 'provider' | 'page_path'>[],
    error: products.error?.message ?? null,
  }
}

export default async function AdminAffiliatesPage() {
  const { products, placements, stats, clicks, last30, error } = await getData()
  const inlineUsage = getInlineUsage()
  const liveCount = products.filter(p => p.active && p.affiliate_url).length

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="heading-display text-2xl mb-1">Affiliate products</h1>
        <p className="text-stone-subtle text-sm">
          {products.length} products · {liveCount} live. A product only appears on the site when it is switched on,
          has an affiliate URL, and has been added to at least one page (or placed inline in an article).
        </p>
      </div>

      {error && (
        <div className="card p-4 mb-6 border-amber-900/40 text-amber-400 text-sm">
          Could not load affiliate products: {error}. If the table is missing, run
          <code className="mx-1 text-xs">supabase/migrations/013_affiliate_products.sql</code>
          in the Supabase SQL editor.
        </div>
      )}

      <AffiliateManager products={products} placements={placements} stats={stats} inlineUsage={inlineUsage} />

      <div className="mt-12">
        <h2 className="font-serif text-lg text-stone mb-1">Clicks, last 30 days</h2>
        <p className="text-stone-subtle text-xs mb-4">{last30.length} outbound affiliate clicks. The same events are in Google Analytics as <code>affiliate_click</code>.</p>
        <div className="grid md:grid-cols-3 gap-4">
          <ClickTable title="By product" rows={tally(last30, c => c.product_slug ?? '(unmanaged link)').map(([label, n]) => ({ label, clicks: n }))} />
          <ClickTable title="By page" rows={tally(last30, c => c.page_path).map(([label, n]) => ({ label, href: label, clicks: n }))} />
          <ClickTable title="By provider" rows={tally(last30, c => c.provider).map(([id, n]) => ({ label: getAffiliateProvider(id)?.name ?? id, clicks: n }))} />
        </div>
      </div>

      <div className="mt-12">
        <h2 className="font-serif text-lg text-stone mb-1 mt-2">Recent clicks</h2>
        <p className="text-stone-subtle text-xs mb-4">Last 50 outbound affiliate clicks. No personal data is recorded.</p>
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {['When', 'Product', 'Provider', 'Page', 'Placement'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-stone-subtle text-xs font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {clicks.map(c => (
                <tr key={c.id}>
                  <td className="px-4 py-2.5 text-stone-subtle text-xs whitespace-nowrap">
                    {new Date(c.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-4 py-2.5 text-stone text-xs">{c.product_slug ?? '—'}</td>
                  <td className="px-4 py-2.5 text-stone-muted text-xs">{getAffiliateProvider(c.provider)?.name ?? c.provider}</td>
                  <td className="px-4 py-2.5 text-xs"><a href={c.page_path} className="text-crimson hover:underline">{c.page_path}</a></td>
                  <td className="px-4 py-2.5 text-stone-subtle text-xs">{c.placement ?? '—'}</td>
                </tr>
              ))}
              {clicks.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-stone-subtle text-sm">No clicks yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
