'use client'
import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Plus, Pencil, Trash2, AlertTriangle, CheckCircle2, BookPlus } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Newsletter, NewsletterSubmission } from '@/lib/types/database'

type AnnotatedSubmission = NewsletterSubmission & {
  possibleDbMatch: { name: string | null; id: string | null; reason: string } | null
  directoryEntry: { id: string; title: string; slug: string } | null
}

const EMPTY_FORM = {
  podcast_name: '', podcast_url: '', website_url: '', rss_url: '', hosts: '',
  description: '', recommendation: '', notes: '', curator_rating: '', artwork_url: '', additional_info: '',
}

export function WeeklyNewsletterManager() {
  const [newsletter, setNewsletter] = useState<Newsletter | null>(null)
  const [submissions, setSubmissions] = useState<AnnotatedSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [approving, setApproving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/newsletter-submissions')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setNewsletter(data.newsletter)
      setSubmissions(data.submissions)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const approvedCount = submissions.filter(s => s.status === 'approved').length
  const ready = approvedCount === 5

  const openAdd = () => { setForm(EMPTY_FORM); setEditingId(null); setFormOpen(true) }
  const openEdit = (s: AnnotatedSubmission) => {
    setForm({
      podcast_name: s.podcast_name, podcast_url: s.podcast_url ?? '', website_url: s.website_url ?? '',
      rss_url: s.rss_url ?? '', hosts: s.hosts ?? '', description: s.description ?? '',
      recommendation: s.recommendation ?? '', notes: s.notes ?? '',
      curator_rating: s.curator_rating != null ? String(s.curator_rating) : '', artwork_url: s.artwork_url ?? '',
      additional_info: s.additional_info ?? '',
    })
    setEditingId(s.id)
    setFormOpen(true)
  }

  const save = async () => {
    if (!form.podcast_name.trim()) { toast.error('Podcast name is required'); return }
    setSaving(true)
    try {
      const payload = { ...form, curator_rating: form.curator_rating ? Number(form.curator_rating) : null }
      const res = editingId
        ? await fetch(`/api/newsletter-submissions/${editingId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        : await fetch('/api/newsletter-submissions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(editingId ? 'Updated' : 'Added')
      setFormOpen(false)
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const toggleApproval = async (s: AnnotatedSubmission) => {
    const nextStatus = s.status === 'approved' ? 'draft' : 'approved'
    const res = await fetch(`/api/newsletter-submissions/${s.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: nextStatus }) })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error); return }
    toast.success(nextStatus === 'approved' ? 'Approved' : 'Moved back to draft')
    load()
  }

  const remove = async (id: string) => {
    if (!confirm('Remove this podcast from this week\'s newsletter?')) return
    const res = await fetch(`/api/newsletter-submissions/${id}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error); return }
    toast.success('Removed')
    load()
  }

  const [addingToDirectory, setAddingToDirectory] = useState<string | null>(null)
  const addToDirectory = async (id: string) => {
    setAddingToDirectory(id)
    try {
      const res = await fetch(`/api/newsletter-submissions/${id}/add-to-directory`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(data.alreadyInDirectory ? 'Already in the directory' : 'Added to the podcast directory')
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add to directory')
    } finally {
      setAddingToDirectory(null)
    }
  }

  const approveForSending = async () => {
    if (!newsletter) return
    if (!confirm('Approve this newsletter for Sunday sending? You can still edit podcasts until then, but any change will require re-approval.')) return
    setApproving(true)
    try {
      const res = await fetch(`/api/newsletters/${newsletter.id}/approve-for-sending`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Approved for Sunday sending')
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Approval failed')
    } finally {
      setApproving(false)
    }
  }

  if (loading) return <p className="text-stone-subtle text-sm p-8">Loading…</p>
  if (!newsletter) return null

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="heading-display text-2xl mb-1">This Week's Newsletter</h1>
          <p className="text-stone-subtle text-sm">
            Issue #{newsletter.issue_number} · Sending {new Date(newsletter.publication_date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <Plus size={15} /> Add Podcast
        </button>
      </div>

      <div className="card p-4 mb-6 flex items-center justify-between">
        <p className="text-stone text-sm font-medium">{approvedCount} / 5 podcasts ready</p>
        {newsletter.status === 'sent' ? (
          <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center gap-1"><CheckCircle2 size={12} /> Sent</span>
        ) : newsletter.status === 'approved' ? (
          <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center gap-1"><CheckCircle2 size={12} /> Approved for Sunday sending</span>
        ) : ready ? (
          <button onClick={approveForSending} disabled={approving} className="btn-primary text-sm">
            {approving ? 'Approving…' : 'Approve for Sunday Sending'}
          </button>
        ) : (
          <span className="text-xs text-stone-subtle">Not yet ready</span>
        )}
      </div>

      <div className="space-y-3 mb-8">
        {submissions.map(s => (
          <div key={s.id} className="card p-4 flex items-start gap-4">
            {s.artwork_url && <Image src={s.artwork_url} alt={s.podcast_name} width={56} height={56} className="rounded-lg shrink-0" unoptimized />}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-stone font-semibold text-sm">{s.podcast_name}</span>
                <span className={`text-2xs px-2 py-0.5 rounded-full ${s.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-stone-subtle'}`}>
                  {s.status === 'approved' ? 'Approved' : 'Draft'}
                </span>
              </div>
              {s.possibleDbMatch && (
                <p className="text-2xs text-amber-400 flex items-center gap-1 mb-1">
                  <AlertTriangle size={11} /> Possible match in LTC database: "{s.possibleDbMatch.name}"
                </p>
              )}
              {s.recommendation && <p className="text-stone-subtle text-xs line-clamp-2 mb-1">{s.recommendation}</p>}
              {s.directoryEntry ? (
                <Link href={`/podcasts/${s.directoryEntry.slug}`} target="_blank" className="text-2xs text-emerald-400 flex items-center gap-1 hover:underline">
                  <CheckCircle2 size={11} /> In directory — view page
                </Link>
              ) : (
                <button
                  onClick={() => addToDirectory(s.id)}
                  disabled={addingToDirectory === s.id}
                  className="text-2xs text-stone-muted hover:text-stone transition-colors flex items-center gap-1"
                >
                  <BookPlus size={11} /> {addingToDirectory === s.id ? 'Adding…' : 'Add to Directory'}
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => toggleApproval(s)} className={`text-xs px-2.5 py-1 rounded-lg transition-colors ${s.status === 'approved' ? 'bg-white/5 text-stone-muted hover:bg-white/10' : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'}`}>
                {s.status === 'approved' ? 'Unapprove' : 'Approve'}
              </button>
              <button onClick={() => openEdit(s)} className="text-stone-muted hover:text-stone transition-colors"><Pencil size={14} /></button>
              <button onClick={() => remove(s.id)} className="text-crimson/60 hover:text-crimson transition-colors"><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
        {submissions.length === 0 && (
          <p className="text-stone-subtle text-sm text-center py-12">No podcasts added yet — click "Add Podcast" to start this week's list.</p>
        )}
      </div>

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={e => { if (e.target === e.currentTarget) setFormOpen(false) }}>
          <div className="card p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto">
            <h2 className="font-serif text-lg text-stone mb-4">{editingId ? 'Edit podcast' : 'Add podcast'}</h2>
            <div className="space-y-3">
              <Field label="Podcast name *" value={form.podcast_name} onChange={v => setForm(f => ({ ...f, podcast_name: v }))} />
              <Field label="Podcast URL (Apple/Spotify/listen link)" value={form.podcast_url} onChange={v => setForm(f => ({ ...f, podcast_url: v }))} />
              <Field label="Website URL" value={form.website_url} onChange={v => setForm(f => ({ ...f, website_url: v }))} />
              <Field label="RSS URL (if known)" value={form.rss_url} onChange={v => setForm(f => ({ ...f, rss_url: v }))} />
              <Field label="Host(s)" value={form.hosts} onChange={v => setForm(f => ({ ...f, hosts: v }))} />
              <Field label="Short description" value={form.description} onChange={v => setForm(f => ({ ...f, description: v }))} textarea />
              <Field label="Why I recommend it" value={form.recommendation} onChange={v => setForm(f => ({ ...f, recommendation: v }))} textarea />
              <Field label="My notes (private, never shown publicly)" value={form.notes} onChange={v => setForm(f => ({ ...f, notes: v }))} textarea />
              <Field label="My rating (0-10)" value={form.curator_rating} onChange={v => setForm(f => ({ ...f, curator_rating: v }))} />
              <Field label="Artwork URL" value={form.artwork_url} onChange={v => setForm(f => ({ ...f, artwork_url: v }))} />
              <Field label="Additional info" value={form.additional_info} onChange={v => setForm(f => ({ ...f, additional_info: v }))} textarea />
            </div>
            <div className="flex items-center gap-2 mt-5">
              <button onClick={save} disabled={saving} className="btn-primary text-sm">{saving ? 'Saving…' : 'Save'}</button>
              <button onClick={() => setFormOpen(false)} className="btn-outline text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, value, onChange, textarea }: { label: string; value: string; onChange: (v: string) => void; textarea?: boolean }) {
  return (
    <div>
      <label className="text-xs text-stone-subtle mb-1 block">{label}</label>
      {textarea ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} rows={3} className="input-base w-full text-sm" />
      ) : (
        <input value={value} onChange={e => onChange(e.target.value)} className="input-base w-full text-sm" />
      )}
    </div>
  )
}
