'use client'
import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle, XCircle, Flag } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatRelativeDate } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Review {
  id: string
  content: string
  created_at: string
  profile: { username: string | null } | null
  podcast: { title: string; slug: string } | null
}

export function ReviewQueue({ initialReviews }: { initialReviews: Review[] }) {
  const [reviews, setReviews] = useState(initialReviews)
  const supabase = createClient()

  const act = async (id: string, action: 'approve' | 'reject' | 'flag') => {
    const update =
      action === 'approve' ? { approved: true, flagged: false } :
      action === 'flag'    ? { flagged: true } :
                             { approved: false, flagged: false }

    const { error } = await supabase.from('reviews').update(update).eq('id', id)

    if (error) {
      toast.error('Action failed')
      return
    }

    setReviews(prev => prev.filter(r => r.id !== id))
    toast.success(
      action === 'approve' ? 'Review approved' :
      action === 'flag'    ? 'Review flagged' :
                             'Review rejected'
    )
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center py-24">
        <CheckCircle size={32} className="mx-auto text-emerald-400 mb-3" />
        <p className="text-stone text-lg font-medium mb-1">All clear!</p>
        <p className="text-stone-subtle text-sm">No pending reviews to moderate.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {reviews.map(review => (
        <div key={review.id} className="card p-5">
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-crimson/20 border border-crimson/20 flex items-center justify-center text-crimson text-xs font-semibold shrink-0">
              {(review.profile?.username?.[0] ?? '?').toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-stone text-sm font-medium">{review.profile?.username ?? 'Anonymous'}</span>
                <span className="text-stone-subtle text-xs">reviewed</span>
                {review.podcast && (
                  <Link href={`/podcasts/${review.podcast.slug}`} target="_blank" className="text-xs text-crimson hover:underline">
                    {review.podcast.title}
                  </Link>
                )}
                <span className="text-stone-subtle text-xs ml-auto">{formatRelativeDate(review.created_at)}</span>
              </div>
              <p className="text-stone-muted text-sm leading-relaxed mb-4">{review.content}</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => act(review.id, 'approve')}
                  className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                >
                  <CheckCircle size={13} /> Approve
                </button>
                <button
                  onClick={() => act(review.id, 'reject')}
                  className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-crimson/10 text-crimson hover:bg-crimson/20 transition-colors"
                >
                  <XCircle size={13} /> Reject
                </button>
                <button
                  onClick={() => act(review.id, 'flag')}
                  className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-white/5 text-stone-muted hover:bg-white/10 transition-colors"
                >
                  <Flag size={13} /> Flag
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
