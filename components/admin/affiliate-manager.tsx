'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Plus, X } from 'lucide-react'
import {
  AFFILIATE_CATEGORIES,
  AFFILIATE_PAGE_TYPES,
  AFFILIATE_PROVIDER_IDS,
  AFFILIATE_PROVIDERS,
  affiliateUrlWarning,
  getAffiliateProvider,
  validateAffiliateUrl,
  type AffiliatePageType,
} from '@/lib/affiliates/providers'
import type { AffiliatePlacement, AffiliateProduct, AffiliateProductClickStats } from '@/lib/types/database'

type FormState = {
  slug: string
  provider: string
  title: string
  creator: string
  description: string
  destination_url: string
  affiliate_url: string
  link_text: string
  image_url: string
  category: string
  active: boolean
  disclosure_required: boolean
  admin_notes: string
}

const EMPTY: FormState = {
  slug: '', provider: 'amazon', title: '', creator: '', description: '', destination_url: '',
  affiliate_url: '', link_text: '', image_url: '', category: 'book', active: false,
  disclosure_required: true, admin_notes: '',
}

function toForm(p: AffiliateProduct): FormState {
  return {
    slug: p.slug, provider: p.provider, title: p.title, creator: p.creator ?? '',
    description: p.description ?? '', destination_url: p.destination_url ?? '',
    affiliate_url: p.affiliate_url ?? '', link_text: p.link_text ?? '', image_url: p.image_url ?? '',
    category: p.category ?? '', active: p.active, disclosure_required: p.disclosure_required,
    admin_notes: p.admin_notes ?? '',
  }
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function pageHref(type: string, key: string) {
  return `${AFFILIATE_PAGE_TYPES.find(t => t.value === type)?.pathPrefix ?? '/'}${key}`
}

interface Props {
  products: AffiliateProduct[]
  placements: AffiliatePlacement[]
  stats: AffiliateProductClickStats[]
}

export function AffiliateManager({ products, placements, stats }: Props) {
  const [editing, setEditing] = useState<string | 'new' | null>(null)
  const statsById = new Map(stats.map(s => [s.product_id, s]))

  return (
    <div>
      <div className="flex justify-end mb-4">
        {editing !== 'new' && (
          <button type="button" onClick={() => setEditing('new')} className="btn-primary">
            <Plus size={15} /> Add product
          </button>
        )}
      </div>

      {editing === 'new' && (
        <div className="card p-6 mb-6">
          <h2 className="font-serif text-lg text-stone mb-4">New affiliate product</h2>
          <ProductForm onDone={() => setEditing(null)} />
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              {['Product', 'Provider', 'Status', 'Pages', 'Clicks (30d / all)', ''].map((h, i) => (
                <th key={i} className="text-left px-4 py-3 text-stone-subtle text-xs font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {products.map(p => {
              const s = statsById.get(p.id)
              const productPlacements = placements.filter(pl => pl.product_id === p.id)
              const live = p.active && Boolean(p.affiliate_url)
              return (
                <ProductRow
                  key={p.id}
                  product={p}
                  placements={productPlacements}
                  live={live}
                  clicks30={s?.clicks_30d ?? 0}
                  clicksAll={s?.total_clicks ?? 0}
                  open={editing === p.id}
                  onToggle={() => setEditing(editing === p.id ? null : p.id)}
                />
              )
            })}
            {products.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-stone-subtle text-sm">
                  No affiliate products yet. Use “Add product” and paste the link from your Associates account.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ProductRow({ product, placements, live, clicks30, clicksAll, open, onToggle }: {
  product: AffiliateProduct
  placements: AffiliatePlacement[]
  live: boolean
  clicks30: number
  clicksAll: number
  open: boolean
  onToggle: () => void
}) {
  const status = live ? 'Live' : product.active ? 'On — no URL' : 'Off'
  const statusClass = live ? 'bg-emerald-900/40 text-emerald-400' : product.active ? 'bg-amber-900/40 text-amber-400' : 'bg-white/5 text-stone-subtle'

  return (
    <>
      <tr className="hover:bg-white/[0.02] transition-colors align-top">
        <td className="px-4 py-3">
          <p className="text-stone text-sm">{product.title}{product.creator && <span className="text-stone-subtle"> — {product.creator}</span>}</p>
          <p className="text-stone-subtle text-xs font-mono">{product.slug}</p>
        </td>
        <td className="px-4 py-3 text-stone-muted text-xs">{getAffiliateProvider(product.provider)?.name ?? product.provider}</td>
        <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${statusClass}`}>{status}</span></td>
        <td className="px-4 py-3 text-xs text-stone-muted">
          {placements.length === 0 ? <span className="text-stone-subtle">None</span> : placements.map(pl => (
            <a key={pl.id} href={pageHref(pl.page_type, pl.page_key)} target="_blank" rel="noopener noreferrer" className="block hover:text-stone">
              {pageHref(pl.page_type, pl.page_key)}
            </a>
          ))}
        </td>
        <td className="px-4 py-3 text-stone text-xs tabular-nums">{clicks30} / {clicksAll}</td>
        <td className="px-4 py-3 text-right">
          <button type="button" onClick={onToggle} className="text-xs text-crimson hover:underline">{open ? 'Close' : 'Edit'}</button>
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={6} className="px-4 pb-6 pt-2 bg-white/[0.01]">
            <ProductForm product={product} onDone={onToggle} />
            <PlacementsEditor productId={product.id} placements={placements} />
          </td>
        </tr>
      )}
    </>
  )
}

function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-stone-muted mb-1">{label}</span>
      {children}
      {hint && !error && <span className="block text-2xs text-stone-subtle mt-1">{hint}</span>}
      {error && <span className="block text-2xs text-crimson mt-1">{error}</span>}
    </label>
  )
}

function ProductForm({ product, onDone }: { product?: AffiliateProduct; onDone: () => void }) {
  const router = useRouter()
  const [form, setForm] = useState<FormState>(product ? toForm(product) : EMPTY)
  const [slugTouched, setSlugTouched] = useState(Boolean(product))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm(f => ({ ...f, [key]: value }))
  const provider = getAffiliateProvider(form.provider)
  const urlError = form.affiliate_url ? validateAffiliateUrl(form.provider, form.affiliate_url.trim()) : null
  const urlWarning = form.affiliate_url && !urlError ? affiliateUrlWarning(form.provider, form.affiliate_url.trim()) : null

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setErrors({})
    try {
      const res = await fetch(product ? `/api/admin/affiliates/${product.id}` : '/api/admin/affiliates', {
        method: product ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, category: form.category || null }),
      })
      const data = await res.json()
      if (!res.ok) {
        const fieldErrors: Record<string, string> = {}
        for (const [k, v] of Object.entries(data.fieldErrors ?? {})) fieldErrors[k] = (v as string[])[0]
        setErrors(fieldErrors)
        throw new Error(data.error ?? 'Save failed')
      }
      toast.success(product ? 'Saved' : 'Product added')
      router.refresh()
      if (!product) onDone()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!product) return
    if (!window.confirm(`Delete “${product.title}”? It will be removed from every page. Click history is kept.`)) return
    const res = await fetch(`/api/admin/affiliates/${product.id}`, { method: 'DELETE' })
    if (!res.ok) return toast.error((await res.json()).error ?? 'Delete failed')
    toast.success('Deleted')
    router.refresh()
    onDone()
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Title" error={errors.title}>
          <input className="input-base" value={form.title} required onChange={e => {
            set('title', e.target.value)
            if (!slugTouched) set('slug', slugify(e.target.value))
          }} />
        </Field>
        <Field label="Author / creator (optional)" error={errors.creator}>
          <input className="input-base" value={form.creator} onChange={e => set('creator', e.target.value)} placeholder="e.g. Vincent Bugliosi" />
        </Field>
        <Field label="Provider" error={errors.provider}>
          <select className="input-base" value={form.provider} onChange={e => set('provider', e.target.value)}>
            {AFFILIATE_PROVIDER_IDS.map(id => <option key={id} value={id}>{AFFILIATE_PROVIDERS[id].name}</option>)}
          </select>
        </Field>
        <Field label="Category" error={errors.category}>
          <select className="input-base" value={form.category} onChange={e => set('category', e.target.value)}>
            <option value="">—</option>
            {AFFILIATE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </Field>
      </div>

      <Field
        label="Affiliate URL"
        hint="Paste the link from your Associates account exactly as given. It is used unchanged."
        error={errors.affiliate_url ?? urlError ?? undefined}
      >
        <input className="input-base font-mono text-xs" value={form.affiliate_url} onChange={e => set('affiliate_url', e.target.value)} placeholder="https://" spellCheck={false} />
      </Field>
      {urlWarning && <p className="text-2xs text-amber-400 -mt-2">{urlWarning}</p>}

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Link text (optional)" hint={`Defaults to “${provider?.defaultLinkText ?? ''}”`} error={errors.link_text}>
          <input className="input-base" value={form.link_text} onChange={e => set('link_text', e.target.value)} />
        </Field>
        <Field label="Slug" hint="Used in articles: <AffiliateProduct slug=&quot;…&quot; />" error={errors.slug}>
          <input className="input-base font-mono text-xs" value={form.slug} onChange={e => { setSlugTouched(true); set('slug', e.target.value) }} />
        </Field>
      </div>

      <Field label="Description (optional)" hint="One or two factual sentences. Don't imply we've reviewed it unless we have." error={errors.description}>
        <textarea className="input-base" rows={2} value={form.description} onChange={e => set('description', e.target.value)} />
      </Field>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Plain product URL (optional, reference only)" hint="Never shown or linked on the site." error={errors.destination_url}>
          <input className="input-base font-mono text-xs" value={form.destination_url} onChange={e => set('destination_url', e.target.value)} placeholder="https://" />
        </Field>
        <Field label="Image URL (optional)" hint="Amazon: only use an image link from SiteStripe or the Product Advertising API." error={errors.image_url}>
          <input className="input-base font-mono text-xs" value={form.image_url} onChange={e => set('image_url', e.target.value)} placeholder="https://" />
        </Field>
      </div>

      <Field label="Private notes (optional)" error={errors.admin_notes}>
        <textarea className="input-base" rows={2} value={form.admin_notes} onChange={e => set('admin_notes', e.target.value)} />
      </Field>

      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-2 text-sm text-stone-muted">
          <input type="checkbox" checked={form.active} onChange={e => set('active', e.target.checked)} />
          Live on the site
        </label>
        <label className="flex items-center gap-2 text-sm text-stone-muted">
          <input type="checkbox" checked={form.disclosure_required} onChange={e => set('disclosure_required', e.target.checked)} />
          Show affiliate disclosure
        </label>
      </div>
      {errors.active && <p className="text-2xs text-crimson">{errors.active}</p>}

      <div className="flex items-center gap-3 pt-2">
        <button type="submit" disabled={saving || Boolean(urlError)} className="btn-primary">{saving ? 'Saving…' : product ? 'Save changes' : 'Add product'}</button>
        <button type="button" onClick={onDone} className="btn-ghost">Cancel</button>
        {product && <button type="button" onClick={remove} className="ml-auto text-xs text-stone-subtle hover:text-crimson">Delete product</button>}
      </div>
    </form>
  )
}

function PlacementsEditor({ productId, placements }: { productId: string; placements: AffiliatePlacement[] }) {
  const router = useRouter()
  const [pageType, setPageType] = useState<AffiliatePageType>('blog')
  const [pageKey, setPageKey] = useState('')
  const [busy, setBusy] = useState(false)

  async function add(e: React.FormEvent) {
    e.preventDefault()
    // Accept a pasted full URL or path as well as a bare slug
    const key = pageKey.trim().replace(/[?#].*$/, '').replace(/\/+$/, '').split('/').pop() ?? ''
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/affiliates/${productId}/placements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page_type: pageType, page_key: key, position: placements.length }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.fieldErrors?.page_key?.[0] ?? data.error ?? 'Could not add page')
      setPageKey('')
      toast.success('Added to page')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not add page')
    } finally {
      setBusy(false)
    }
  }

  async function removePlacement(id: string) {
    const res = await fetch(`/api/admin/affiliates/${productId}/placements?placement=${id}`, { method: 'DELETE' })
    if (!res.ok) return toast.error('Could not remove')
    toast.success('Removed from page')
    router.refresh()
  }

  return (
    <div className="mt-8 pt-6 border-t border-white/[0.06]">
      <h3 className="text-sm font-medium text-stone mb-1">Pages showing this product</h3>
      <p className="text-2xs text-stone-subtle mb-3">
        Articles show it in a “Further reading and listening” section after the article; podcast and case pages show
        it in the sidebar. To place it within an article&apos;s text instead, add{' '}
        <code className="text-crimson">&lt;AffiliateProduct slug=&quot;…&quot; /&gt;</code> to the MDX.
      </p>
      <ul className="space-y-1.5 mb-4">
        {placements.map(pl => (
          <li key={pl.id} className="flex items-center gap-2 text-xs text-stone-muted">
            <a href={pageHref(pl.page_type, pl.page_key)} target="_blank" rel="noopener noreferrer" className="hover:text-stone">
              {pageHref(pl.page_type, pl.page_key)}
            </a>
            <button type="button" onClick={() => removePlacement(pl.id)} aria-label={`Remove from ${pl.page_key}`} className="text-stone-subtle hover:text-crimson">
              <X size={13} />
            </button>
          </li>
        ))}
        {placements.length === 0 && <li className="text-xs text-stone-subtle">Not on any pages yet.</li>}
      </ul>
      <form onSubmit={add} className="flex flex-wrap gap-2 items-end">
        <label className="block">
          <span className="sr-only">Page type</span>
          <select className="input-base !w-auto" value={pageType} onChange={e => setPageType(e.target.value as AffiliatePageType)}>
            {AFFILIATE_PAGE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </label>
        <label className="block flex-1 min-w-[220px]">
          <span className="sr-only">Page slug</span>
          <input className="input-base font-mono text-xs" value={pageKey} onChange={e => setPageKey(e.target.value)} placeholder="slug or URL, e.g. madeleine-mccann-timeline" required />
        </label>
        <button type="submit" disabled={busy} className="btn-outline">Add to page</button>
      </form>
    </div>
  )
}
