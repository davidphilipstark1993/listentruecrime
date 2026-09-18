'use client'
import { useState, useMemo, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Search, ImageOff, Loader2, PlayCircle, StopCircle, Settings2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

type ArtworkStatus = 'verified' | 'found' | 'needs_review' | 'missing' | 'failed' | 'skipped'
type ArtworkSource = 'existing' | 'podcast_index' | 'apple' | 'rss' | 'website' | 'manual' | 'placeholder'
type ArtworkConfidence = 'high' | 'medium' | 'low'

export interface ArtworkPodcastRow {
  id: string
  title: string
  slug: string
  host_name: string | null
  image_url: string | null
  artwork_status: ArtworkStatus
  artwork_source: ArtworkSource | null
  artwork_confidence: ArtworkConfidence | null
  artwork_score: number | null
  artwork_checked_at: string | null
  artwork_candidate: unknown
  artwork_manual_override: boolean
}

export interface ArtworkSummary {
  total: number
  withArtwork: number
  missing: number
  needsReview: number
  failed: number
  bySource: Record<string, number>
}

const STATUS_LABEL: Record<ArtworkStatus, string> = {
  verified: 'Verified', found: 'Found', needs_review: 'Needs review', missing: 'Missing', failed: 'Failed', skipped: 'Skipped',
}

const STATUS_STYLE: Record<ArtworkStatus, string> = {
  verified: 'bg-emerald-500/10 text-emerald-400',
  found: 'bg-emerald-500/10 text-emerald-400',
  needs_review: 'bg-amber-500/10 text-amber-400',
  missing: 'bg-white/5 text-stone-subtle',
  failed: 'bg-crimson/10 text-crimson',
  skipped: 'bg-white/5 text-stone-subtle',
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="card p-4">
      <p className={cn('text-2xl font-semibold tabular-nums', accent ?? 'text-stone')}>{value}</p>
      <p className="text-stone-subtle text-xs mt-0.5">{label}</p>
    </div>
  )
}

