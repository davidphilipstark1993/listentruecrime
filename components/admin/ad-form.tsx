'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { ImagePlus, Loader2 } from 'lucide-react'
import { AD_PLACEMENTS, RECOMMENDED_ASPECT, RECOMMENDED_SIZE_LABEL, getPlacement, type AdLayout } from '@/lib/ads/placements'
import { AD_IMAGE_LIMITS, AD_SOURCE_SITE, AD_UTM_MEDIUM, adImageUrl, isNetworkUrl } from '@/lib/ads/config'
import { buildTrackedUrl, slugifyCampaign } from '@/lib/ads/utm'
import type { Ad, PublicAd } from '@/lib/ads/types'

type FieldErrors = Record<string, string[] | undefined>

// ISO (UTC) <-> <input type="datetime-local"> in the admin's own timezone
function toLocalInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}
const fromLocalInput = (v: string): string | null => (v ? new Date(v).toISOString() : null)

const WIDTHS = [
  { label: 'Mobile', px: 375 },
  { label: 'Tablet', px: 768 },
  { label: 'Desktop', px: 1200 },
] as const

export function AdForm({ ad }: { ad?: Ad }) {
  const router = useRouter()
  const [title, setTitle] = useState(ad?.title ?? '')
  const [description, setDescription] = useState(ad?.description ?? '')
  const [url, setUrl] = useState(ad?.destination_url ?? '')
  const [buttonText, setButtonText] = useState(ad?.button_text ?? 'Discover more')
  const [alt, setAlt] = useState(ad?.image_alt ?? '')
  const [placements, setPlacements] = useState<string[]>(ad?.placements ?? [])
  const [order, setOrder] = useState(String(ad?.sort_order ?? 10))
  const [active, setActive] = useState(ad?.is_active ?? false)
  const [starts, setStarts] = useState(toLocalInput(ad?.starts_at ?? null))
  const [ends, setEnds] = useState(toLocalInput(ad?.ends_at ?? null))
  const [campaign, setCampaign] = useState(ad?.utm_campaign ?? '')
  const [image, setImage] = useState<{ path: string; width: number; height: number } | null>(
    ad ? { path: ad.image_path, width: ad.image_width, height: ad.image_height } : null
  )
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})
  const fileRef = useRef<HTMLInputElement>(null)

  const [previewPlacement, setPreviewPlacement] = useState<string>('')
  const [previewWidth, setPreviewWidth] = useState<number>(375)
  const [frameHeight, setFrameHeight] = useState(360)
  const [frameReady, setFrameReady] = useState(false)
  const frameRef = useRef<HTMLIFrameElement>(null)

  const activePreviewPlacement = placements.includes(previewPlacement) ? previewPlacement : placements[0] ?? 'homepage_promo'
  const layout: AdLayout = getPlacement(activePreviewPlacement)?.layout ?? 'card'

  const trackedUrl = useMemo(
    () => buildTrackedUrl(url, { source: AD_SOURCE_SITE, medium: AD_UTM_MEDIUM, campaign: campaign || slugifyCampaign(title || 'cross-promo'), content: activePreviewPlacement }),
    [url, campaign, title, activePreviewPlacement]
  )

  // Live preview: post the draft to the iframe (a real page, so breakpoints are accurate)
  const draft = useMemo(() => {
    if (!image) return null
    const publicAd: PublicAd = {
      id: ad?.id ?? 'preview',
      title: title || 'Your advert title',
      description: description || null,
      href: '#',
      rel: isNetworkUrl(url) ? 'noopener' : 'sponsored noopener',
      buttonText: buttonText || 'Discover more',
      imageUrl: adImageUrl(image.path),
      imageAlt: alt,
      width: image.width,
      height: image.height,
      startsAt: null,
      endsAt: null,
      visibleAtRender: true,
    }
    return { ad: publicAd, layout, placement: activePreviewPlacement }
  }, [ad?.id, image, title, description, url, buttonText, alt, layout, activePreviewPlacement])

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return
      if (e.data?.type === 'ad-preview-ready') setFrameReady(true)
      if (e.data?.type === 'ad-preview-height') setFrameHeight(Math.max(120, Math.ceil(e.data.height)))
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])
  useEffect(() => {
    if (frameReady && draft) frameRef.current?.contentWindow?.postMessage({ type: 'ad-preview-draft', draft }, window.location.origin)
  }, [frameReady, draft])

  const ratio = image ? image.width / image.height : null
  const offRatio = ratio !== null && Math.abs(ratio - RECOMMENDED_ASPECT) > 0.08

  async function upload(file: File) {
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    try {
      const res = await fetch('/api/admin/ads/upload', { method: 'POST', body: fd })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg = res.status === 413 ? `That image is too large. The limit is ${AD_IMAGE_LIMITS.maxBytes / 1024 / 1024} MB.` : json.error ?? 'Upload failed'
        setErrors(e => ({ ...e, image_path: [msg] }))
        toast.error(msg)
        return
      }
      setImage({ path: json.path, width: json.width, height: json.height })
      setErrors(e => ({ ...e, image_path: undefined }))
      toast.success('Image uploaded')
    } catch {
      toast.error('Upload failed. Check your connection and try again.')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function togglePlacement(key: string) {
    setPlacements(p => (p.includes(key) ? p.filter(k => k !== key) : [...p, key]))
  }

  async function save() {
    setSaving(true)
    setErrors({})
    const payload = {
      title,
      description: description || null,
      destination_url: url,
      button_text: buttonText,
      image_path: image?.path ?? '',
      image_alt: alt || null,
      image_width: image?.width ?? 0,
      image_height: image?.height ?? 0,
      placements,
      sort_order: Number(order) || 0,
      is_active: active,
      starts_at: fromLocalInput(starts),
      ends_at: fromLocalInput(ends),
      utm_campaign: campaign || null,
    }
    try {
      const res = await fetch(ad ? `/api/admin/ads/${ad.id}` : '/api/admin/ads', {
        method: ad ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setErrors(json.fieldErrors ?? {})
        toast.error(json.error ?? 'Could not save')
        return
      }
      toast.success(ad ? 'Advert saved' : 'Advert created')
      router.push('/admin/ads')
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  const err = (k: string) => errors[k]?.[0] && <p className="text-xs text-crimson mt-1">{errors[k]![0]}</p>
  const label = 'block text-xs font-medium text-stone-muted mb-1.5'

  return (
    <div className="grid xl:grid-cols-[minmax(0,1fr)_minmax(0,560px)] gap-8 items-start">
      <div className="space-y-6">
        {/* IMAGE */}
        <section className="card p-5">
          <h2 className="text-sm font-medium text-stone mb-1">Image</h2>
          <p className="text-xs text-stone-subtle mb-4">
            Recommended: {RECOMMENDED_SIZE_LABEL}. JPEG, PNG or WebP, up to {AD_IMAGE_LIMITS.maxBytes / 1024 / 1024} MB, at least {AD_IMAGE_LIMITS.minWidth} px wide.
          </p>
          <div className="flex items-center gap-4">
            {image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={adImageUrl(image.path)} alt="" className="h-20 w-auto max-w-[220px] rounded-md border border-white/10 object-cover" />
            )}
            <div>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" id="ad-image" onChange={e => e.target.files?.[0] && upload(e.target.files[0])} />
              <label htmlFor="ad-image" className="btn-outline cursor-pointer">
                {uploading ? <Loader2 size={15} className="animate-spin" /> : <ImagePlus size={15} />}
                {uploading ? 'Uploading…' : image ? 'Replace image' : 'Choose image'}
              </label>
              {image && <p className="text-xs text-stone-subtle mt-2">{image.width} × {image.height} px</p>}
            </div>
          </div>
          {offRatio && (
            <p className="text-xs text-gold-light mt-3">This isn&apos;t 16:9 landscape. It will work, but may be cropped slightly in some placements. Check the preview.</p>
          )}
          {err('image_path')}
          <label className={`${label} mt-4`} htmlFor="ad-alt">Alternative text (optional)</label>
          <input id="ad-alt" className="input-base" value={alt} onChange={e => setAlt(e.target.value)} maxLength={200} placeholder="Describes the image for screen readers. Leave blank if it only repeats the title." />
          {err('image_alt')}
        </section>

        {/* CONTENT */}
        <section className="card p-5 space-y-4">
          <h2 className="text-sm font-medium text-stone">Content</h2>
          <div>
            <label className={label} htmlFor="ad-title">Title</label>
            <input id="ad-title" className="input-base" value={title} onChange={e => setTitle(e.target.value)} maxLength={80} placeholder="Find a soft play near you" />
            {err('title')}
          </div>
          <div>
            <label className={label} htmlFor="ad-desc">Short description <span className="text-stone-subtle">({description.length}/220)</span></label>
            <textarea id="ad-desc" className="input-base min-h-[84px]" value={description} onChange={e => setDescription(e.target.value)} maxLength={220} placeholder="One or two sentences. It should read like a recommendation." />
            {err('description')}
          </div>
          <div>
            <label className={label} htmlFor="ad-url">Destination link</label>
            <input id="ad-url" type="url" className="input-base" value={url} onChange={e => setUrl(e.target.value.trim())} placeholder="https://softplaynearme.co.uk" />
            {err('destination_url')}
            {url && trackedUrl !== url && (
              <p className="text-2xs text-stone-subtle mt-1.5 break-all">Visitors will be sent to: <span className="text-stone-muted">{trackedUrl}</span></p>
            )}
          </div>
          <div>
            <label className={label} htmlFor="ad-btn">Button text</label>
            <input id="ad-btn" className="input-base" value={buttonText} onChange={e => setButtonText(e.target.value)} maxLength={30} />
            {err('button_text')}
          </div>
        </section>

        {/* PLACEMENT */}
        <section className="card p-5">
          <h2 className="text-sm font-medium text-stone mb-1">Where it appears</h2>
          <p className="text-xs text-stone-subtle mb-4">Choose one or more. Each spot only ever shows a small number of adverts.</p>
          <div className="space-y-3">
            {AD_PLACEMENTS.map(p => (
              <label key={p.key} className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" className="mt-1 accent-[#be123c]" checked={placements.includes(p.key)} onChange={() => togglePlacement(p.key)} />
                <span>
                  <span className="block text-sm text-stone">{p.label}</span>
                  <span className="block text-xs text-stone-subtle">{p.where}</span>
                </span>
              </label>
            ))}
          </div>
          {err('placements')}
        </section>

        {/* PUBLISHING */}
        <section className="card p-5 space-y-4">
          <h2 className="text-sm font-medium text-stone">Publishing</h2>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" className="accent-[#be123c] w-4 h-4" checked={active} onChange={e => setActive(e.target.checked)} />
            <span className="text-sm text-stone">Active <span className="text-stone-subtle">(untick to keep it as a draft)</span></span>
          </label>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={label} htmlFor="ad-start">Start (optional)</label>
              <input id="ad-start" type="datetime-local" className="input-base" value={starts} onChange={e => setStarts(e.target.value)} />
              <p className="text-2xs text-stone-subtle mt-1">Blank = starts as soon as it&apos;s active. Your local time.</p>
              {err('starts_at')}
            </div>
            <div>
              <label className={label} htmlFor="ad-end">End (optional)</label>
              <input id="ad-end" type="datetime-local" className="input-base" value={ends} onChange={e => setEnds(e.target.value)} />
              <p className="text-2xs text-stone-subtle mt-1">Blank = runs until you switch it off.</p>
              {err('ends_at')}
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={label} htmlFor="ad-order">Display order</label>
              <input id="ad-order" type="number" min={0} max={999} className="input-base" value={order} onChange={e => setOrder(e.target.value)} />
              <p className="text-2xs text-stone-subtle mt-1">Lower numbers are shown first when several adverts share a spot.</p>
              {err('sort_order')}
            </div>
            <div>
              <label className={label} htmlFor="ad-utm">Campaign name (optional)</label>
              <input id="ad-utm" className="input-base" value={campaign} onChange={e => setCampaign(e.target.value.toLowerCase())} placeholder={slugifyCampaign(title || 'cross-promo')} />
              <p className="text-2xs text-stone-subtle mt-1">Used as utm_campaign. Defaults to the title.</p>
              {err('utm_campaign')}
            </div>
          </div>
        </section>

        <div className="flex items-center gap-3">
          <button onClick={save} disabled={saving || uploading} className="btn-primary px-6">
            {saving && <Loader2 size={15} className="animate-spin" />} {ad ? 'Save changes' : 'Create advert'}
          </button>
          <Link href="/admin/ads" className="btn-ghost">Cancel</Link>
        </div>
      </div>

      {/* PREVIEW */}
      <aside className="xl:sticky xl:top-6 space-y-3">
        <h2 className="text-sm font-medium text-stone">Preview</h2>
        <div className="flex flex-wrap gap-2">
          {WIDTHS.map(w => (
            <button key={w.px} type="button" onClick={() => setPreviewWidth(w.px)}
              className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${previewWidth === w.px ? 'border-crimson/50 text-stone bg-crimson/10' : 'border-white/10 text-stone-muted hover:text-stone'}`}>
              {w.label}
            </button>
          ))}
          {placements.length > 1 && (
            <select aria-label="Preview placement" className="input-base !w-auto !py-1.5 !text-xs" value={activePreviewPlacement} onChange={e => setPreviewPlacement(e.target.value)}>
              {placements.map(k => <option key={k} value={k}>{getPlacement(k)?.label}</option>)}
            </select>
          )}
        </div>
        <div className="rounded-xl border border-white/[0.08] bg-ink-950 overflow-auto">
          <iframe
            ref={frameRef}
            src="/ad-preview"
            title="Advert preview"
            style={{ width: previewWidth, maxWidth: '100%', height: frameHeight, border: 0, display: 'block', margin: '0 auto' }}
          />
        </div>
        <p className="text-2xs text-stone-subtle">
          Shown as it will appear in &ldquo;{getPlacement(activePreviewPlacement)?.label}&rdquo;. The preview isn&apos;t tracked and its button doesn&apos;t navigate.
        </p>
      </aside>
    </div>
  )
}
