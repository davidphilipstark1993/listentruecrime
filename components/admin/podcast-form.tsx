'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { slugify } from '@/lib/utils'
import { COUNTRIES, PLATFORMS } from '@/lib/types/database'
import { findSimilarSlugs } from '@/lib/slug-similarity'
import { cleanPlatformUrls, isHttpUrl } from '@/lib/platform-urls'
import toast from 'react-hot-toast'

const CASE_TYPES_LIST = [
  'Cold Case', 'Missing Person', 'Murder', 'Serial Killer', 'Courtroom',
  'Wrongful Conviction', 'Fraud', 'White-Collar Crime', 'Investigative',
  'Systemic Injustice', 'Historical Crime', 'Organised Crime',
]

interface PodcastFormProps {
  podcast?: Record<string, any>
}

export function PodcastForm({ podcast }: PodcastFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    title: podcast?.title ?? '',
    slug: podcast?.slug ?? '',
    description: podcast?.description ?? '',
    short_description: podcast?.short_description ?? '',
    newsletter_worthy_summary: podcast?.newsletter_worthy_summary ?? '',
    case_types: (podcast?.case_types ?? []) as string[],
    country: podcast?.country ?? '',
    format_type: podcast?.format_type ?? '',
    host_name: podcast?.host_name ?? '',
    host_bio: podcast?.host_bio ?? '',
    host_style: podcast?.host_style ?? '',
    factual_style: podcast?.factual_style ?? '',
    episode_length: podcast?.episode_length ?? '',
    episode_count: podcast?.episode_count ?? '',
    binge_factor: podcast?.binge_factor?.toString() ?? '',
    best_episode_to_start: podcast?.best_episode_to_start ?? '',
    if_you_liked_this: podcast?.if_you_liked_this?.join(', ') ?? '',
    quick_verdict: podcast?.quick_verdict ?? '',
    platforms: (podcast?.platforms ?? []) as string[],
    image_url: podcast?.image_url ?? '',
    website_url: podcast?.website_url ?? '',
    producer: podcast?.producer ?? '',
    rating: podcast?.rating?.toString() ?? '',
    rating_is_provisional: podcast?.rating_is_provisional ?? false,
    platform_urls: cleanPlatformUrls(podcast?.platform_urls) as Record<string, string>,
    country_name: podcast?.country_name ?? '',
    seo_title: podcast?.seo_title ?? '',
    meta_description: podcast?.meta_description ?? '',
    og_title: podcast?.og_title ?? '',
    og_description: podcast?.og_description ?? '',
    canonical_url: podcast?.canonical_url ?? '',
    noindex: podcast?.noindex ?? false,
    is_published: podcast?.is_published ?? false,
    is_featured: podcast?.is_featured ?? false,
  })

  const set = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }))

  // The slug follows the title only until the editor edits it by hand; after
  // that it is never overwritten or appended to. Existing podcasts start locked
  // because changing a live slug breaks its URL.
  const [slugEdited, setSlugEdited] = useState(Boolean(podcast))
  const onTitleChange = (title: string) => {
    setForm(prev => ({ ...prev, title, ...(slugEdited ? {} : { slug: slugify(title) }) }))
  }
  const onSlugChange = (slug: string) => {
    setSlugEdited(true)
    set('slug', slug)
  }

  const [existingSlugs, setExistingSlugs] = useState<string[]>([])
  useEffect(() => {
    supabase.from('podcasts').select('slug').then(({ data }) => {
      setExistingSlugs((data ?? []).map((r: { slug: string }) => r.slug))
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const similarSlugs = useMemo(
    () => (podcast && form.slug === podcast.slug ? [] : findSimilarSlugs(form.slug, existingSlugs)),
    [form.slug, existingSlugs, podcast],
  )
  const slugTaken = existingSlugs.includes(form.slug) && form.slug !== podcast?.slug

  const toggleArrayItem = (key: 'case_types' | 'platforms', value: string) => {
    setForm(prev => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter((v: string) => v !== value)
        : [...prev[key], value],
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title || !form.slug) { toast.error('Title and slug are required'); return }
    if (slugTaken) { toast.error('That slug is already used by another podcast'); return }
    const badUrl = Object.entries(form.platform_urls).find(([, u]) => u.trim() && !isHttpUrl(u))
    if (badUrl) { toast.error(`${badUrl[0]} URL must start with https://`); return }
    if (form.rating && (Number(form.rating) < 0 || Number(form.rating) > 10)) { toast.error('Rating must be between 0 and 10'); return }
    if (form.canonical_url && !isHttpUrl(form.canonical_url)) { toast.error('Canonical must be a full https:// URL'); return }

    setSaving(true)
    const payload = {
      ...form,
      binge_factor: form.binge_factor ? parseFloat(form.binge_factor) : null,
      // Empty text becomes NULL ("not entered"), never an empty-string claim.
      producer: form.producer.trim() || null,
      rating: form.rating ? parseFloat(form.rating) : null,
      // A provisional flag without a rating is meaningless
      rating_is_provisional: form.rating ? form.rating_is_provisional : false,
      country_name: form.country_name.trim() || null,
      seo_title: form.seo_title.trim() || null,
      meta_description: form.meta_description.trim() || null,
      og_title: form.og_title.trim() || null,
      og_description: form.og_description.trim() || null,
      canonical_url: form.canonical_url.trim() || null,
      website_url: form.website_url.trim() || null,
      // Only URLs for ticked platforms are kept
      platform_urls: Object.fromEntries(
        Object.entries(form.platform_urls)
          .filter(([name, url]) => form.platforms.includes(name) && url.trim())
          .map(([name, url]) => [name, url.trim()]),
      ),
      if_you_liked_this: form.if_you_liked_this.split(',').map(s => s.trim()).filter(Boolean),
      // A hand-entered image is an admin decision — flag it the same way the
      // manual artwork endpoint does so automated recovery never replaces it.
      ...(form.image_url.trim() && form.image_url !== (podcast?.image_url ?? '')
        ? {
            artwork_source: 'manual',
            artwork_status: 'verified',
            artwork_manual_override: true,
            artwork_verified_at: new Date().toISOString(),
            artwork_candidate: null,
          }
        : {}),
    }

    const { error } = podcast
      ? await supabase.from('podcasts').update(payload).eq('id', podcast.id)
      : await supabase.from('podcasts').insert(payload)

    if (!error) {
      // Bust the ISR cache so the change is visible on the live site now,
      // not up to an hour later.
      await fetch('/api/admin/revalidate', { method: 'POST' }).catch(() => {})
    }

    setSaving(false)
    if (error) {
      toast.error(error.message)
    } else {
      toast.success(podcast ? 'Podcast updated' : 'Podcast created')
      router.push('/admin/podcasts')
      router.refresh()
    }
  }

  const inputClass = 'input-base text-sm'
  const labelClass = 'block text-xs text-stone-subtle mb-1.5'
  const sectionClass = 'grid sm:grid-cols-2 gap-4'

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-3xl">
      {/* Core */}
      <div className="card p-6 space-y-4">
        <h2 className="font-serif text-stone text-base mb-1">Core details</h2>
        <div>
          <label className={labelClass}>Title *</label>
          <input className={inputClass} value={form.title} onChange={e => onTitleChange(e.target.value)} required />
        </div>
        <div>
          <label className={labelClass}>Slug *</label>
          <input className={inputClass} value={form.slug} onChange={e => onSlugChange(e.target.value)} required />
          {slugTaken && <p className="text-xs text-crimson mt-1.5">This slug is already used by another podcast.</p>}
          {!slugTaken && similarSlugs.length > 0 && (
            <p className="text-xs text-amber-400 mt-1.5">
              Similar to existing: {similarSlugs.join(', ')}. Check this isn&apos;t a duplicate page before saving.
            </p>
          )}
        </div>
        <div>
          <label className={labelClass}>Description</label>
          <textarea className={inputClass} rows={4} value={form.description} onChange={e => set('description', e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Short description (for you if you liked…)</label>
          <input className={inputClass} value={form.short_description} onChange={e => set('short_description', e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Newsletter summary</label>
          <textarea className={inputClass} rows={2} value={form.newsletter_worthy_summary} onChange={e => set('newsletter_worthy_summary', e.target.value)} />
        </div>
      </div>

      {/* Classification */}
      <div className="card p-6 space-y-4">
        <h2 className="font-serif text-stone text-base mb-1">Classification</h2>
        <div>
          <label className={labelClass}>Case types</label>
          <div className="flex flex-wrap gap-1.5">
            {CASE_TYPES_LIST.map(t => (
              <button
                key={t}
                type="button"
                onClick={() => toggleArrayItem('case_types', t)}
                className={`tag cursor-pointer transition-colors text-xs ${form.case_types.includes(t) ? 'tag-crimson' : ''}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className={sectionClass}>
          <div>
            <label className={labelClass}>Country</label>
            <select className={inputClass} value={form.country} onChange={e => set('country', e.target.value)}>
              <option value="">Select country</option>
              {Object.entries(COUNTRIES).map(([code, name]) => (
                <option key={code} value={code}>{name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Country name (shown on the page; leave blank if unknown)</label>
            <input className={inputClass} value={form.country_name} onChange={e => set('country_name', e.target.value)} placeholder="e.g. Germany" />
          </div>
          <div>
            <label className={labelClass}>Format</label>
            <select className={inputClass} value={form.format_type} onChange={e => set('format_type', e.target.value)}>
              <option value="">Select format</option>
              {['Serialized', 'Episodic', 'Both'].map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Host name</label>
            <input className={inputClass} value={form.host_name} onChange={e => set('host_name', e.target.value)} placeholder="e.g. Sarah Koenig, or Casey (anonymous)" />
          </div>
          <div>
            <label className={labelClass}>Producer</label>
            <input className={inputClass} value={form.producer} onChange={e => set('producer', e.target.value)} placeholder="e.g. Serial Productions" />
          </div>
          <div>
            <label className={labelClass}>Host style</label>
            <input className={inputClass} value={form.host_style} onChange={e => set('host_style', e.target.value)} placeholder="Single Host, Dual Host, Panel…" />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Host bio (1–3 sentences)</label>
            <textarea className={inputClass} rows={2} value={form.host_bio} onChange={e => set('host_bio', e.target.value)} placeholder="Short description of the host's background, style, and approach…" />
          </div>
          <div>
            <label className={labelClass}>Factual style</label>
            <input className={inputClass} value={form.factual_style} onChange={e => set('factual_style', e.target.value)} placeholder="Narrative, Documentary…" />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="card p-6 space-y-4">
        <h2 className="font-serif text-stone text-base mb-1">Stats & episodes</h2>
        <div className={sectionClass}>
          <div>
            <label className={labelClass}>Binge factor (1–10)</label>
            <input type="number" min={1} max={10} step={0.1} className={inputClass} value={form.binge_factor} onChange={e => set('binge_factor', e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Rating (0–10, leave blank for none)</label>
            <input type="number" min={0} max={10} step={0.1} className={inputClass} value={form.rating} onChange={e => set('rating', e.target.value)} />
            <label className="flex items-center gap-2 mt-2 cursor-pointer">
              <input type="checkbox" checked={form.rating_is_provisional} disabled={!form.rating} onChange={e => set('rating_is_provisional', e.target.checked)} className="accent-crimson w-4 h-4" />
              <span className="text-xs text-stone-muted">Provisional (shown as provisional on the page)</span>
            </label>
          </div>
          <div>
            <label className={labelClass}>Episode length</label>
            <input className={inputClass} value={form.episode_length} onChange={e => set('episode_length', e.target.value)} placeholder="45–60 min" />
          </div>
          <div>
            <label className={labelClass}>Episode count</label>
            <input className={inputClass} value={form.episode_count} onChange={e => set('episode_count', e.target.value)} placeholder="8 episodes" />
          </div>
          <div>
            <label className={labelClass}>Best episode to start</label>
            <input className={inputClass} value={form.best_episode_to_start} onChange={e => set('best_episode_to_start', e.target.value)} placeholder="Episode 1" />
          </div>
        </div>
        <div>
          <label className={labelClass}>If you liked this try (comma-separated slugs)</label>
          <input className={inputClass} value={form.if_you_liked_this} onChange={e => set('if_you_liked_this', e.target.value)} placeholder="serial, crime-junkie" />
        </div>
        <div>
          <label className={labelClass}>Quick verdict</label>
          <select className={inputClass} value={form.quick_verdict} onChange={e => set('quick_verdict', e.target.value)}>
            <option value="">Select verdict</option>
            {['Must listen', 'Worth your time', 'For fans of the genre', 'Skip it'].map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
      </div>

      {/* Media & links */}
      <div className="card p-6 space-y-4">
        <h2 className="font-serif text-stone text-base mb-1">Media & links</h2>
        <div>
          <label className={labelClass}>Image URL</label>
          <input className={inputClass} value={form.image_url} onChange={e => set('image_url', e.target.value)} placeholder="https://…" />
        </div>
        <div>
          <label className={labelClass}>Website URL</label>
          <input className={inputClass} value={form.website_url} onChange={e => set('website_url', e.target.value)} placeholder="https://…" />
        </div>
        <div>
          <label className={labelClass}>Platforms</label>
          <div className="flex flex-wrap gap-1.5">
            {PLATFORMS.map(p => (
              <button
                key={p}
                type="button"
                onClick={() => toggleArrayItem('platforms', p)}
                className={`tag cursor-pointer text-xs ${form.platforms.includes(p) ? 'tag-crimson' : ''}`}
              >
                {p}
              </button>
            ))}
          </div>
          {form.platforms.length > 0 && (
            <div className="mt-3 space-y-2">
              <p className="text-xs text-stone-subtle">A platform only appears as available on the page once it has a URL.</p>
              {form.platforms.map(p => (
                <div key={p} className="grid grid-cols-[8rem_1fr] items-center gap-2">
                  <span className="text-xs text-stone-muted">{p}</span>
                  <input
                    className={inputClass}
                    value={form.platform_urls[p] ?? ''}
                    onChange={e => set('platform_urls', { ...form.platform_urls, [p]: e.target.value })}
                    placeholder="https://…"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* SEO */}
      <div className="card p-6 space-y-4">
        <h2 className="font-serif text-stone text-base mb-1">SEO</h2>
        <p className="text-xs text-stone-subtle">Leave blank to generate from the podcast&apos;s name, host, producer and format.</p>
        <div>
          <label className={labelClass}>SEO title tag</label>
          <input className={inputClass} value={form.seo_title} onChange={e => set('seo_title', e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Meta description</label>
          <textarea className={inputClass} rows={2} value={form.meta_description} onChange={e => set('meta_description', e.target.value)} />
        </div>
        <div className={sectionClass}>
          <div>
            <label className={labelClass}>Open Graph title</label>
            <input className={inputClass} value={form.og_title} onChange={e => set('og_title', e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Open Graph description</label>
            <input className={inputClass} value={form.og_description} onChange={e => set('og_description', e.target.value)} />
          </div>
        </div>
        <div>
          <label className={labelClass}>Canonical URL (blank = this page)</label>
          <input className={inputClass} value={form.canonical_url} onChange={e => set('canonical_url', e.target.value)} placeholder="https://www.listentruecrime.com/podcasts/…" />
        </div>
      </div>

      {/* Visibility */}
      <div className="card p-6 space-y-3">
        <h2 className="font-serif text-stone text-base mb-3">Visibility</h2>
        {[
          { key: 'is_published', label: 'Published (visible on site)' },
          { key: 'is_featured', label: 'Featured (shown in trending section)' },
          { key: 'noindex', label: 'Hide from search engines (noindex, and removed from the sitemap)' },
        ].map(item => (
          <label key={item.key} className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form[item.key as keyof typeof form] as boolean}
              onChange={e => set(item.key, e.target.checked)}
              className="accent-crimson w-4 h-4"
            />
            <span className="text-sm text-stone-muted">{item.label}</span>
          </label>
        ))}
      </div>

      <div className="flex items-center gap-4">
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Saving…' : (podcast ? 'Save changes' : 'Create podcast')}
        </button>
        <button type="button" onClick={() => router.back()} className="btn-ghost">Cancel</button>
      </div>
    </form>
  )
}
