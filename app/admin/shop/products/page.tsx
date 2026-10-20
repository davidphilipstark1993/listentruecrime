import Link from 'next/link'
import { Eye, EyeOff, Pencil, Plus } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'
import { categoryLabel } from '@/lib/shop/config'
import { formatGBP } from '@/lib/shop/money'
import type { ShopProductRow, ShopVariantRow } from '@/lib/shop/types'

export const dynamic = 'force-dynamic'

export default async function ProductsPage() {
  const admin = createAdminClient()
  const [{ data: products }, { data: variants }] = await Promise.all([
    admin.from('shop_products').select('*').order('sort_order').order('created_at'),
    admin.from('shop_variants').select('*'),
  ])
  const byProduct = new Map<string, ShopVariantRow[]>()
  for (const v of (variants ?? []) as ShopVariantRow[]) byProduct.set(v.product_id, [...(byProduct.get(v.product_id) ?? []), v])

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="heading-display mb-1 text-2xl">Products</h1>
          <p className="text-sm text-stone-subtle">A product can only be bought once it has a Printify product id, and each variant a Printify variant id and a price.</p>
        </div>
        <Link href="/admin/shop/products/new" className="btn-primary"><Plus size={15} /> Add product</Link>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-white/[0.06]">{['Product', 'Category', 'Printify', 'Variants', 'Price', 'Visibility', ''].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-stone-subtle">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-white/[0.04]">
            {((products ?? []) as ShopProductRow[]).map(p => {
              const vs = byProduct.get(p.id) ?? []
              const ready = vs.filter(v => v.is_enabled && v.printify_variant_id && v.price_pence)
              const prices = ready.map(v => v.price_pence as number)
              return (
                <tr key={p.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3 font-medium text-stone">{p.title}{p.is_placeholder && <span className="ml-2 tag">placeholder</span>}{p.is_featured && <span className="ml-1 tag-crimson">featured</span>}</td>
                  <td className="px-4 py-3 text-xs text-stone-subtle">{categoryLabel(p.category)}</td>
                  <td className="px-4 py-3 text-xs text-stone-subtle">{p.printify_product_id ?? <span className="text-amber-400">not linked</span>}</td>
                  <td className="px-4 py-3 text-xs text-stone-subtle">{ready.length} of {vs.length} buyable</td>
                  <td className="px-4 py-3 text-xs text-stone-subtle">{prices.length ? (Math.min(...prices) === Math.max(...prices) ? formatGBP(prices[0]) : `${formatGBP(Math.min(...prices))}–${formatGBP(Math.max(...prices))}`) : '—'}</td>
                  <td className="px-4 py-3"><span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${p.is_published ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-stone-subtle'}`}>{p.is_published ? <Eye size={10} /> : <EyeOff size={10} />}{p.is_published ? 'Visible' : 'Hidden'}</span></td>
                  <td className="px-4 py-3 text-right"><Link href={`/admin/shop/products/${p.id}`} className="inline-flex items-center gap-1 text-xs text-stone-muted hover:text-stone"><Pencil size={11} /> Edit</Link></td>
                </tr>
              )
            })}
            {(products ?? []).length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-stone-subtle">No products yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