export function ArtworkDashboard({ initialSummary, initialPodcasts }: { initialSummary: ArtworkSummary; initialPodcasts: ArtworkPodcastRow[] }) {
  const [summary, setSummary] = useState(initialSummary)
  const [podcasts, setPodcasts] = useState(initialPodcasts)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [query, setQuery] = useState('')
  const [loadingRow, setLoadingRow] = useState<string | null>(null)
  const [recovering, setRecovering] = useState(false)
  const [progress, setProgress] = useState<{ processed: number; verified: number; needsReview: number; missing: number; failed: number } | null>(null)
  const stopRef = useRef(false)

  const filtered = useMemo(() => {
    return podcasts.filter(p => {
      if (statusFilter && p.artwork_status !== statusFilter) return false
      if (query.trim() && !p.title.toLowerCase().includes(query.trim().toLowerCase())) return false
      return true
    })
  }, [podcasts, statusFilter, query])

  async function refetch(status?: string) {
    const params = new URLSearchParams()
    if (status) params.set('status', status)
    const res = await fetch(`/api/admin/artwork?${params.toString()}`)
    if (!res.ok) return
    const data = await res.json()
    setSummary(data.summary)
    setPodcasts(data.podcasts)
  }

  async function findArtwork(id: string, force = false) {
    setLoadingRow(id)
    try {
      const res = await fetch(`/api/admin/podcasts/${id}/artwork/recover`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ force }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Recovery failed')
      toast.success(
        data.status === 'verified' ? 'Artwork found and verified' :
        data.status === 'needs_review' ? 'Candidate found — needs review' :
        data.status === 'missing' ? 'No artwork found from any source' : 'Recovery failed'
      )
      await refetch(statusFilter || undefined)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Recovery failed')
    } finally {
      setLoadingRow(null)
    }
  }

  async function recoverAll() {
    const scope = statusFilter === 'missing' ? 'missing' : statusFilter === 'needs_review' ? 'needs_review' : statusFilter === 'failed' ? 'failed' : 'broken'
    setRecovering(true)
    stopRef.current = false
    setProgress({ processed: 0, verified: 0, needsReview: 0, missing: 0, failed: 0 })

    let iterations = 0
    try {
      while (!stopRef.current && iterations < 100) {
        iterations++
        const res = await fetch('/api/admin/artwork/recover', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scope, limit: 20 }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Batch recovery failed')

        setProgress(prev => ({
          processed: (prev?.processed ?? 0) + data.processed,
          verified: (prev?.verified ?? 0) + data.verified,
          needsReview: (prev?.needsReview ?? 0) + data.needsReview,
          missing: (prev?.missing ?? 0) + data.missing,
          failed: (prev?.failed ?? 0) + data.failed,
        }))

        if (!data.remaining || data.processed === 0) break
      }
      toast.success('Batch recovery complete')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Batch recovery failed')
    } finally {
      setRecovering(false)
      await refetch(statusFilter || undefined)
    }
  }

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        <StatCard label="Total podcasts" value={summary.total} />
        <StatCard label="With artwork" value={summary.withArtwork} accent="text-emerald-400" />
        <StatCard label="Missing" value={summary.missing} accent="text-stone-subtle" />
        <StatCard label="Needs review" value={summary.needsReview} accent="text-amber-400" />
        <StatCard label="Failed" value={summary.failed} accent="text-crimson" />
      </div>

      {Object.keys(summary.bySource).length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6 text-xs text-stone-subtle">
          <span className="flex items-center gap-1"><Settings2 size={12} /> Sources:</span>
          {Object.entries(summary.bySource).map(([source, count]) => (
            <span key={source} className="px-2 py-0.5 rounded-full bg-white/5">{source}: {count}</span>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-subtle pointer-events-none" />
          <input
            type="search" value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search title…" className="input-base pl-9 text-sm py-2"
          />
        </div>

        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-base text-sm py-2 w-auto">
          <option value="">All statuses</option>
          {Object.entries(STATUS_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>

        <div className="ml-auto flex items-center gap-2">
          {progress && (
            <span className="text-xs text-stone-subtle tabular-nums">
              {progress.processed} processed · {progress.verified} verified · {progress.needsReview} review · {progress.missing} missing · {progress.failed} failed
            </span>
          )}
          {recovering ? (
            <button onClick={() => { stopRef.current = true }} className="btn-outline text-xs py-2">
              <StopCircle size={14} /> Stop
            </button>
          ) : (
            <button onClick={recoverAll} className="btn-primary text-xs py-2">
              <PlayCircle size={14} /> Recover all{statusFilter ? ` (${STATUS_LABEL[statusFilter as ArtworkStatus] ?? statusFilter})` : ''}
            </button>
          )}
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="text-left px-4 py-3 text-stone-subtle text-xs font-medium">Artwork</th>
              <th className="text-left px-4 py-3 text-stone-subtle text-xs font-medium">Title</th>
              <th className="text-left px-4 py-3 text-stone-subtle text-xs font-medium hidden sm:table-cell">Status</th>
              <th className="text-left px-4 py-3 text-stone-subtle text-xs font-medium hidden md:table-cell">Source</th>
              <th className="text-left px-4 py-3 text-stone-subtle text-xs font-medium hidden lg:table-cell">Confidence</th>
              <th className="text-left px-4 py-3 text-stone-subtle text-xs font-medium hidden lg:table-cell">Checked</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {filtered.map(p => (
              <tr key={p.id} className="hover:bg-white/[0.02] transition-colors group">
                <td className="px-4 py-3">
                  <div className="w-10 h-10 rounded-md bg-ink-700 overflow-hidden flex items-center justify-center shrink-0">
                    {p.image_url ? (
                      <Image src={p.image_url} alt="" width={40} height={40} className="object-cover w-full h-full" unoptimized />
                    ) : (
                      <ImageOff size={14} className="text-stone-subtle" />
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-stone font-medium truncate max-w-[220px] block">{p.title}</span>
                  {p.host_name && <span className="text-stone-subtle text-2xs">{p.host_name}</span>}
                  {p.artwork_manual_override && <span className="text-2xs text-gold-light ml-1">manual</span>}
                </td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  <span className={cn('inline-flex items-center text-2xs px-2 py-0.5 rounded-full', STATUS_STYLE[p.artwork_status])}>
                    {STATUS_LABEL[p.artwork_status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-stone-subtle text-xs hidden md:table-cell">{p.artwork_source ?? '—'}</td>
                <td className="px-4 py-3 text-stone-subtle text-xs hidden lg:table-cell">
                  {p.artwork_confidence ?? '—'}{p.artwork_score != null ? ` (${p.artwork_score})` : ''}
                </td>
                <td className="px-4 py-3 text-stone-subtle text-2xs hidden lg:table-cell">
                  {p.artwork_checked_at ? new Date(p.artwork_checked_at).toLocaleDateString() : 'never'}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-3">
                    {(p.artwork_status === 'missing' || p.artwork_status === 'failed') && !p.artwork_manual_override && (
                      <button
                        onClick={() => findArtwork(p.id)}
                        disabled={loadingRow === p.id}
                        className="text-xs text-crimson hover:underline flex items-center gap-1 disabled:opacity-50"
                      >
                        {loadingRow === p.id ? <Loader2 size={11} className="animate-spin" /> : null} Find artwork
                      </button>
                    )}
                    {p.artwork_status === 'needs_review' && (
                      <Link href={`/admin/artwork/${p.id}`} className="text-xs text-amber-400 hover:underline">Review</Link>
                    )}
                    <Link href={`/admin/artwork/${p.id}`} className="text-xs text-stone-muted hover:text-stone transition-colors">Manage</Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-stone-subtle text-sm">No podcasts match the current filters.</p>
          </div>
        )}
      </div>
    </div>
  )
}
