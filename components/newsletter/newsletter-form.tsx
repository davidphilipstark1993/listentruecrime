'use client'
import { useState } from 'react'
import { Mail, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

interface NewsletterFormProps {
  source?: string
  variant?: 'default' | 'hero' | 'minimal'
  className?: string
}

export function NewsletterForm({ source = 'unknown', variant = 'default', className }: NewsletterFormProps) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || loading) return
    setLoading(true)

    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong')
      setDone(true)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className={cn('flex items-center gap-3 text-emerald-400 text-sm', className)}>
        <div className="w-5 h-5 rounded-full bg-emerald-400 flex items-center justify-center text-ink-950 shrink-0">
          <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3">
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        You're on the list — we'll be in touch soon.
      </div>
    )
  }

  if (variant === 'minimal') {
    return (
      <form onSubmit={handleSubmit} className={cn('flex gap-2', className)}>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          className="input-base flex-1 text-sm py-2"
        />
        <button type="submit" disabled={loading} className="btn-primary py-2 px-4 text-sm">
          {loading ? '…' : 'Join'}
        </button>
      </form>
    )
  }

  return (
    <form onSubmit={handleSubmit} className={cn('flex flex-col sm:flex-row gap-2', className)}>
      <div className="relative flex-1">
        <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-subtle pointer-events-none" />
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          className="input-base pl-9"
        />
      </div>
      <button
        type="submit"
        disabled={loading || !email}
        className={cn('btn-primary shrink-0', variant === 'hero' && 'px-6')}
      >
        {loading ? 'Joining…' : 'Join the waitlist'}
        {!loading && <ArrowRight size={14} />}
      </button>
    </form>
  )
}
