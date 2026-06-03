'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { slugify } from '@/lib/utils'
import { COUNTRIES, PLATFORMS } from '@/lib/types/database'
import toast from 'react-hot-toast'

const CASE_TYPES_LIST = [
  'Murder', 'Cold Case', 'Missing Person', 'Serial Killer', 'Fraud',
  'Systemic Injustice', 'Courtroom', 'Domestic Abuse', 'Wrongful Conviction',
  'Historical Crime', 'White-Collar Crime', 'Psychological Crime', 'Sexual Abuse',
  'Forensic Science', 'Cult', 'Organised Crime', 'Medical Crime',
  'Political Crime', 'Conspiracy', 'Environmental Crime',
  'Terrorism', 'Espionage', 'Online Harassment', 'Sports Crime',
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
    is_published: podcast?.is_published ?? false,
    is_featured: podcast?.is_featured ?? false,
  })

  const set = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }))

  const onTitleBlur = () => {
    if (!podcast && form.title && !form.slug) {
      set('slug', slugify(form.title))
    }
  }

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

    setSaving(true)
    const payload = {
      ...form,
      binge_factor: form.binge_factor ? parseFloat(form.binge_factor) : null,
      if_you_liked_this: form.if_you_liked_this.split(',').map((s: string) => s.trim()).filter(Boolean),
    }

    const { error } = podcast
      ? await supabase.from('podcasts').update(payload).eq('id', podcast.id)
      : await supabase.from('podcasts').insert(payload)

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
          <input className={inputClass} value={form.title} onChange={e => set('title', e.target.value)} onBlur={onTitleBlur} required />
        </div>
        <div>
          <label className={labelClass}>Slug *</label>
          <input className={inputClass} value={form.slug} onChange={e => set('slug', e.target.value)} required />
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
            <label className={labelClass}>Format</label>
            <select className={inputClass} value={form.format_type} onChange={e => set('format_type', e.target.value)}>
              <option value="">Select format</option>
              {['Serialized', 'Episodic', 'Both'].map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Host style</label>
            <input className={inputClass} value={form.host_style} onChange={e => set('host_style', e.target.value)} placeholder="Solo, Co-hosted…" />
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
            {['Must listen', 'Worth your time', 'Good if niche interests you', 'For fans of the genre', 'Skip it'].map(v => <option key={v} value={v}>{v}</option>)}
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
        </div>
      </div>

      {/* Visibility */}
      <div className="card p-6 space-y-3">
        <h2 className="font-serif text-stone text-base mb-3">Visibility</h2>
        {[
          { key: 'is_published', label: 'Published (visible on site)' },
          { key: 'is_featured', label: 'Featured (shown in trending section)' },
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
