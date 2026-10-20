'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { SHOP_CATEGORIES } from '@/lib/shop/config'
import type { ProductImage, ShopProductRow, ShopVariantRow, SizeGuide } from '@/lib/shop/types'

type VariantDraft = {
  id?: string
  printify_variant_id: string
  sku: string
  colour: string
  colour_hex: string
  size: string
  price: string // pounds
  cost_minor: string
  is_enabled: boolean
  sort_order: number
}

const toDraft = (v: ShopVariantRow): VariantDraft => ({
  id: v.id,
  printify_variant_id: v.printify_variant_id ? String(v.printify_variant_id) : '',
  sku: v.sku ?? '',
  colour: v.colour,
  colour_hex: v.colour_hex ?? '',
  size: v.size,
  price: v.price_pence ? (v.price_pence / 100).toFixed(2) : '',
  cost_minor: v.cost_minor != null ? String(v.cost_minor) : '',
  is_enabled: v.is_enabled,
  sort_order: v.sort_order,
})

const Field = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
  <label className="block">
    <span className="mb-1 block text-xs font-medium text-stone-muted">{label}</span>
    {children}
    {hint && <span className="mt-1 block text-2xs text-stone-subtle">{hint}</span>}
  </label>
)

export function ShopProductForm({ product, variants }: { product: ShopProductRow | null; variants: ShopVariantRow[] }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [p, setP] = useState({
    slug: product?.slug ?? '', title: product?.title ?? '', category: product?.category ?? 't-shirts',
    short_description: product?.short_description ?? '', description: product?.description ?? '',
    printify_product_id: product?.printify_product_id ?? '',
    is_published: product?.is_published ?? false, is_featured: product?.is_featured ?? false,
    is_best_seller: product?.is_best_seller ?? false, is_new: product?.is_new ?? false,
    is_placeholder: product?.is_placeholder ?? true, sort_order: product?.sort_order ?? 0,
    seo_title: product?.seo_title ?? '', seo_description: product?.seo_description ?? '', admin_notes: product?.admin_notes ?? '',
  })
  const [images, setImages] = useState<ProductImage[]>((product?.images ?? []).filter(i => !i.placeholder))
  const [specs, setSpecs] = useState((product?.specs ?? []).join('\n'))
  const [guide, setGuide] = useState(product?.size_guide ? JSON.stringify(product.size_guide, null, 2) : '')
  const [vs, setVs] = useState<VariantDraft[]>(variants.map(toDraft))

  const set = (k: string, v: unknown) => setP(prev => ({ ...prev, [k]: v }))
  const setV = (i: number, k: keyof VariantDraft, v: unknown) => setVs(prev => prev.map((x, j) => (j === i ? { ...x, [k]: v } : x)))

  const buildPayload = () => {
    let size_guide: SizeGuide | null = null
    if (guide.trim()) {
      try { size_guide = JSON.parse(guide) } catch { throw new Error('Size guide is not valid JSON') }
    }
    return {
      product: {
        ...p,
        printify_product_id: p.printify_product_id.trim() || null,
        images,
        specs: specs.split('\n').map(s => s.trim()).filter(Boolean),
        size_guide,
      },
      variants: vs.map((v, i) => ({
        ...(v.id ? { id: v.id } : {}),
        printify_variant_id: v.printify_variant_id.trim() ? Number(v.printify_variant_id) : null,
        sku: v.sku.trim() || null,
        colour: v.colour.trim(),
        colour_hex: v.colour_hex.trim() || null,
        size: v.size.trim(),
        price_pence: v.price.trim() ? Math.round(Number(v.price.replace(/[£,\s]/g, '')) * 100) : null,
        cost_minor: v.cost_minor.trim() ? Number(v.cost_minor) : null,
        is_enabled: v.is_enabled,
        sort_order: i,
      })),
    }
  }

  const save = async () => {
    setSaving(true); setFieldErrors({})
    try {
      const res = await fetch(product ? `/api/admin/shop/products/${product.id}` : '/api/admin/shop/products', {
        method: product ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(buildPayload()),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setFieldErrors(data.fieldErrors ?? {}); throw new Error(data.error ?? 'Save failed') }
      toast.success('Saved')
      if (!product && data.product) router.push(`/admin/shop/products/${data.product.id}`)
      else router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed')
    } finally { setSaving(false) }
  }

  const sync = async () => {
    if (!product) return toast.error('Save the product first, then link it to Printify.')
    if (!p.printify_product_id.trim()) return toast.error('Enter the Printify product id first')
    if (!window.confirm('Pull variants, costs and mock-up images from this Printify product? (Read-only: nothing is changed in Printify. Prices are not imported.)')) return
    setSyncing(true)
    try {
      const res = await fetch(`/api/admin/shop/products/${product.id}/sync-printify`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ printifyProductId: p.printify_product_id.trim() }) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Sync failed')
      toast.success(`Linked "${data.printifyTitle}": ${data.created} variants added, ${data.updated} updated, ${data.images} images`)
      router.refresh()
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Sync failed') } finally { setSyncing(false) }
  }

  const remove = async () => {
    if (!product || !window.confirm(`Delete "${product.title}" permanently? Past orders keep their own copy of the details. To just stop selling it, set it to hidden instead.`)) return
    const res = await fetch(`/api/admin/shop/products/${product.id}`, { method: 'DELETE' })
    if (res.ok) { toast.success('Deleted'); router.push('/admin/shop/products') } else toast.error('Delete failed')
  }

  const err = (k: string) => fieldErrors[k]?.[0] && <span className="mt-1 block text-2xs text-red-400">{fieldErrors[k][0]}</span>

  return (
    <div className="space-y-6">
      <section className="card grid gap-4 p-5 sm:grid-cols-2">
        <Field label="Title"><input className="input-base" value={p.title} onChange={e => set('title', e.target.value)} />{err('product.title')}</Field>
        <Field label="URL slug" hint="/shop/<slug> — lowercase, hyphens"><input className="input-base" value={p.slug} onChange={e => set('slug', e.target.value)} />{err('product.slug')}</Field>
        <Field label="Category"><select className="input-base" value={p.category} onChange={e => set('category', e.target.value)}>{SHOP_CATEGORIES.map(c => <option key={c.slug} value={c.slug}>{c.label}</option>)}</select></Field>
        <Field label="Sort order" hint="Lower numbers first"><input type="number" className="input-base" value={p.sort_order} onChange={e => set('sort_order', Number(e.target.value))} /></Field>
        <div className="sm:col-span-2"><Field label="Short description" hint="Shown on cards and in search results"><input className="input-base" value={p.short_description} onChange={e => set('short_description', e.target.value)} /></Field></div>
        <div className="sm:col-span-2"><Field label="Description" hint="Blank line = new paragraph. British English."><textarea rows={7} className="input-base" value={p.description} onChange={e => set('description', e.target.value)} /></Field></div>
        <div className="sm:col-span-2"><Field label="Product facts (one per line)" hint="Only facts from the supplier's specification (fabric, fit, care). Leave empty if unknown."><textarea rows={3} className="input-base" value={specs} onChange={e => setSpecs(e.target.value)} /></Field></div>
      </section>

      <section className="card space-y-4 p-5">
        <h2 className="font-serif text-lg text-stone">Printify link</h2>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[16rem] flex-1"><Field label="Printify product id" hint="From the product URL in Printify. Never invent one."><input className="input-base" value={p.printify_product_id} onChange={e => set('printify_product_id', e.target.value)} /></Field></div>
          <button type="button" onClick={sync} disabled={syncing} className="btn-outline py-2.5">{syncing ? 'Syncing…' : 'Pull variants from Printify'}</button>
        </div>
      </section>

      <section className="card space-y-3 p-5">
        <div className="flex items-center justify-between"><h2 className="font-serif text-lg text-stone">Variants</h2>
          <button type="button" className="btn-ghost py-1.5 text-xs" onClick={() => setVs(prev => [...prev, { printify_variant_id: '', sku: '', colour: 'Black', colour_hex: '#0a0a0f', size: 'M', price: '', cost_minor: '', is_enabled: true, sort_order: prev.length }])}>+ Add variant</button></div>
        <p className="text-xs text-stone-subtle">Selling price is in pounds. Cost is Printify&apos;s production cost in its own minor units (cents) — used for profit estimates only. A variant is buyable only with a Printify variant id <em>and</em> a price.</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[56rem] text-xs">
            <thead><tr className="text-left text-stone-subtle">{['On', 'Colour', 'Hex', 'Size', 'Printify variant id', 'Price £', 'Cost (minor)', 'SKU', ''].map(h => <th key={h} className="pb-2 pr-2 font-medium">{h}</th>)}</tr></thead>
            <tbody>
              {vs.map((v, i) => (
                <tr key={v.id ?? `n${i}`} className="align-top">
                  <td className="pr-2 pt-2"><input type="checkbox" checked={v.is_enabled} onChange={e => setV(i, 'is_enabled', e.target.checked)} /></td>
                  <td className="pr-2"><input className="input-base py-1.5" value={v.colour} onChange={e => setV(i, 'colour', e.target.value)} /></td>
                  <td className="pr-2"><input className="input-base w-24 py-1.5" value={v.colour_hex} onChange={e => setV(i, 'colour_hex', e.target.value)} placeholder="#000000" /></td>
                  <td className="pr-2"><input className="input-base w-24 py-1.5" value={v.size} onChange={e => setV(i, 'size', e.target.value)} /></td>
                  <td className="pr-2"><input className="input-base w-36 py-1.5" value={v.printify_variant_id} onChange={e => setV(i, 'printify_variant_id', e.target.value)} inputMode="numeric" /></td>
                  <td className="pr-2"><input className="input-base w-24 py-1.5" value={v.price} onChange={e => setV(i, 'price', e.target.value)} inputMode="decimal" /></td>
                  <td className="pr-2"><input className="input-base w-24 py-1.5" value={v.cost_minor} onChange={e => setV(i, 'cost_minor', e.target.value)} inputMode="numeric" /></td>
                  <td className="pr-2"><input className="input-base w-32 py-1.5" value={v.sku} onChange={e => setV(i, 'sku', e.target.value)} /></td>
                  <td className="pt-2"><button type="button" aria-label="Remove variant" className="text-stone-subtle hover:text-red-400" onClick={() => setVs(prev => prev.filter((_, j) => j !== i))}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {fieldErrors['variants'] && <span className="text-2xs text-red-400">{fieldErrors['variants'][0]}</span>}
      </section>

      <section className="card space-y-4 p-5">
        <h2 className="font-serif text-lg text-stone">Images</h2>
        {images.map((img, i) => (
          <div key={i} className="grid gap-2 sm:grid-cols-[2fr_2fr_auto]">
            <input className="input-base py-1.5" placeholder="https://… image URL" value={img.url} onChange={e => setImages(prev => prev.map((x, j) => j === i ? { ...x, url: e.target.value } : x))} />
            <input className="input-base py-1.5" placeholder="Alt text (describe the image)" value={img.alt} onChange={e => setImages(prev => prev.map((x, j) => j === i ? { ...x, alt: e.target.value } : x))} />
            <button type="button" className="text-stone-subtle hover:text-red-400" onClick={() => setImages(prev => prev.filter((_, j) => j !== i))}>✕</button>
          </div>
        ))}
        <button type="button" className="btn-ghost py-1.5 text-xs" onClick={() => setImages(prev => [...prev, { url: '', alt: '' }])}>+ Add image</button>
        <p className="text-2xs text-stone-subtle">The first image is the main one. Images must be https and from Printify, Supabase storage or another host allowed in next.config.js. With no images the shop shows a labelled placeholder.</p>
      </section>

      <section className="card grid gap-4 p-5 sm:grid-cols-2">
        <h2 className="font-serif text-lg text-stone sm:col-span-2">Visibility and merchandising</h2>
        {([['is_published', 'Visible in the shop'], ['is_featured', 'Featured'], ['is_best_seller', 'Best seller'], ['is_new', 'New arrival'], ['is_placeholder', 'Still a placeholder (artwork not final)']] as const).map(([k, label]) => (
          <label key={k} className="flex items-center gap-2 text-sm text-stone-muted"><input type="checkbox" checked={p[k]} onChange={e => set(k, e.target.checked)} /> {label}</label>
        ))}
        <div className="sm:col-span-2"><Field label="SEO title (optional)"><input className="input-base" value={p.seo_title} onChange={e => set('seo_title', e.target.value)} /></Field></div>
        <div className="sm:col-span-2"><Field label="SEO description (optional)"><textarea rows={2} className="input-base" value={p.seo_description} onChange={e => set('seo_description', e.target.value)} /></Field></div>
        <div className="sm:col-span-2"><Field label="Size guide (JSON, optional)" hint='e.g. {"unit":"cm","columns":["Size","Chest","Length"],"rows":[["S","51","71"]]} — from the supplier size chart only'><textarea rows={4} className="input-base font-mono text-xs" value={guide} onChange={e => setGuide(e.target.value)} /></Field></div>
        <div className="sm:col-span-2"><Field label="Internal notes"><textarea rows={2} className="input-base" value={p.admin_notes} onChange={e => set('admin_notes', e.target.value)} /></Field></div>
      </section>

      <div className="flex items-center justify-between">
        <button type="button" onClick={save} disabled={saving} className="btn-primary px-8 py-3">{saving ? 'Saving…' : 'Save product'}</button>
        {product && <button type="button" onClick={remove} className="text-xs text-stone-subtle hover:text-red-400">Delete product</button>}
      </div>
    </div>
  )
}
