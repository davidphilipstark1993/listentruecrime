'use client'
import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle, XCircle, Flag, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

type Tab = 'pending' | 'approved' | 'flagged' | 'all'

interface Review {
  id: string
  content: string
  rating: number | null
  approved: boolean
  flagged: boolean
  created_at: string
  profile: { username: string | null } | null
  podcast: { title: string; slug: string } | null
}

export function ReviewManager({ initialReviews }: { initialReviews: Review[] }) {
  const [reviews, setReviews] = useState(initialReviews)
  const [tab, setTab] = useState<Tab>('pending')
  const supabase = createClient()

  const filtered = reviews.filter(r => {
    if (tab === 'pending')  return !r.approved && !r.flagged
    if (tab === 'approved') return r.approved
    if (tab === 'flagged')  return r.flagged
    return true
  })

  const counts = {
    pending:  reviews.filter(r => !r.approved && !r.flagged).length,
    approved: reviews.filter(r => r.approved).length,
    flagged:  reviews.filter(r => r.flagged).length,
    all:      reviews.length,
  }

  const act = async (id: string, action: 'approve' | 'reject' | 'flag' | 'delete') => {
    if (action === 'delete') {
      if (!confirm('Delete this review permanently?')) return
      const { error } = await supabase.from('reviews').delete().eq('id', id)
      if (error) { toast.error('Delete failed'); return }
      setReviews(prev => prev.filter(r => r.id !== id))
      toast.success('Review deleted')
      return
    }

    const update =
      action === 'approve' ? { approved: true,  flagged: false } :
      action === 'flag'    ? { approved: false, flagged: true  } :
                             { approved: false, flagged: false }

    const { error } = await supabase.from('reviews').update(update).eq('id', id)
    if (error) { toast.error('Action failed'); return }

    setReviews(prev => prev.map(r => r.id === id ? { ...r, ...update } : r))
    toast.success(
      action === 'approve' ? 'Review approved' :
      action === 'flag'    ? 'Review flagged'  : 'Review rejected'
    )
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'pending',  label: `Pending (${counts.pending})`  },
    { key: 'approved', label: `Approved (${counts.approved})` },
    { key: 'flagged',  label: `Flagged (${counts.flagged})`   },
    { key: 'all',      label: `All (${counts.all})`           },
  ]

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-white/[0.06]">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm transition-colors border-b-2 -mb-px ${
              tab === t.key
                ? 'border-crimson text-stone'
                : 'border-transparent text-stone-muted hover:text-stone'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <CheckCircle size={28} className="mx-auto text-emerald-400 mb-3" />
          <p className="text-stone-muted text-sm">Nothing here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(review => (
            <div key={review.id} className="card p-5">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-crimson/10 border border-crimson/20 flex items-center justify-center text-crimson text-xs font-semibold shrink-0">
                  {(review.profile?.username?.[0] ?? '?').toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-stone">
                        {review.profile?.username ?? 'Anonymous'}
                      </span>
                      {review.podcast && (
                        <>
                          <span className="text-stone-subtle text-xs">on</span>
                          <Link
                            href={`/podcasts/${review.podcast.slug}`}
                            target="_blank"
                            className="text-xs text-crimson/80 hover:text-crimson transition-colors"
                          >
                            {review.podcast.title}
                          </Link>
                        </>
                      )}
                      {review.rating && (
                        <span className="text-xs text-stone-subtle">· ★ {review.rating}/10</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {review.approved && (
                        <span className="text-2xs px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">approved</span>
                      )}
                      {review.flagged && (
                        <span className="text-2xs px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400">flagged</span>
                      )}
                    </div>
                  </div>
                  <p className="text-stone-muted text-sm leading-relaxed mb-3">{review.content}</p>
                  <div className="flex items-center gap-2">
                    {!review.approved && (
                      <button
                        onClick={() => act(review.id, 'approve')}
                        className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                      >
                        <CheckCircle size={12} /> Approve
                      </button>
                    )}
                    {!review.flagged && (
                      <button
                        onClick={() => act(review.id, 'flag')}
                        className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 transition-colors"
                      >
                        <Flag size={12} /> Flag
                      </button>
                    )}
                    {review.approved && (
                      <button
                        onClick={() => act(review.id, 'reject')}
                        className="flex items-center gap-1 text-xs text-stone-muted hover:text-stone transition-colors"
                      >
                        <XCircle size={12} /> Unapprove
                      </button>
                    )}
                    <button
                      onClick={() => act(review.id, 'delete')}
                      className="flex items-center gap-1 text-xs text-crimson/60 hover:text-crimson transition-colors ml-auto"
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
