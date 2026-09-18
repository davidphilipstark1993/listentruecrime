'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { CheckCircle, XCircle, RotateCcw, ImageOff, Loader2, Unlock, Search } from 'lucide-react'
import toast from 'react-hot-toast'

interface StoredArtworkCandidate {
  url: string
  originalUrl: string
  source: string
  confidence: string
  score: number
  reasons: string[]
  candidateTitle: string | null
  candidateAuthor: string | null
  candidatePublisher: string | null
  foundAt: string
}

interface PodcastArtworkInfo {
  id: string
  title: string
  slug: string
  host_name: string | null
  website_url: string | null
  rss_url: string | null
  image_url: string | null
  artwork_status: string
  artwork_source: string | null
  artwork_confidence: string | null
  artwork_score: number | null
  artwork_match_reason: string | null
  artwork_error: string | null
  artwork_checked_at: string | null
  artwork_verified_at: string | null
  artwork_manual_override: boolean
  artwork_candidate: StoredArtworkCandidate | null
  artwork_attempts: number
}

async function callApi(url: string, body?: object) {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body ?? {}) })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Request failed')
  return data
}

export function ArtworkReview({ podcast }: { podcast: PodcastArtworkInfo }) {
  const [loading, setLoading] = useState<string | null>(null)
  const [manualUrl, setManualUrl] = useState('')
  const router = useRouter()

  const candidate = podcast.artwork_candidate

  async function run(action: string, fn: () => Promise<unknown>, successMessage: string) {
    setLoading(action)
    try {
      await fn()
      toast.success(successMessage)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setLoading(null)
    }
  }

  const approve = () => run('approve', () => callApi(`/api/admin/podcasts/${podcast.id}/artwork/approve`), 'Artwork approved')
  const reject = () => run('reject', () => callApi(`/api/admin/podcasts/${podcast.id}/artwork/reject`), 'Candidate rejected')
  const markMissing = () => run('markMissing', () => callApi(`/api/admin/podcasts/${podcast.id}/artwork/reject`, { markMissing: true }), 'Marked as missing — excluded from future automated runs')
  const searchAgain = () => run('searchAgain', () => callApi(`/api/admin/podcasts/${podcast.id}/artwork/recover`, { force: true }), 'Search complete')
  const resetOverride = () => run('reset', () => callApi(`/api/admin/podcasts/${podcast.id}/artwork/reset`), 'Manual override cleared')

  const submitManual = () => {
    if (!manualUrl.trim()) return
    run('manual', () => callApi(`/api/admin/podcasts/${podcast.id}/artwork/manual`, { url: manualUrl.trim() }), 'Manual artwork saved')
  }

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        {/* LEFT: current podcast info */}
        <div className="card p-5">
          <h2 className="text-stone text-sm font-semibold mb-4">Current podcast</h2>
          <div className="flex items-start gap-4 mb-4">
            <div className="w-20 h-20 rounded-lg bg-ink-700 overflow-hidden flex items-center justify-center shrink-0">
              {podcast.image_url ? (
                <Image src={podcast.image_url} alt={`${podcast.title} podcast artwork`} width={80} height={80} className="object-cover w-full h-full" unoptimized />
              ) : (
                <ImageOff size={20} className="text-stone-subtle" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-stone font-medium truncate">{podcast.title}</p>
              <p className="text-stone-subtle text-xs">{podcast.host_name ?? 'No host on file'}</p>
              <p className="text-2xs text-stone-subtle mt-1">
                Status: <span className="text-stone-muted">{podcast.artwork_status}</span> · Source: <span className="text-stone-muted">{podcast.artwork_source ?? '—'}</span>
              </p>
            </div>
          </div>

          <dl className="space-y-2 text-xs">
            <div className="flex justify-between gap-2"><dt className="text-stone-subtle">Website</dt><dd className="text-stone-muted truncate max-w-[220px]">{podcast.website_url ?? '—'}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-stone-subtle">RSS feed</dt><dd className="text-stone-muted truncate max-w-[220px]">{podcast.rss_url ?? '—'}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-stone-subtle">Confidence</dt><dd className="text-stone-muted">{podcast.artwork_confidence ?? '—'} {podcast.artwork_score != null ? `(${podcast.artwork_score})` : ''}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-stone-subtle">Last checked</dt><dd className="text-stone-muted">{podcast.artwork_checked_at ? new Date(podcast.artwork_checked_at).toLocaleString() : 'never'}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-stone-subtle">Verified</dt><dd className="text-stone-muted">{podcast.artwork_verified_at ? new Date(podcast.artwork_verified_at).toLocaleString() : '—'}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-stone-subtle">Attempts</dt><dd className="text-stone-muted">{podcast.artwork_attempts}</dd></div>
          </dl>

          {podcast.artwork_match_reason && (
            <p className="text-2xs text-stone-subtle mt-3 border-t border-white/[0.06] pt-3">Accepted because: {podcast.artwork_match_reason}</p>
          )}
          {podcast.artwork_error && (
            <p className="text-2xs text-crimson mt-3 border-t border-white/[0.06] pt-3">Last error: {podcast.artwork_error}</p>
          )}
        </div>

        {/* RIGHT: pending candidate, if any */}
        <div className="card p-5">
          <h2 className="text-stone text-sm font-semibold mb-4">Candidate artwork</h2>
          {candidate ? (
            <>
              <div className="flex items-start gap-4 mb-4">
                <div className="w-20 h-20 rounded-lg bg-ink-700 overflow-hidden flex items-center justify-center shrink-0">
                  <Image src={candidate.url} alt="Candidate artwork" width={80} height={80} className="object-cover w-full h-full" unoptimized />
                </div>
                <div className="min-w-0">
                  <p className="text-stone font-medium truncate">{candidate.candidateTitle ?? 'Unknown title'}</p>
                  <p className="text-stone-subtle text-xs">{candidate.candidateAuthor ?? candidate.candidatePublisher ?? 'No author on file'}</p>
                  <p className="text-2xs text-stone-subtle mt-1">
                    Source: <span className="text-stone-muted">{candidate.source}</span> · Confidence: <span className="text-stone-muted">{candidate.confidence} ({candidate.score})</span>
                  </p>
                </div>
              </div>

              <p className="text-stone-subtle text-2xs font-medium mb-1.5">Why this was suggested:</p>
              <ul className="space-y-1 mb-5">
                {candidate.reasons.map((reason, i) => (
                  <li key={i} className="text-2xs text-stone-muted flex items-start gap-1.5">
                    <span className="text-crimson mt-0.5">•</span> {reason}
                  </li>
                ))}
              </ul>

              <div className="flex flex-wrap items-center gap-2">
                <button onClick={approve} disabled={loading !== null} className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-50">
                  {loading === 'approve' ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />} Approve
                </button>
                <button onClick={reject} disabled={loading !== null} className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-crimson/10 text-crimson hover:bg-crimson/20 transition-colors disabled:opacity-50">
                  {loading === 'reject' ? <Loader2 size={13} className="animate-spin" /> : <XCircle size={13} />} Reject
                </button>
                <button onClick={searchAgain} disabled={loading !== null} className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-white/5 text-stone-muted hover:bg-white/10 transition-colors disabled:opacity-50">
                  {loading === 'searchAgain' ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />} Search again
                </button>
                <button onClick={markMissing} disabled={loading !== null} className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-white/5 text-stone-muted hover:bg-white/10 transition-colors disabled:opacity-50">
                  {loading === 'markMissing' ? <Loader2 size={13} className="animate-spin" /> : <ImageOff size={13} />} Mark as missing
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-stone-subtle text-sm mb-4">No pending candidate for this podcast.</p>
              <button onClick={searchAgain} disabled={loading !== null || podcast.artwork_manual_override} className="btn-outline text-xs disabled:opacity-40">
                {loading === 'searchAgain' ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />} Find artwork now
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Manual override */}
      <div className="card p-5">
        <h2 className="text-stone text-sm font-semibold mb-3">Manual artwork URL</h2>
        <p className="text-stone-subtle text-xs mb-3">
          Overrides everything above. Once set, this podcast is never touched by automated recovery again — until you reset the override below.
        </p>
        <div className="flex gap-2 mb-3">
          <input
            type="url" value={manualUrl} onChange={e => setManualUrl(e.target.value)}
            placeholder="https://example.com/artwork.jpg" className="input-base text-sm flex-1"
          />
          <button onClick={submitManual} disabled={loading !== null || !manualUrl.trim()} className="btn-primary text-xs px-4 disabled:opacity-50">
            {loading === 'manual' ? <Loader2 size={13} className="animate-spin" /> : null} Save
          </button>
        </div>
        {podcast.artwork_manual_override && (
          <button onClick={resetOverride} disabled={loading !== null} className="inline-flex items-center gap-1.5 text-xs text-stone-muted hover:text-stone transition-colors disabled:opacity-50">
            {loading === 'reset' ? <Loader2 size={13} className="animate-spin" /> : <Unlock size={13} />} Reset manual override (allow automated recovery again)
          </button>
        )}
      </div>

      {(podcast.artwork_status === 'verified' || podcast.artwork_status === 'found') && !podcast.artwork_manual_override && (
        <button onClick={searchAgain} disabled={loading !== null} className="inline-flex items-center gap-1.5 text-xs text-stone-muted hover:text-stone transition-colors disabled:opacity-50">
          {loading === 'searchAgain' ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />} Force re-check
        </button>
      )}
    </div>
  )
}
