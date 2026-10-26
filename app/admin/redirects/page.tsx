'use client'
import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { normalisePath, validateRedirect } from '@/lib/redirects'
import toast from 'react-hot-toast'

interface Row { id: string; from_path: string; to_path: string; note: string | null }

export default function AdminRedirectsPage() {
  const supabase = createClient()
  const [rows, setRows] = useState<Row[]>([])
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('redirects').select('*').order('created_at', { ascending: false })
    if (error) toast.error(error.message)
    else setRows((data ?? []) as Row[])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => { load() }, [load])

  const revalidate = () => fetch('/api/admin/revalidate', { method: 'POST' }).catch(() => {})

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    const existing = Object.fromEntries(rows.map(r => [r.from_path, r.to_path]))
    const problem = validateRedirect(from, to, existing)
    if (problem) { toast.error(problem); return }
    setSaving(true)
    const { error } = await supabase.from('redirects').insert({
      from_path: normalisePath(from), to_path: normalisePath(to), note: note.trim() || null,
    })
    setSaving(false)
    if (error) { toast.error(error.message); return }
    toast.success('Redirect added (live within a minute)')
    setFrom(''); setTo(''); setNote('')
    await revalidate()
    load()
  }

  const remove = async (id: string) => {
    const { error } = await supabase.from('redirects').delete().eq('id', id)
    if (error) { toast.error(error.message); return }
    await revalidate()
    load()
  }

  const inputClass = 'input-base text-sm'
  return (
    <div className="p-8 max-w-4xl">
      <h1 className="font-serif text-2xl text-stone mb-2">Redirects</h1>
      <p className="text-stone-muted text-sm mb-6">
        Permanent (301) redirects. Redirected URLs are removed from the sitemap automatically.
        Unpublish the old page too so it drops out of listings, but never delete it.
      </p>

      <form onSubmit={add} className="card p-5 grid sm:grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end mb-8">
        <div>
          <label className="block text-xs text-stone-subtle mb-1.5">From path</label>
          <input className={inputClass} value={from} onChange={e => setFrom(e.target.value)} placeholder="/podcasts/old-slug" required />
        </div>
        <div>
          <label className="block text-xs text-stone-subtle mb-1.5">To path</label>
          <input className={inputClass} value={to} onChange={e => setTo(e.target.value)} placeholder="/podcasts/new-slug" required />
        </div>
        <div>
          <label className="block text-xs text-stone-subtle mb-1.5">Note (optional)</label>
          <input className={inputClass} value={note} onChange={e => setNote(e.target.value)} />
        </div>
        <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Adding…' : 'Add'}</button>
      </form>

      <div className="card divide-y divide-white/[0.06]">
        {rows.length === 0 && <p className="p-5 text-sm text-stone-subtle">No redirects yet.</p>}
        {rows.map(r => (
          <div key={r.id} className="p-4 flex items-center justify-between gap-4 text-sm">
            <div className="min-w-0">
              <p className="text-stone truncate"><span className="text-stone-muted">{r.from_path}</span> → {r.to_path}</p>
              {r.note && <p className="text-xs text-stone-subtle">{r.note}</p>}
            </div>
            <button onClick={() => remove(r.id)} className="text-xs text-crimson hover:underline shrink-0">Remove</button>
          </div>
        ))}
      </div>
    </div>
  )
}
