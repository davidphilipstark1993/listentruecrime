'use client'
import { useState, useEffect } from 'react'
import { ThumbsUp, ThumbsDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface HelpfulWidgetProps {
  podcastSlug: string
}

type Vote = 'yes' | 'no' | null

function storageKey(slug: string) {
  return `ltc_helpful_${slug}`
}

export function HelpfulWidget({ podcastSlug }: HelpfulWidgetProps) {
  const [vote, setVote] = useState<Vote>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    try {
      const stored = localStorage.getItem(storageKey(podcastSlug)) as Vote
      if (stored === 'yes' || stored === 'no') setVote(stored)
    } catch {}
  }, [podcastSlug])

  const handleVote = (v: 'yes' | 'no') => {
    if (vote) return // already voted
    setVote(v)
    try { localStorage.setItem(storageKey(podcastSlug), v) } catch {}
  }

  if (!mounted) return null

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-stone-subtle">Was this review helpful?</span>
      {vote ? (
        <span className="text-xs text-stone-muted">
          {vote === 'yes' ? 'Thanks for the feedback!' : 'Thanks — we\'ll keep improving.'}
        </span>
      ) : (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleVote('yes')}
            aria-label="Yes, helpful"
            className={cn(
              'flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-all',
              'border-white/[0.1] text-stone-subtle hover:border-green-500/50 hover:text-green-400'
            )}
          >
            <ThumbsUp size={12} />
            Yes
          </button>
          <button
            onClick={() => handleVote('no')}
            aria-label="No, not helpful"
            className={cn(
              'flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-all',
              'border-white/[0.1] text-stone-subtle hover:border-red-500/40 hover:text-red-400'
            )}
          >
            <ThumbsDown size={12} />
            No
          </button>
        </div>
      )}
    </div>
  )
}
