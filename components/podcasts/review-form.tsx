'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AuthModal } from '@/components/auth/auth-modal'
import toast from 'react-hot-toast'

interface ReviewFormProps {
  podcastId: string
  podcastTitle: string
  onSubmitted?: () => void
}

const MAX_CHARS = 300

export function ReviewForm({ podcastId, podcastTitle, onSubmitted }: ReviewFormProps) {
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [existing, setExisting] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      setUser(user)
      if (user) {
        const { data } = await supabase
          .from('reviews')
          .select('content')
          .eq('user_id', user.id)
          .eq('podcast_id', podcastId)
          .single()
        if (data) { setContent(data.content); setExisting(true) }
      }
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) { setAuthOpen(true); return }
    if (!content.trim()) return

    setSaving(true)
    const { error } = await supabase
      .from('reviews')
      .upsert(
        { user_id: user.id, podcast_id: podcastId, content: content.trim(), approved: false },
        { onConflict: 'user_id,podcast_id' }
      )

    setSaving(false)
    if (error) {
      toast.error('Failed to submit review')
    } else {
      toast.success('Review submitted! It will appear after moderation.')
      onSubmitted?.()
    }
  }

  const remaining = MAX_CHARS - content.length

  return (
    <>
      <div className="card p-4">
        <h4 className="text-sm font-semibold text-stone mb-3">
          {existing ? 'Edit your review' : 'Write a quick review'}
        </h4>
        <form onSubmit={handleSubmit}>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value.slice(0, MAX_CHARS))}
            placeholder={user ? 'What makes this podcast worth listening to? (300 characters max)' : 'Sign in to write a review…'}
            rows={3}
            onClick={() => { if (!user) setAuthOpen(true) }}
            readOnly={!user}
            className="input-base resize-none text-sm leading-relaxed mb-2 cursor-text"
          />
          <div className="flex items-center justify-between">
            <span className={`text-xs ${remaining < 20 ? 'text-crimson' : 'text-stone-subtle'}`}>
              {remaining} characters remaining
            </span>
            <button
              type="submit"
              disabled={saving || !content.trim()}
              className="btn-primary py-1.5 px-4 text-xs"
            >
              {!user ? 'Sign in to review' : saving ? 'Submitting…' : 'Submit review'}
            </button>
          </div>
        </form>
      </div>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} message={`Sign in to review ${podcastTitle}`} />
    </>
  )
}
